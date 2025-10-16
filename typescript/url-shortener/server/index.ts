#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LinkData {
  id: string;
  originalUrl: string;
  shortCode: string;
  customAlias?: string;
  createdAt: string;
  expiresAt?: string;
  clicks: number;
  clickDetails: ClickDetail[];
  tags: string[];
  description?: string;
}

interface ClickDetail {
  timestamp: string;
  referer?: string;
  userAgent?: string;
}

interface CreateShortUrlArgs {
  url: string;
  custom_alias?: string;
  expires_in_days?: number;
  tags?: string[];
  description?: string;
}

// URL Shortener MCP Server
class URLShortenerServer {
  private server: Server;
  private dataFile: string;
  private links: Map<string, LinkData>;

  constructor() {
    this.server = new Server(
      {
        name: "url-shortener",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Data file path
    const dataDir = path.join(__dirname, "../../data");
    this.dataFile = path.join(dataDir, "links.json");
    this.links = new Map();

    this.setupHandlers();
  }

  private async loadData() {
    try {
      const data = await fs.readFile(this.dataFile, "utf-8");
      const linksArray: LinkData[] = JSON.parse(data);
      this.links = new Map(linksArray.map((link) => [link.shortCode, link]));
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      this.links = new Map();
      await this.saveData();
    }
  }

  private async saveData() {
    try {
      const dataDir = path.dirname(this.dataFile);
      await fs.mkdir(dataDir, { recursive: true });
      const linksArray = Array.from(this.links.values());
      await fs.writeFile(this.dataFile, JSON.stringify(linksArray, null, 2));
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  private async callToolDirect(name: string, args: any) {
    switch (name) {
      case "create_short_url":
        return await this.handleCreateShortUrl(args as unknown as CreateShortUrlArgs);
      case "get_link_stats":
        return await this.handleGetLinkStats(args as any);
      case "list_links":
        return await this.handleListLinks(args as any);
      case "delete_link":
        return await this.handleDeleteLink(args as any);
      case "update_link":
        return await this.handleUpdateLink(args as any);
      case "get_analytics":
        return await this.handleGetAnalytics(args as any);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.getTools() };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Load data for each request
      await this.loadData();

      return await this.callToolDirect(name, args);
    });
  }

  private getTools(): Tool[] {
    return [
        {
          name: "create_short_url",
          description:
            "Create a shortened URL with optional custom alias, expiration, and tags.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The URL to shorten (must include http:// or https://)",
              },
              custom_alias: {
                type: "string",
                description:
                  "Optional custom short code (letters, numbers, hyphens, underscores)",
              },
              expires_in_days: {
                type: "number",
                description:
                  "Number of days until the link expires (optional)",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Tags for organizing links",
              },
              description: {
                type: "string",
                description: "Optional description for the link",
              },
            },
            required: ["url"],
          },
        },
        {
          name: "get_link_stats",
          description: "Get statistics and details for a shortened URL.",
          inputSchema: {
            type: "object",
            properties: {
              short_code: {
                type: "string",
                description: "The short code to get stats for",
              },
            },
            required: ["short_code"],
          },
        },
        {
          name: "list_links",
          description:
            "List all shortened URLs with optional filtering by tag.",
          inputSchema: {
            type: "object",
            properties: {
              tag: {
                type: "string",
                description: "Filter by tag (optional)",
              },
              limit: {
                type: "number",
                description: "Maximum number of links to return",
                default: 20,
              },
              sort_by: {
                type: "string",
                enum: ["created", "clicks", "alphabetical"],
                description: "Sort order",
                default: "created",
              },
            },
          },
        },
        {
          name: "delete_link",
          description: "Delete a shortened URL.",
          inputSchema: {
            type: "object",
            properties: {
              short_code: {
                type: "string",
                description: "The short code to delete",
              },
            },
            required: ["short_code"],
          },
        },
        {
          name: "update_link",
          description: "Update a link's tags or description.",
          inputSchema: {
            type: "object",
            properties: {
              short_code: {
                type: "string",
                description: "The short code to update",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "New tags (replaces existing)",
              },
              description: {
                type: "string",
                description: "New description",
              },
            },
            required: ["short_code"],
          },
        },
        {
          name: "get_analytics",
          description: "Get analytics summary for all links or by tag.",
          inputSchema: {
            type: "object",
            properties: {
              tag: {
                type: "string",
                description: "Filter by tag (optional)",
              },
            },
          },
        },
      ];
  }

  private validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  private async handleCreateShortUrl(args: CreateShortUrlArgs) {
    const { url, custom_alias, expires_in_days, tags = [], description } = args;

    // Validate URL
    if (!this.validateUrl(url)) {
      throw new Error(
        "Invalid URL. Must include http:// or https:// protocol."
      );
    }

    // Generate or use custom short code
    let shortCode: string;
    if (custom_alias) {
      // Validate custom alias
      if (!/^[a-zA-Z0-9_-]+$/.test(custom_alias)) {
        throw new Error(
          "Custom alias can only contain letters, numbers, hyphens, and underscores"
        );
      }
      if (this.links.has(custom_alias)) {
        throw new Error("Custom alias already exists");
      }
      shortCode = custom_alias;
    } else {
      // Generate random short code
      shortCode = nanoid(8);
    }

    // Calculate expiration
    let expiresAt: string | undefined;
    if (expires_in_days) {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + expires_in_days);
      expiresAt = expireDate.toISOString();
    }

    // Create link data
    const linkData: LinkData = {
      id: nanoid(),
      originalUrl: url,
      shortCode,
      customAlias: custom_alias,
      createdAt: new Date().toISOString(),
      expiresAt,
      clicks: 0,
      clickDetails: [],
      tags,
      description,
    };

    this.links.set(shortCode, linkData);
    await this.saveData();

    let result = `✓ URL shortened successfully!\n\n`;
    result += `Original URL: ${url}\n`;
    result += `Short Code: ${shortCode}\n`;
    result += `Short URL: https://short.link/${shortCode}\n`;
    if (expiresAt) {
      result += `Expires: ${new Date(expiresAt).toLocaleDateString()}\n`;
    }
    if (tags.length > 0) {
      result += `Tags: ${tags.join(", ")}\n`;
    }
    if (description) {
      result += `Description: ${description}\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async handleGetLinkStats(args: any) {
    const { short_code } = args;

    const link = this.links.get(short_code);
    if (!link) {
      throw new Error("Short code not found");
    }

    // Check if expired
    const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

    let result = `Link Statistics\n${"=".repeat(50)}\n\n`;
    result += `Short Code: ${link.shortCode}\n`;
    result += `Original URL: ${link.originalUrl}\n`;
    result += `Created: ${new Date(link.createdAt).toLocaleString()}\n`;
    if (link.expiresAt) {
      result += `Expires: ${new Date(link.expiresAt).toLocaleString()}`;
      result += isExpired ? " (EXPIRED)\n" : "\n";
    }
    result += `Total Clicks: ${link.clicks}\n`;

    if (link.description) {
      result += `Description: ${link.description}\n`;
    }

    if (link.tags.length > 0) {
      result += `Tags: ${link.tags.join(", ")}\n`;
    }

    if (link.clickDetails.length > 0) {
      result += `\nRecent Clicks:\n`;
      const recentClicks = link.clickDetails.slice(-5).reverse();
      recentClicks.forEach((click, i) => {
        result += `  ${i + 1}. ${new Date(click.timestamp).toLocaleString()}\n`;
      });
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async handleListLinks(args: any) {
    const { tag, limit = 20, sort_by = "created" } = args;

    let linksArray = Array.from(this.links.values());

    // Filter by tag if provided
    if (tag) {
      linksArray = linksArray.filter((link) => link.tags.includes(tag));
    }

    // Sort
    if (sort_by === "clicks") {
      linksArray.sort((a, b) => b.clicks - a.clicks);
    } else if (sort_by === "alphabetical") {
      linksArray.sort((a, b) => a.shortCode.localeCompare(b.shortCode));
    } else {
      // created (newest first)
      linksArray.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Limit results
    linksArray = linksArray.slice(0, limit);

    let result = `Shortened URLs${tag ? ` (tag: ${tag})` : ""}\n${"=".repeat(50)}\n\n`;

    if (linksArray.length === 0) {
      result += "No links found.\n";
    } else {
      linksArray.forEach((link, i) => {
        result += `${i + 1}. ${link.shortCode}\n`;
        result += `   URL: ${link.originalUrl}\n`;
        result += `   Clicks: ${link.clicks}\n`;
        if (link.tags.length > 0) {
          result += `   Tags: ${link.tags.join(", ")}\n`;
        }
        if (link.description) {
          result += `   Description: ${link.description}\n`;
        }
        result += "\n";
      });

      result += `Total: ${linksArray.length} link(s)\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async handleDeleteLink(args: any) {
    const { short_code } = args;

    if (!this.links.has(short_code)) {
      throw new Error("Short code not found");
    }

    const link = this.links.get(short_code)!;
    this.links.delete(short_code);
    await this.saveData();

    return {
      content: [
        {
          type: "text",
          text: `✓ Deleted link: ${short_code}\n   Original URL: ${link.originalUrl}`,
        },
      ],
    };
  }

  private async handleUpdateLink(args: any) {
    const { short_code, tags, description } = args;

    const link = this.links.get(short_code);
    if (!link) {
      throw new Error("Short code not found");
    }

    if (tags !== undefined) {
      link.tags = tags;
    }
    if (description !== undefined) {
      link.description = description;
    }

    await this.saveData();

    return {
      content: [
        {
          type: "text",
          text: `✓ Updated link: ${short_code}`,
        },
      ],
    };
  }

  private async handleGetAnalytics(args: any) {
    const { tag } = args;

    let linksArray = Array.from(this.links.values());

    if (tag) {
      linksArray = linksArray.filter((link) => link.tags.includes(tag));
    }

    const totalLinks = linksArray.length;
    const totalClicks = linksArray.reduce((sum, link) => sum + link.clicks, 0);
    const avgClicks = totalLinks > 0 ? totalClicks / totalLinks : 0;

    // Find top links
    const topLinks = linksArray
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    // Get all unique tags
    const allTags = new Set<string>();
    linksArray.forEach((link) => link.tags.forEach((t) => allTags.add(t)));

    let result = `Analytics Summary${tag ? ` (tag: ${tag})` : ""}\n${"=".repeat(50)}\n\n`;
    result += `Total Links: ${totalLinks}\n`;
    result += `Total Clicks: ${totalClicks}\n`;
    result += `Average Clicks per Link: ${avgClicks.toFixed(2)}\n`;
    result += `Unique Tags: ${allTags.size}\n\n`;

    if (topLinks.length > 0) {
      result += `Top 5 Links:\n`;
      topLinks.forEach((link, i) => {
        result += `  ${i + 1}. ${link.shortCode} - ${link.clicks} clicks\n`;
        result += `     ${link.originalUrl}\n`;
      });
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  async run() {
    // Initialize data
    await this.loadData();

    // Check if HTTP mode is requested
    const useHttp = process.env.MCP_TRANSPORT === "http" || process.argv.includes("--http");
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

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
        res.json({ status: "ok", server: "url-shortener" });
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
        console.error(`URL Shortener MCP Server running on http://localhost:${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/`);
      });
    } else {
      // STDIO mode for Claude Desktop / Inspector
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("URL Shortener MCP Server running on stdio");
    }
  }
}

// Start the server
const server = new URLShortenerServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

