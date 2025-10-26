#!/bin/bash

echo "============================================================"
echo "🚀 Starting Jesture AI Agents with Mailbox"
echo "============================================================"
echo ""

# Load environment variables
cd "$(dirname "$0")"
export $(cat ../.env | grep -v '^#' | sed 's/\r$//' | xargs)

echo "✅ Environment variables loaded"
echo "   AGENT_SEED: ${AGENT_SEED_PHRASE:0:30}..."
echo "   ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:20}..."
echo "   AGENTVERSE_KEY: ${AGENTVERSE_KEY:0:20}..."
echo ""

# Kill existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:8002 | xargs kill -9 2>/dev/null
lsof -ti:8003 | xargs kill -9 2>/dev/null
sleep 1

echo ""
echo "============================================================"
echo "📡 Starting MCP Gesture Hub (Port 8002)"
echo "============================================================"
/usr/bin/python3 mcp_gesture_hub.py > /tmp/mcp_hub.log 2>&1 &
MCP_PID=$!
echo "   PID: $MCP_PID"
echo "   Logs: tail -f /tmp/mcp_hub.log"
sleep 3

echo ""
tail -15 /tmp/mcp_hub.log | grep -E "(Starting agent|Agent inspector|address is)"

echo ""
echo "============================================================"
echo "🧠 Starting AI Workflow Agent (Port 8003)"
echo "============================================================"
/usr/bin/python3 ai_mode_workflow_agent.py > /tmp/workflow_agent.log 2>&1 &
WORKFLOW_PID=$!
echo "   PID: $WORKFLOW_PID"
echo "   Logs: tail -f /tmp/workflow_agent.log"
sleep 3

echo ""
tail -15 /tmp/workflow_agent.log | grep -E "(Starting agent|Agent inspector|address is)"

echo ""
echo "============================================================"
echo "✅ Both agents are running!"
echo "============================================================"
echo ""
echo "📌 To connect to Agentverse:"
echo "   1. Look for 'Agent inspector available at' URLs above"
echo "   2. Click on each URL in your browser"
echo "   3. Click 'Connect' button"
echo "   4. Select 'Mailbox'"
echo "   5. Click 'Finish'"
echo ""
echo "🔍 Check status:"
echo "   curl http://localhost:8002/health"
echo "   curl http://localhost:8003/health"
echo ""
echo "🛑 Stop agents:"
echo "   kill $MCP_PID $WORKFLOW_PID"
echo ""
