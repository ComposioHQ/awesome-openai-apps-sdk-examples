#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import { nanoid } from "nanoid";
import express from "express";

interface GameState {
  id: string;
  cards: Card[];
  flippedIndices: number[];
  matchedPairs: number[];
  moves: number;
  startTime: string;
  endTime?: string;
  difficulty: "easy" | "medium" | "hard";
}

interface Card {
  id: string;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

class MemoryGameServer {
  private server: Server;
  private currentGame?: GameState;
  
  private readonly symbolSets = {
    easy: ["🍎", "🍊", "🍋", "🍌", "🍇", "🍓"],
    medium: ["🎨", "🎭", "🎪", "🎬", "🎮", "🎯", "🎲", "🎸"],
    hard: ["⚡", "🌟", "🔥", "💎", "🌈", "⭐", "💫", "🌙", "☀️", "🌊"]
  };

  constructor() {
    this.server = new Server(
      { name: "memory-card-game", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "start_game",
          description: "Start a new memory card game",
          inputSchema: {
            type: "object",
            properties: {
              difficulty: {
                type: "string",
                enum: ["easy", "medium", "hard"],
                description: "Game difficulty (easy: 6 pairs, medium: 8 pairs, hard: 10 pairs)",
                default: "medium"
              }
            }
          }
        },
        {
          name: "flip_card",
          description: "Flip a card by its position",
          inputSchema: {
            type: "object",
            properties: {
              position: {
                type: "number",
                description: "Card position (0-indexed)"
              }
            },
            required: ["position"]
          }
        },
        {
          name: "get_board",
          description: "Get current game board state",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "get_stats",
          description: "Get game statistics",
          inputSchema: { type: "object", properties: {} }
        }
      ] as Tool[]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case "start_game":
            return this.startGame(args);
          case "flip_card":
            return this.flipCard(args);
          case "get_board":
            return this.getBoard();
          case "get_stats":
            return this.getStats();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true
        };
      }
    });
  }

  private startGame(args: any) {
    const difficulty = args.difficulty || "medium";
    const symbols = this.symbolSets[difficulty as keyof typeof this.symbolSets];
    
    const cards: Card[] = [];
    symbols.forEach(symbol => {
      cards.push(
        { id: nanoid(), symbol, isFlipped: false, isMatched: false },
        { id: nanoid(), symbol, isFlipped: false, isMatched: false }
      );
    });

    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    this.currentGame = {
      id: nanoid(),
      cards,
      flippedIndices: [],
      matchedPairs: [],
      moves: 0,
      startTime: new Date().toISOString(),
      difficulty
    };

    return {
      content: [{
        type: "text",
        text: `🎮 New ${difficulty} game started!\n\nFind all ${symbols.length} matching pairs!\n\n${this.renderBoard()}`
      }]
    };
  }

  private flipCard(args: any) {
    if (!this.currentGame) throw new Error("No active game. Start a new game first!");

    const position = args.position;
    if (position < 0 || position >= this.currentGame.cards.length) {
      throw new Error("Invalid position");
    }

    const card = this.currentGame.cards[position];
    if (card.isMatched || card.isFlipped) {
      throw new Error("Card already flipped or matched");
    }

    if (this.currentGame.flippedIndices.length >= 2) {
      const [idx1, idx2] = this.currentGame.flippedIndices;
      this.currentGame.cards[idx1].isFlipped = false;
      this.currentGame.cards[idx2].isFlipped = false;
      this.currentGame.flippedIndices = [];
    }

    card.isFlipped = true;
    this.currentGame.flippedIndices.push(position);

    let message = this.renderBoard();

    if (this.currentGame.flippedIndices.length === 2) {
      this.currentGame.moves++;
      const [idx1, idx2] = this.currentGame.flippedIndices;
      const card1 = this.currentGame.cards[idx1];
      const card2 = this.currentGame.cards[idx2];

      if (card1.symbol === card2.symbol) {
        card1.isMatched = true;
        card2.isMatched = true;
        this.currentGame.matchedPairs.push(idx1, idx2);
        message += `\n\n✨ Match found! ${card1.symbol}`;

        const totalPairs = this.currentGame.cards.length / 2;
        if (this.currentGame.matchedPairs.length / 2 === totalPairs) {
          this.currentGame.endTime = new Date().toISOString();
          const duration = Math.floor((new Date(this.currentGame.endTime).getTime() - new Date(this.currentGame.startTime).getTime()) / 1000);
          message += `\n\n🎉 You won!\nMoves: ${this.currentGame.moves}\nTime: ${duration}s`;
        }
      } else {
        message += `\n\n❌ No match. Try again!`;
      }
    }

    return { content: [{ type: "text", text: message }] };
  }

  private getBoard() {
    if (!this.currentGame) throw new Error("No active game");
    return { content: [{ type: "text", text: this.renderBoard() }] };
  }

  private getStats() {
    if (!this.currentGame) throw new Error("No active game");
    
    const totalPairs = this.currentGame.cards.length / 2;
    const foundPairs = this.currentGame.matchedPairs.length / 2;
    
    let stats = `📊 Game Statistics\n${"=".repeat(50)}\n\n`;
    stats += `Difficulty: ${this.currentGame.difficulty}\n`;
    stats += `Moves: ${this.currentGame.moves}\n`;
    stats += `Pairs found: ${foundPairs}/${totalPairs}\n`;
    
    if (this.currentGame.endTime) {
      const duration = Math.floor((new Date(this.currentGame.endTime).getTime() - new Date(this.currentGame.startTime).getTime()) / 1000);
      stats += `Time: ${duration} seconds\n`;
      stats += `\n🎉 Game completed!`;
    }

    return { content: [{ type: "text", text: stats }] };
  }

  private renderBoard(): string {
    if (!this.currentGame) return "No active game";

    const cols = this.currentGame.difficulty === "easy" ? 3 : 4;
    let board = "Memory Card Game\n" + "=".repeat(50) + "\n\n";

    this.currentGame.cards.forEach((card, idx) => {
      if (idx > 0 && idx % cols === 0) board += "\n";
      
      if (card.isMatched) {
        board += `[✓] `;
      } else if (card.isFlipped) {
        board += `[${card.symbol}] `;
      } else {
        board += `[${idx}] `;
      }
    });

    board += `\n\nMoves: ${this.currentGame.moves}`;
    return board;
  }

  async run() {
    // Check if HTTP mode is requested
    const useHttp = process.env.MCP_TRANSPORT === "http" || process.argv.includes("--http");
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3003;

    if (useHttp) {
      // HTTP/Streamable HTTP mode for ChatGPT
      const app = express();
      app.use(express.json());
      
      // Enable CORS
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });

      // Health check endpoint
      app.get("/health", (_req, res) => {
        res.json({ status: "ok", server: "memory-card-game" });
      });

      // Main MCP endpoint - handles Streamable HTTP
      app.post("/", async (req, res) => {
        console.error("Received MCP request");
        
        // Create a new transport for each request to prevent request ID collisions
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true
        });

        res.on('close', () => {
          transport.close();
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      });

      app.listen(port, () => {
        console.error(`Memory Card Game MCP Server running on http://localhost:${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/`);
      });
    } else {
      // STDIO mode for Claude Desktop / Inspector
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Memory Card Game MCP Server running on stdio");
    }
  }
}

const server = new MemoryGameServer();
server.run().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

