#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: string;
}

interface QuizSession {
  id: string;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answers: { questionIndex: number; userAnswer: number; correct: boolean }[];
  startTime: string;
  endTime?: string;
  category: string;
}

class TriviaQuizServer {
  private server: Server;
  private currentSession?: QuizSession;
  private questionBank: Record<string, Question[]> = {
    science: [
      { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correctAnswer: 2, category: "science", difficulty: "easy" },
      { question: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: 1, category: "science", difficulty: "easy" },
      { question: "What is the speed of light?", options: ["299,792 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"], correctAnswer: 0, category: "science", difficulty: "medium" },
    ],
    history: [
      { question: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correctAnswer: 2, category: "history", difficulty: "easy" },
      { question: "Who was the first President of the United States?", options: ["John Adams", "Thomas Jefferson", "George Washington", "Benjamin Franklin"], correctAnswer: 2, category: "history", difficulty: "easy" },
      { question: "What year did the Titanic sink?", options: ["1910", "1911", "1912", "1913"], correctAnswer: 2, category: "history", difficulty: "medium" },
    ],
    geography: [
      { question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correctAnswer: 2, category: "geography", difficulty: "easy" },
      { question: "Which is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctAnswer: 3, category: "geography", difficulty: "easy" },
      { question: "How many continents are there?", options: ["5", "6", "7", "8"], correctAnswer: 2, category: "geography", difficulty: "easy" },
    ],
    general: [
      { question: "How many days are in a leap year?", options: ["364", "365", "366", "367"], correctAnswer: 2, category: "general", difficulty: "easy" },
      { question: "What is the largest mammal?", options: ["Elephant", "Blue Whale", "Giraffe", "Polar Bear"], correctAnswer: 1, category: "general", difficulty: "easy" },
    ]
  };

  constructor() {
    this.server = new Server(
      { name: "trivia-quiz", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "start_quiz",
          description: "Start a new trivia quiz",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["science", "history", "geography", "general", "mixed"],
                description: "Quiz category",
                default: "mixed"
              },
              num_questions: {
                type: "number",
                description: "Number of questions (5-20)",
                default: 10
              }
            }
          }
        },
        {
          name: "answer_question",
          description: "Answer the current question",
          inputSchema: {
            type: "object",
            properties: {
              answer: {
                type: "number",
                description: "Answer index (0-3)"
              }
            },
            required: ["answer"]
          }
        },
        {
          name: "get_current_question",
          description: "View the current question",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "get_quiz_results",
          description: "View final quiz results",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "skip_question",
          description: "Skip the current question",
          inputSchema: { type: "object", properties: {} }
        }
      ] as Tool[]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case "start_quiz":
            return this.startQuiz(args);
          case "answer_question":
            return this.answerQuestion(args);
          case "get_current_question":
            return this.getCurrentQuestion();
          case "get_quiz_results":
            return this.getQuizResults();
          case "skip_question":
            return this.skipQuestion();
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

  private startQuiz(args: any) {
    const category = args.category || "mixed";
    const numQuestions = Math.min(20, Math.max(5, args.num_questions || 10));

    let allQuestions: Question[] = [];
    if (category === "mixed") {
      allQuestions = Object.values(this.questionBank).flat();
    } else {
      allQuestions = this.questionBank[category] || [];
    }

    const questions = this.shuffleArray([...allQuestions]).slice(0, numQuestions);

    this.currentSession = {
      id: nanoid(),
      questions,
      currentQuestionIndex: 0,
      score: 0,
      answers: [],
      startTime: new Date().toISOString(),
      category
    };

    return {
      content: [{
        type: "text",
        text: `🎯 Quiz Started!\n\nCategory: ${category}\nQuestions: ${questions.length}\n\n${this.formatQuestion()}`
      }]
    };
  }

  private answerQuestion(args: any) {
    if (!this.currentSession) throw new Error("No active quiz");
    if (this.currentSession.currentQuestionIndex >= this.currentSession.questions.length) {
      throw new Error("Quiz already completed");
    }

    const answer = args.answer;
    const currentQ = this.currentSession.questions[this.currentSession.currentQuestionIndex];
    const correct = answer === currentQ.correctAnswer;

    this.currentSession.answers.push({
      questionIndex: this.currentSession.currentQuestionIndex,
      userAnswer: answer,
      correct
    });

    if (correct) this.currentSession.score++;

    let result = correct ? "✅ Correct!\n\n" : `❌ Wrong! Correct answer was: ${currentQ.options[currentQ.correctAnswer]}\n\n`;

    this.currentSession.currentQuestionIndex++;

    if (this.currentSession.currentQuestionIndex >= this.currentSession.questions.length) {
      this.currentSession.endTime = new Date().toISOString();
      result += this.formatResults();
    } else {
      result += this.formatQuestion();
    }

    return { content: [{ type: "text", text: result }] };
  }

  private getCurrentQuestion() {
    if (!this.currentSession) throw new Error("No active quiz");
    return { content: [{ type: "text", text: this.formatQuestion() }] };
  }

  private skipQuestion() {
    if (!this.currentSession) throw new Error("No active quiz");
    
    this.currentSession.answers.push({
      questionIndex: this.currentSession.currentQuestionIndex,
      userAnswer: -1,
      correct: false
    });

    this.currentSession.currentQuestionIndex++;

    if (this.currentSession.currentQuestionIndex >= this.currentSession.questions.length) {
      this.currentSession.endTime = new Date().toISOString();
      return { content: [{ type: "text", text: `⏭️ Skipped!\n\n${this.formatResults()}` }] };
    }

    return { content: [{ type: "text", text: `⏭️ Skipped!\n\n${this.formatQuestion()}` }] };
  }

  private getQuizResults() {
    if (!this.currentSession) throw new Error("No active quiz");
    if (!this.currentSession.endTime) throw new Error("Quiz not completed yet");
    return { content: [{ type: "text", text: this.formatResults() }] };
  }

  private formatQuestion(): string {
    if (!this.currentSession) return "";
    
    const idx = this.currentSession.currentQuestionIndex;
    if (idx >= this.currentSession.questions.length) return "Quiz completed!";

    const q = this.currentSession.questions[idx];
    let text = `Question ${idx + 1}/${this.currentSession.questions.length}\n`;
    text += `Category: ${q.category} | Difficulty: ${q.difficulty}\n\n`;
    text += `${q.question}\n\n`;
    q.options.forEach((opt, i) => {
      text += `${i}. ${opt}\n`;
    });
    text += `\nScore: ${this.currentSession.score}/${idx}`;
    return text;
  }

  private formatResults(): string {
    if (!this.currentSession) return "";

    const total = this.currentSession.questions.length;
    const score = this.currentSession.score;
    const percentage = ((score / total) * 100).toFixed(1);

    let result = `🎉 Quiz Complete!\n${"=".repeat(50)}\n\n`;
    result += `Score: ${score}/${total} (${percentage}%)\n`;
    
    if (percentage >= "90") result += "Grade: A+ 🌟\n";
    else if (percentage >= "80") result += "Grade: A 😊\n";
    else if (percentage >= "70") result += "Grade: B 👍\n";
    else if (percentage >= "60") result += "Grade: C 😐\n";
    else result += "Grade: F 😔\n";

    result += `\nCategory: ${this.currentSession.category}\n`;

    if (this.currentSession.endTime) {
      const duration = Math.floor((new Date(this.currentSession.endTime).getTime() - new Date(this.currentSession.startTime).getTime()) / 1000);
      result += `Time: ${duration} seconds\n`;
    }

    return result;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async run() {
    // Check if HTTP mode is requested
    const useHttp = process.env.MCP_TRANSPORT === "http" || process.argv.includes("--http");
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3004;

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
        res.json({ status: "ok", server: "trivia-quiz-app" });
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
        console.error(`Trivia Quiz MCP Server running on http://localhost:${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/`);
      });
    } else {
      // STDIO mode for Claude Desktop / Inspector
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Trivia Quiz MCP Server running on stdio");
    }
  }
}

const server = new TriviaQuizServer();
server.run().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

