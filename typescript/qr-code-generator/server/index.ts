#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import QRCode from "qrcode";
import express from "express";

interface QRCodeOptions {
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  type?: "image/png" | "image/jpeg" | "image/webp";
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

interface GenerateQRCodeArgs {
  data: string;
  type?: "url" | "text" | "email" | "phone" | "sms" | "wifi";
  options?: QRCodeOptions;
}

interface WifiConfig {
  ssid: string;
  password: string;
  security?: "WPA" | "WEP" | "nopass";
  hidden?: boolean;
}

// QR Code Generator MCP Server
class QRCodeGeneratorServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "qr-code-generator",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "generate_qr_code",
          description:
            "Generate a QR code from text, URL, email, phone number, SMS, or WiFi credentials. Returns a base64-encoded image.",
          inputSchema: {
            type: "object",
            properties: {
              data: {
                type: "string",
                description: "The data to encode in the QR code",
              },
              type: {
                type: "string",
                enum: ["url", "text", "email", "phone", "sms", "wifi"],
                description: "Type of data to encode",
                default: "text",
              },
              options: {
                type: "object",
                description: "QR code generation options",
                properties: {
                  errorCorrectionLevel: {
                    type: "string",
                    enum: ["L", "M", "Q", "H"],
                    description:
                      "Error correction level (L: 7%, M: 15%, Q: 25%, H: 30%)",
                    default: "M",
                  },
                  width: {
                    type: "number",
                    description: "Width of the QR code in pixels",
                    default: 300,
                  },
                  margin: {
                    type: "number",
                    description: "Margin around the QR code",
                    default: 4,
                  },
                  color: {
                    type: "object",
                    properties: {
                      dark: {
                        type: "string",
                        description: "Dark color (hex)",
                        default: "#000000",
                      },
                      light: {
                        type: "string",
                        description: "Light color (hex)",
                        default: "#FFFFFF",
                      },
                    },
                  },
                },
              },
            },
            required: ["data"],
          },
        },
        {
          name: "generate_wifi_qr",
          description:
            "Generate a QR code for WiFi credentials that can be scanned to connect",
          inputSchema: {
            type: "object",
            properties: {
              ssid: {
                type: "string",
                description: "WiFi network name (SSID)",
              },
              password: {
                type: "string",
                description: "WiFi password",
              },
              security: {
                type: "string",
                enum: ["WPA", "WEP", "nopass"],
                description: "WiFi security type",
                default: "WPA",
              },
              hidden: {
                type: "boolean",
                description: "Is the network hidden?",
                default: false,
              },
              options: {
                type: "object",
                description: "QR code generation options",
                properties: {
                  width: {
                    type: "number",
                    default: 300,
                  },
                  margin: {
                    type: "number",
                    default: 4,
                  },
                },
              },
            },
            required: ["ssid", "password"],
          },
        },
        {
          name: "generate_vcard_qr",
          description: "Generate a QR code for contact information (vCard)",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Full name",
              },
              phone: {
                type: "string",
                description: "Phone number",
              },
              email: {
                type: "string",
                description: "Email address",
              },
              organization: {
                type: "string",
                description: "Organization/Company",
              },
              url: {
                type: "string",
                description: "Website URL",
              },
              options: {
                type: "object",
                properties: {
                  width: {
                    type: "number",
                    default: 300,
                  },
                },
              },
            },
            required: ["name"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "generate_qr_code":
            return await this.handleGenerateQRCode(args as unknown as GenerateQRCodeArgs);
          case "generate_wifi_qr":
            return await this.handleGenerateWifiQR(args as unknown as WifiConfig & { options?: QRCodeOptions });
          case "generate_vcard_qr":
            return await this.handleGenerateVCardQR(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
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

  private async handleGenerateQRCode(args: GenerateQRCodeArgs) {
    const { data, type = "text", options = {} } = args;

    // Format data based on type
    let qrData = data;
    switch (type) {
      case "url":
        if (!data.startsWith("http://") && !data.startsWith("https://")) {
          qrData = `https://${data}`;
        }
        break;
      case "email":
        qrData = `mailto:${data}`;
        break;
      case "phone":
        qrData = `tel:${data}`;
        break;
      case "sms":
        qrData = `sms:${data}`;
        break;
    }

    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || "M",
      width: options.width || 300,
      margin: options.margin || 4,
      color: {
        dark: options.color?.dark || "#000000",
        light: options.color?.light || "#FFFFFF",
      },
    };

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, qrOptions);

    return {
      content: [
        {
          type: "text",
          text: `Generated QR code for ${type}: ${data}`,
        },
        {
          type: "image",
          data: qrCodeDataUrl.split(",")[1], // Remove data:image/png;base64, prefix
          mimeType: "image/png",
        },
      ],
    };
  }

  private async handleGenerateWifiQR(args: WifiConfig & { options?: QRCodeOptions }) {
    const { ssid, password, security = "WPA", hidden = false, options = {} } = args;

    // WiFi QR code format: WIFI:T:WPA;S:ssid;P:password;H:false;;
    const wifiString = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`;

    const qrOptions = {
      errorCorrectionLevel: "H" as const, // High error correction for WiFi
      width: options.width || 300,
      margin: options.margin || 4,
    };

    const qrCodeDataUrl = await QRCode.toDataURL(wifiString, qrOptions);

    return {
      content: [
        {
          type: "text",
          text: `Generated WiFi QR code for network: ${ssid}`,
        },
        {
          type: "image",
          data: qrCodeDataUrl.split(",")[1],
          mimeType: "image/png",
        },
      ],
    };
  }

  private async handleGenerateVCardQR(args: any) {
    const { name, phone, email, organization, url, options = {} } = args;

    // vCard format
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name}`,
      phone ? `TEL:${phone}` : "",
      email ? `EMAIL:${email}` : "",
      organization ? `ORG:${organization}` : "",
      url ? `URL:${url}` : "",
      "END:VCARD",
    ]
      .filter((line) => line)
      .join("\n");

    const qrOptions = {
      errorCorrectionLevel: "M" as const,
      width: options.width || 300,
      margin: 4,
    };

    const qrCodeDataUrl = await QRCode.toDataURL(vcard, qrOptions);

    return {
      content: [
        {
          type: "text",
          text: `Generated vCard QR code for: ${name}`,
        },
        {
          type: "image",
          data: qrCodeDataUrl.split(",")[1],
          mimeType: "image/png",
        },
      ],
    };
  }

  async run() {
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
        res.json({ status: "ok", server: "qr-code-generator" });
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
        console.error(`QR Code Generator MCP Server running on http://localhost:${port}`);
        console.error(`MCP endpoint: http://localhost:${port}/`);
      });
    } else {
      // STDIO mode for Claude Desktop / Inspector
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("QR Code Generator MCP Server running on stdio");
    }
  }
}

// Start the server
const server = new QRCodeGeneratorServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

