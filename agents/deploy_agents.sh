#!/bin/bash

echo "============================================================"
echo "🚀 Jesture AI Agents - Agentverse Deployment"
echo "============================================================"
echo ""

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file with:"
    echo "  AGENTVERSE_KEY=your_key"
    echo "  ANTHROPIC_API_KEY=your_claude_key"
    exit 1
fi

# Load environment variables
export $(cat ../.env | grep -v '^#' | xargs)

echo "✅ Environment variables loaded"
echo ""

# Check which agent to deploy
echo "Which agent do you want to deploy?"
echo "1) MCP Gesture Hub Agent (port 8002)"
echo "2) AI Workflow Agent (port 8003)"
echo "3) Both (in separate terminals)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying MCP Gesture Hub Agent..."
        echo "============================================================"
        python3 mcp_gesture_hub.py
        ;;
    2)
        echo ""
        echo "🚀 Deploying AI Workflow Agent..."
        echo "============================================================"
        python3 ai_mode_workflow_agent.py
        ;;
    3)
        echo ""
        echo "⚠️  Please open TWO separate terminal windows and run:"
        echo ""
        echo "Terminal 1:"
        echo "  cd agents && python3 mcp_gesture_hub.py"
        echo ""
        echo "Terminal 2:"
        echo "  cd agents && python3 ai_mode_workflow_agent.py"
        echo ""
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
