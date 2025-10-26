# 🚀 How to Start the Complete Jesture Application

## Full Startup Process (4 terminals needed)

### Terminal 1: Start AI Agents
```bash
cd /Users/vanishaswabhanam/Documents/GitHub/Jesture/agents
./start_agents.sh
```
**What this does**:
- Starts MCP Gesture Hub on port 8000/8002
- Starts AI Workflow Agent on port 8001/8003
- Both connect to Agentverse Mailbox

**Keep this terminal open!** The agents need to stay running.

---

### Terminal 2: Start Backend Server
```bash
cd /Users/vanishaswabhanam/Documents/GitHub/Jesture/server
npm start
```
**What this does**:
- Starts Node.js server on port 3001
- Handles Socket.IO for gesture events
- Executes keyboard/mouse/light actions
- Loads and runs workflows

**Keep this terminal open!** The server needs to stay running.

---

### Terminal 3: Start Frontend (Electron)
```bash
cd /Users/vanishaswabhanam/Documents/GitHub/Jesture/frontend
npm run electron:dev
```
**What this does**:
- Starts Vite dev server (React app)
- Launches Electron window
- Enables camera for gesture detection
- Provides UI for workflow builder and AI Mode

**This is your main application window!**

---

### Terminal 4: Optional - Monitor Logs
```bash
# Watch agent logs
tail -f /tmp/mcp_hub.log /tmp/workflow_agent.log

# Or check server logs (if you redirected them)
# The server logs show in Terminal 2
```

---

## 🎯 Startup Order (Important!)

**Start in this order**:
1. **Agents first** (Terminal 1) - They need to be ready before frontend tries to connect
2. **Server second** (Terminal 2) - Backend needs to be ready
3. **Frontend last** (Terminal 3) - This connects to server and agents

---

## ✅ Verify Everything is Running

After starting all 3, check:

```bash
# Check agents
curl http://localhost:8002/health  # MCP Hub
curl http://localhost:8003/health  # AI Workflow Agent

# Check server
curl http://localhost:3001/health  # Should respond (if you have a health endpoint)

# Check frontend - you should see the Electron window open
```

---

## 🔍 What Each Component Does

### AI Agents (Port 8000-8003)
- **MCP Gesture Hub**: Provides gesture catalog
- **AI Workflow Agent**: Generates context-aware workflows with Claude
- Used when you click "AI Mode" button in the app

### Backend Server (Port 3001)
- Receives gestures from frontend via Socket.IO
- Executes actions (keyboard, mouse, lights)
- Manages active workflows
- Cooldown tracking

### Frontend (Electron App)
- Camera feed for gesture detection
- Workflow builder UI (drag-and-drop)
- AI Mode button
- Dashboard for managing workflows

---

## 🛑 How to Stop Everything

### Quick Stop (Kill all at once):
```bash
# Stop agents
lsof -ti:8000,8001,8002,8003 | xargs kill -9

# Stop server
lsof -ti:3001 | xargs kill -9

# Stop frontend - Just close the Electron window
# Or press Ctrl+C in Terminal 3
```

### Graceful Stop:
1. Close Electron window (or Ctrl+C in Terminal 3)
2. Press Ctrl+C in Terminal 2 (server)
3. Press Ctrl+C in Terminal 1 (agents)

---

## 🧪 Testing the Full System

### 1. Test Manual Workflow Mode
1. Open the app (Electron window)
2. Create a workflow in the editor
3. Add gesture → action mappings
4. Click "Run" to activate workflow
5. Make a gesture in front of camera
6. See action execute!

### 2. Test AI Mode
1. Open a video player (Netflix, YouTube)
2. Click "AI Mode" button in the app
3. The AI Workflow Agent detects you're watching video
4. It generates a workflow automatically:
   - swipe_right → skip forward
   - swipe_left → skip backward
   - palm → play/pause
   - etc.
5. Make gestures to control the video!

### 3. Test Context Switching
1. Activate AI Mode while in YouTube
2. Switch to PowerPoint
3. AI Mode detects new context
4. Generates different workflow for presentations
5. Same gestures now control slides instead of video!

---

## 🐛 Troubleshooting

### "Port already in use" errors
```bash
# Kill everything and restart
lsof -ti:3001,8000,8001,8002,8003 | xargs kill -9
# Then start again in order (agents → server → frontend)
```

### Agents not connecting to Agentverse
```bash
# Check agent logs
tail -50 /tmp/mcp_hub.log
tail -50 /tmp/workflow_agent.log

# Look for "Mailbox access token acquired"
# If not there, restart agents
```

### Frontend can't detect gestures
- Allow camera permissions when prompted
- Check browser console for errors
- Verify MediaPipe is loading

### AI Mode not working
```bash
# Verify agents are running
curl http://localhost:8002/health
curl http://localhost:8003/health

# Check if Claude API key is set
grep ANTHROPIC_API_KEY .env

# Test AI Mode manually
curl -X POST http://localhost:8003/activate \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","session_id":"test"}'
```

---

## 📝 Environment Variables Check

Before starting, verify your `.env` file has:

```bash
# In /Jesture/.env
AGENTVERSE_KEY=eyJhbG...  # Your Agentverse API key
MCP_HUB_SEED=jesture_mcp_gesture_hub_2025_calhacks
WORKFLOW_AGENT_SEED=jesture_ai_workflow_generator_2025_calhacks
ANTHROPIC_API_KEY=sk-ant-api03-...  # Your Claude API key
```

---

## 🎬 Complete Startup Script (Optional)

Create this file to start everything at once:

**File**: `/Jesture/start_all.sh`
```bash
#!/bin/bash

echo "🚀 Starting Jesture Complete System"
echo "===================================="

# Start agents in background
cd agents
./start_agents.sh &
AGENTS_PID=$!
echo "✅ Agents started (PID: $AGENTS_PID)"
sleep 3

# Start server in new terminal (macOS)
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"'/../server && npm start"'
echo "✅ Server starting in new terminal..."
sleep 2

# Start frontend in new terminal (macOS)
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"'/../frontend && npm run electron:dev"'
echo "✅ Frontend starting in new terminal..."

echo ""
echo "===================================="
echo "✅ All systems starting!"
echo ""
echo "🌐 Access:"
echo "   - Frontend: Electron window will open"
echo "   - Server: http://localhost:3001"
echo "   - MCP Hub: http://localhost:8002"
echo "   - AI Agent: http://localhost:8003"
echo ""
echo "🛑 To stop: Close terminal windows or run:"
echo "   lsof -ti:3001,8000,8001,8002,8003 | xargs kill -9"
```

Make it executable:
```bash
chmod +x start_all.sh
./start_all.sh
```

---

## 🎯 Quick Start Commands

**Just starting fresh?**
```bash
cd /Users/vanishaswabhanam/Documents/GitHub/Jesture

# Terminal 1
cd agents && ./start_agents.sh

# Terminal 2
cd server && npm start

# Terminal 3
cd frontend && npm run electron:dev
```

**That's it!** 🎉
