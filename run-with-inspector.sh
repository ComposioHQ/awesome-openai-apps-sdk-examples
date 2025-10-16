#!/bin/bash

# Quick script to run any MCP app with inspector + ngrok

set -e

echo "🚀 MCP App Launcher with Inspector & ngrok"
echo "=========================================="
echo ""

# Check if mcp-inspector is installed
if ! command -v mcp-inspector &> /dev/null; then
    echo "❌ MCP Inspector not found. Installing..."
    npm install -g @modelcontextprotocol/inspector
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found. Please install it:"
    echo "   macOS: brew install ngrok"
    echo "   Or download from: https://ngrok.com/download"
    exit 1
fi

# Show available apps
echo "📱 Available Apps:"
echo ""
echo "TypeScript Apps:"
echo "  1. qr-code-generator"
echo "  2. url-shortener"
echo "  3. pomodoro-timer"
echo "  4. memory-card-game"
echo "  5. trivia-quiz-app"
echo ""
echo "Python Apps:"
echo "  6. password-generator"
echo "  7. json-formatter"
echo "  8. text-analyzer"
echo "  9. habit-tracker"
echo "  10. color-palette-generator"
echo ""

# Get app choice
read -p "Enter app number (1-10): " choice

case $choice in
    1) LANG="typescript"; APP="qr-code-generator" ;;
    2) LANG="typescript"; APP="url-shortener" ;;
    3) LANG="typescript"; APP="pomodoro-timer" ;;
    4) LANG="typescript"; APP="memory-card-game" ;;
    5) LANG="typescript"; APP="trivia-quiz-app" ;;
    6) LANG="python"; APP="password-generator" ;;
    7) LANG="python"; APP="json-formatter" ;;
    8) LANG="python"; APP="text-analyzer" ;;
    9) LANG="python"; APP="habit-tracker" ;;
    10) LANG="python"; APP="color-palette-generator" ;;
    *) echo "❌ Invalid choice"; exit 1 ;;
esac

echo ""
echo "✅ Selected: $APP ($LANG)"
echo ""

# Navigate to app directory
cd "$LANG/$APP"

# Setup based on language
if [ "$LANG" = "typescript" ]; then
    echo "📦 Installing dependencies..."
    npm install > /dev/null 2>&1
    
    echo "🔨 Building..."
    npm run build > /dev/null 2>&1
    
    echo "🚀 Starting MCP Inspector..."
    echo ""
    echo "🌐 Inspector UI: http://localhost:5173"
    echo ""
    echo "⚡ Next steps:"
    echo "   1. Open http://localhost:5173 in your browser"
    echo "   2. In another terminal, run: ngrok http 5173"
    echo "   3. Copy the ngrok URL (https://xxx.ngrok.io)"
    echo "   4. Add it to ChatGPT Settings → Connectors"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    
    mcp-inspector node dist/server/index.js
    
else  # Python
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
    
    echo "🚀 Starting MCP Inspector..."
    echo ""
    echo "🌐 Inspector UI: http://localhost:5173"
    echo ""
    echo "⚡ Next steps:"
    echo "   1. Open http://localhost:5173 in your browser"
    echo "   2. In another terminal, run: ngrok http 5173"
    echo "   3. Copy the ngrok URL (https://xxx.ngrok.io)"
    echo "   4. Add it to ChatGPT Settings → Connectors"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    
    mcp-inspector python server.py
fi

