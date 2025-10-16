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

interface PomodoroSession {
  id: string;
  taskName: string;
  type: "work" | "shortBreak" | "longBreak";
  duration: number; // in minutes
  startTime: string;
  endTime?: string;
  completed: boolean;
  interrupted: boolean;
}

interface Task {
  id: string;
  name: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  createdAt: string;
  completedAt?: string;
  tags: string[];
}

interface TimerState {
  active: boolean;
  currentSession?: {
    id: string;
    taskId?: string;
    type: "work" | "shortBreak" | "longBreak";
    duration: number;
    startTime: string;
    remainingSeconds: number;
  };
  pomodorosUntilLongBreak: number;
}

interface Settings {
  workDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  pomodorosBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
}

// Pomodoro Timer MCP Server
class PomodoroTimerServer {
  private server: Server;
  private dataDir: string;
  private sessionsFile: string;
  private tasksFile: string;
  private settingsFile: string;
  
  private sessions: PomodoroSession[] = [];
  private tasks: Task[] = [];
  private timerState: TimerState = {
    active: false,
    pomodorosUntilLongBreak: 4,
  };
  private settings: Settings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    pomodorosBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
  };

  constructor() {
    this.server = new Server(
      {
        name: "pomodoro-timer",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.dataDir = path.join(__dirname, "../../data");
    this.sessionsFile = path.join(this.dataDir, "sessions.json");
    this.tasksFile = path.join(this.dataDir, "tasks.json");
    this.settingsFile = path.join(this.dataDir, "settings.json");

    this.setupHandlers();
  }

  private async loadData() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      try {
        const sessionsData = await fs.readFile(this.sessionsFile, "utf-8");
        this.sessions = JSON.parse(sessionsData);
      } catch {}
      
      try {
        const tasksData = await fs.readFile(this.tasksFile, "utf-8");
        this.tasks = JSON.parse(tasksData);
      } catch {}
      
      try {
        const settingsData = await fs.readFile(this.settingsFile, "utf-8");
        this.settings = { ...this.settings, ...JSON.parse(settingsData) };
      } catch {}
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  private async saveData() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.writeFile(this.sessionsFile, JSON.stringify(this.sessions, null, 2));
      await fs.writeFile(this.tasksFile, JSON.stringify(this.tasks, null, 2));
      await fs.writeFile(this.settingsFile, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "start_pomodoro",
          description: "Start a Pomodoro work session (default 25 minutes).",
          inputSchema: {
            type: "object",
            properties: {
              task_name: {
                type: "string",
                description: "Name of the task you're working on",
              },
              duration: {
                type: "number",
                description: "Custom duration in minutes (optional)",
              },
            },
            required: ["task_name"],
          },
        },
        {
          name: "start_break",
          description: "Start a break (short or long).",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["short", "long"],
                description: "Type of break",
                default: "short",
              },
            },
          },
        },
        {
          name: "stop_timer",
          description: "Stop the current timer session.",
          inputSchema: {
            type: "object",
            properties: {
              mark_completed: {
                type: "boolean",
                description: "Mark as completed (true) or interrupted (false)",
                default: true,
              },
            },
          },
        },
        {
          name: "get_timer_status",
          description: "Get the current timer status and remaining time.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "add_task",
          description: "Add a task to the task list.",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Task name",
              },
              estimated_pomodoros: {
                type: "number",
                description: "Estimated number of pomodoros",
                default: 1,
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Tags for the task",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "list_tasks",
          description: "List all tasks (active or completed).",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["active", "completed", "all"],
                description: "Filter by status",
                default: "active",
              },
              tag: {
                type: "string",
                description: "Filter by tag",
              },
            },
          },
        },
        {
          name: "complete_task",
          description: "Mark a task as completed.",
          inputSchema: {
            type: "object",
            properties: {
              task_id: {
                type: "string",
                description: "Task ID to complete",
              },
            },
            required: ["task_id"],
          },
        },
        {
          name: "get_statistics",
          description: "Get productivity statistics.",
          inputSchema: {
            type: "object",
            properties: {
              period: {
                type: "string",
                enum: ["today", "week", "month", "all"],
                description: "Time period for stats",
                default: "today",
              },
            },
          },
        },
        {
          name: "update_settings",
          description: "Update Pomodoro timer settings.",
          inputSchema: {
            type: "object",
            properties: {
              work_duration: {
                type: "number",
                description: "Work session duration in minutes",
              },
              short_break_duration: {
                type: "number",
                description: "Short break duration in minutes",
              },
              long_break_duration: {
                type: "number",
                description: "Long break duration in minutes",
              },
              pomodoros_before_long_break: {
                type: "number",
                description: "Number of pomodoros before long break",
              },
            },
          },
        },
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      await this.loadData();

      try {
        let result: any;
        
        switch (name) {
          case "start_pomodoro":
            result = await this.startPomodoro(args);
            break;
          case "start_break":
            result = await this.startBreak(args);
            break;
          case "stop_timer":
            result = await this.stopTimer(args);
            break;
          case "get_timer_status":
            result = await this.getTimerStatus();
            break;
          case "add_task":
            result = await this.addTask(args);
            break;
          case "list_tasks":
            result = await this.listTasks(args);
            break;
          case "complete_task":
            result = await this.completeTask(args);
            break;
          case "get_statistics":
            result = await this.getStatistics(args);
            break;
          case "update_settings":
            result = await this.updateSettings(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async startPomodoro(args: any) {
    if (this.timerState.active) {
      throw new Error("A timer is already running. Stop it first.");
    }

    const taskName = args.task_name;
    const duration = args.duration || this.settings.workDuration;

    // Find or create task
    let task = this.tasks.find(t => t.name === taskName && !t.completedAt);
    if (!task) {
      task = {
        id: nanoid(),
        name: taskName,
        estimatedPomodoros: 1,
        completedPomodoros: 0,
        createdAt: new Date().toISOString(),
        tags: [],
      };
      this.tasks.push(task);
    }

    const sessionId = nanoid();
    this.timerState = {
      active: true,
      currentSession: {
        id: sessionId,
        taskId: task.id,
        type: "work",
        duration,
        startTime: new Date().toISOString(),
        remainingSeconds: duration * 60,
      },
      pomodorosUntilLongBreak: this.timerState.pomodorosUntilLongBreak,
    };

    await this.saveData();

    return {
      content: [
        {
          type: "text",
          text: `🍅 Pomodoro started!\n\nTask: ${taskName}\nDuration: ${duration} minutes\n\n Focus on your work. You've got this! 💪`,
        },
      ],
    };
  }

  private async startBreak(args: any) {
    if (this.timerState.active) {
      throw new Error("A timer is already running. Stop it first.");
    }

    const breakType = args.type || "short";
    const duration = breakType === "short" 
      ? this.settings.shortBreakDuration 
      : this.settings.longBreakDuration;

    const sessionId = nanoid();
    this.timerState = {
      active: true,
      currentSession: {
        id: sessionId,
        type: breakType === "short" ? "shortBreak" : "longBreak",
        duration,
        startTime: new Date().toISOString(),
        remainingSeconds: duration * 60,
      },
      pomodorosUntilLongBreak: this.timerState.pomodorosUntilLongBreak,
    };

    await this.saveData();

    const emoji = breakType === "short" ? "☕" : "🌴";
    return {
      content: [
        {
          type: "text",
          text: `${emoji} ${breakType === "short" ? "Short" : "Long"} break started!\n\nDuration: ${duration} minutes\n\nRelax and recharge! 😌`,
        },
      ],
    };
  }

  private async stopTimer(args: any) {
    if (!this.timerState.active || !this.timerState.currentSession) {
      throw new Error("No active timer to stop.");
    }

    const markCompleted = args.mark_completed ?? true;
    const session = this.timerState.currentSession;

    // Save session
    const pomodoroSession: PomodoroSession = {
      id: session.id,
      taskName: session.taskId ? this.tasks.find(t => t.id === session.taskId)?.name || "Unknown" : "Break",
      type: session.type,
      duration: session.duration,
      startTime: session.startTime,
      endTime: new Date().toISOString(),
      completed: markCompleted,
      interrupted: !markCompleted,
    };

    this.sessions.push(pomodoroSession);

    // Update task if it was a work session and completed
    if (session.type === "work" && session.taskId && markCompleted) {
      const task = this.tasks.find(t => t.id === session.taskId);
      if (task) {
        task.completedPomodoros++;
        
        // Decrease pomodoros until long break
        this.timerState.pomodorosUntilLongBreak--;
        if (this.timerState.pomodorosUntilLongBreak <= 0) {
          this.timerState.pomodorosUntilLongBreak = this.settings.pomodorosBeforeLongBreak;
        }
      }
    }

    this.timerState.active = false;
    this.timerState.currentSession = undefined;

    await this.saveData();

    let message = markCompleted 
      ? `✓ Timer completed!\n\n` 
      : `⏸️ Timer stopped.\n\n`;

    if (session.type === "work" && markCompleted) {
      message += `Great work! 🎉\n`;
      if (this.timerState.pomodorosUntilLongBreak === this.settings.pomodorosBeforeLongBreak) {
        message += `\nTime for a long break! 🌴`;
      } else {
        message += `\nPomodoros until long break: ${this.timerState.pomodorosUntilLongBreak}`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  }

  private async getTimerStatus() {
    if (!this.timerState.active || !this.timerState.currentSession) {
      return {
        content: [
          {
            type: "text",
            text: "No active timer.\n\nReady to start a Pomodoro? 🍅",
          },
        ],
      };
    }

    const session = this.timerState.currentSession;
    const elapsed = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    const remaining = Math.max(0, session.duration * 60 - elapsed);
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    let taskName = "Break";
    if (session.taskId) {
      const task = this.tasks.find(t => t.id === session.taskId);
      taskName = task?.name || "Unknown";
    }

    const typeEmoji = session.type === "work" ? "🍅" : session.type === "shortBreak" ? "☕" : "🌴";
    const typeName = session.type === "work" ? "Work Session" : session.type === "shortBreak" ? "Short Break" : "Long Break";

    let message = `${typeEmoji} ${typeName} Active\n\n`;
    if (session.type === "work") {
      message += `Task: ${taskName}\n`;
    }
    message += `Time Remaining: ${minutes}:${seconds.toString().padStart(2, "0")}\n`;
    message += `Duration: ${session.duration} minutes\n`;
    if (session.type === "work") {
      message += `\nPomodoros until long break: ${this.timerState.pomodorosUntilLongBreak}`;
    }

    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  }

  private async addTask(args: any) {
    const task: Task = {
      id: nanoid(),
      name: args.name,
      estimatedPomodoros: args.estimated_pomodoros || 1,
      completedPomodoros: 0,
      createdAt: new Date().toISOString(),
      tags: args.tags || [],
    };

    this.tasks.push(task);
    await this.saveData();

    return {
      content: [
        {
          type: "text",
          text: `✓ Task added: ${task.name}\nEstimated: ${task.estimatedPomodoros} pomodoro(s)\nID: ${task.id}`,
        },
      ],
    };
  }

  private async listTasks(args: any) {
    const status = args.status || "active";
    const tag = args.tag;

    let filtered = this.tasks;

    if (status === "active") {
      filtered = filtered.filter(t => !t.completedAt);
    } else if (status === "completed") {
      filtered = filtered.filter(t => t.completedAt);
    }

    if (tag) {
      filtered = filtered.filter(t => t.tags.includes(tag));
    }

    if (filtered.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No tasks found.",
          },
        ],
      };
    }

    let message = `Tasks (${status})\n${"=".repeat(50)}\n\n`;
    filtered.forEach((task, i) => {
      message += `${i + 1}. ${task.name}\n`;
      message += `   Progress: ${task.completedPomodoros}/${task.estimatedPomodoros} pomodoros\n`;
      message += `   ID: ${task.id}\n`;
      if (task.tags.length > 0) {
        message += `   Tags: ${task.tags.join(", ")}\n`;
      }
      message += "\n";
    });

    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  }

  private async completeTask(args: any) {
    const task = this.tasks.find(t => t.id === args.task_id);
    if (!task) {
      throw new Error("Task not found");
    }

    task.completedAt = new Date().toISOString();
    await this.saveData();

    return {
      content: [
        {
          type: "text",
          text: `✓ Task completed: ${task.name}\nCompleted ${task.completedPomodoros} pomodoro(s)`,
        },
      ],
    };
  }

  private async getStatistics(args: any) {
    const period = args.period || "today";
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setDate(now.getDate() - 30);
        break;
      case "all":
        startDate = new Date(0);
        break;
    }

    const filteredSessions = this.sessions.filter(
      s => new Date(s.startTime) >= startDate && s.completed
    );

    const workSessions = filteredSessions.filter(s => s.type === "work");
    const totalPomodoros = workSessions.length;
    const totalMinutes = workSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    let message = `📊 Productivity Statistics (${period})\n${"=".repeat(50)}\n\n`;
    message += `Completed Pomodoros: ${totalPomodoros} 🍅\n`;
    message += `Total Focus Time: ${totalHours} hours\n`;
    message += `Average Session: ${totalPomodoros > 0 ? (totalMinutes / totalPomodoros).toFixed(1) : 0} minutes\n\n`;

    // Task statistics
    const completedTasks = this.tasks.filter(t => 
      t.completedAt && new Date(t.completedAt) >= startDate
    );
    message += `Completed Tasks: ${completedTasks.length}\n`;

    // Most productive day
    if (workSessions.length > 0) {
      const dayStats = new Map<string, number>();
      workSessions.forEach(s => {
        const day = new Date(s.startTime).toLocaleDateString();
        dayStats.set(day, (dayStats.get(day) || 0) + 1);
      });
      
      const mostProductiveDay = Array.from(dayStats.entries())
        .sort((a, b) => b[1] - a[1])[0];
      message += `\nMost Productive Day: ${mostProductiveDay[0]} (${mostProductiveDay[1]} pomodoros)`;
    }

    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  }

  private async updateSettings(args: any) {
    if (args.work_duration) this.settings.workDuration = args.work_duration;
    if (args.short_break_duration) this.settings.shortBreakDuration = args.short_break_duration;
    if (args.long_break_duration) this.settings.longBreakDuration = args.long_break_duration;
    if (args.pomodoros_before_long_break) this.settings.pomodorosBeforeLongBreak = args.pomodoros_before_long_break;

    await this.saveData();

    return {
      content: [
        {
          type: "text",
          text: `✓ Settings updated!\n\nWork: ${this.settings.workDuration}min\nShort Break: ${this.settings.shortBreakDuration}min\nLong Break: ${this.settings.longBreakDuration}min\nPomodoros before long break: ${this.settings.pomodorosBeforeLongBreak}`,
        },
      ],
    };
  }

  async run() {
    await this.loadData();

    // Check if HTTP mode is requested
    const useHttp = process.env.MCP_TRANSPORT === "http" || process.argv.includes("--http");
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;

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
        res.json({ status: "ok", server: "pomodoro-timer" });
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
        console.error(`Pomodoro Timer MCP Server running on http://localhost:${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/`);
      });
    } else {
      // STDIO mode for Claude Desktop / Inspector
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Pomodoro Timer MCP Server running on stdio");
    }
  }
}

const server = new PomodoroTimerServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

