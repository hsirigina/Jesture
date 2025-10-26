# 🚀 Agentverse Connection Guide for Jesture Agents

## ✅ Current Status

**Both agents are running with Mailbox enabled!**

Your agents have been successfully started and are attempting to connect to Agentverse.

### Agent Details

**Agent 1: MCP Gesture Hub**
- **Address**: `agent1qv99ug9kt6c5pz8m8u86u040rdhehhu7fj3mgdv790nrnhqdaqtk56qjkxu`
- **Port**: 8002
- **Inspector URL**: https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A8002&address=agent1qv99ug9kt6c5pz8m8u86u040rdhehhu7fj3mgdv790nrnhqdaqtk56qjkxu

**Agent 2: AI Workflow Generator**
- **Address**: `agent1qv99ug9kt6c5pz8m8u86u040rdhehhu7fj3mgdv790nrnhqdaqtk56qjkxu`
- **Port**: 8003
- **Inspector URL**: https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A8003&address=agent1qv99ug9kt6c5pz8m8u86u040rdhehhu7fj3mgdv790nrnhqdaqtk56qjkxu

---

## 📋 How to Connect to Agentverse

### Step 1: Open Inspector URLs

Click on each Inspector URL above (or copy-paste into your browser while agents are running):

1. **MCP Gesture Hub Inspector**: [Click here](https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A8002&address=agent1qv99ug9kt6c5pz8m8u86u040rdhehhu7fj3mgdv790nrnhqdaqtk56qjkxu)

2. **AI Workflow Generator Inspector**: [Click here](https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A8003&address=agent1qv99ug9kt6c5pz8m8u86u040rdhehhu7fj3mgdv790nrnhqdaqtk56qjkxu)

### Step 2: Connect Each Agent

For each agent:

1. You'll see an Agent Inspector UI with agent details
2. Click the **"Connect"** button
3. Select **"Mailbox"** option
4. Click **"Finish"**

The agent will now be registered as a "Local Agent" in your Agentverse dashboard and can communicate with other agents.

### Step 3: Verify Connection

1. Go to [Agentverse Dashboard](https://agentverse.ai/agents)
2. Click on **"Local Agents"** tab
3. You should see both agents listed:
   - `gesture_hub`
   - `ai_workflow_generator`

---

## 🧪 Testing Your Agents

### Test MCP Gesture Hub

```bash
# Health check
curl http://localhost:8002/health

# Get all gestures
curl http://localhost:8002/gestures

# Get context-specific gestures
curl http://localhost:8002/query/gestures-for-context/video_player
```

### Test AI Workflow Agent

```bash
# Health check
curl http://localhost:8003/health

# Get current window context
curl http://localhost:8003/context

# Activate AI Mode (will generate workflow for current context)
curl -X POST http://localhost:8003/activate \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user", "session_id": "test_session"}'
```

---

## 🔄 Managing Your Agents

### Check if agents are running

```bash
ps aux | grep -E "(mcp_gesture_hub|ai_mode_workflow_agent)"
```

### View logs

```bash
# MCP Gesture Hub logs
tail -f /tmp/mcp_hub.log

# AI Workflow Agent logs
tail -f /tmp/workflow_agent.log
```

### Restart agents

```bash
cd /Users/vanishaswabhanam/Documents/GitHub/Jesture/agents
./start_agents.sh
```

### Stop agents

Find the PIDs and kill them:
```bash
ps aux | grep -E "(mcp_gesture_hub|ai_mode_workflow_agent)" | grep -v grep | awk '{print $2}' | xargs kill -9
```

Or use the PIDs shown when you started them.

---

## 🏆 What You've Accomplished

✅ Configured Agentverse API key
✅ Updated Claude API key
✅ Enabled Mailbox mode on both agents
✅ Agents are running and attempting to connect to Agentverse
✅ Inspector URLs are available for connection

---

## 🎯 Next Steps for Hackathon Demo

1. **Connect agents via Inspector** (follow steps above)
2. **Verify they appear in Agentverse dashboard**
3. **Test the AI Mode workflow generation**:
   - Open different applications (Netflix, YouTube, PowerPoint)
   - Call `/activate` endpoint
   - See how Claude generates context-aware workflows
4. **Integrate with your frontend**:
   - Update frontend to call agent endpoints
   - Test gesture detection → AI workflow flow
5. **Prepare demo script** showing:
   - Agentverse dashboard with your agents
   - Context-aware workflow generation
   - Live gesture control

---

## 📚 Resources

- **Agentverse Dashboard**: https://agentverse.ai/agents
- **uAgents Docs**: https://fetch.ai/docs/guides/agents/
- **Your Agent Addresses**: Both use `agent1qv99ug9kt6c5pz8m8u86u040rdhehhu7fj3mgdv790nrnhqdaqtk56qjkxu`
- **Seed Phrase**: `jesture_gesture_hub_seed_2025_unique`

---

## 🐛 Troubleshooting

### "No external agent found with the provided name"

This error occurs when:
- Agents aren't running
- Mailbox connection hasn't been established via Inspector
- **Solution**: Click the Inspector URLs and connect via Mailbox

### Port already in use

```bash
# Kill processes on ports 8002 and 8003
lsof -ti:8002 | xargs kill -9
lsof -ti:8003 | xargs kill -9
```

### Agents not appearing in Agentverse

- Make sure you clicked "Connect" in the Inspector UI
- Check that agents are still running: `ps aux | grep python3`
- Verify logs: `tail -f /tmp/mcp_hub.log`

---

**🎉 Your agents are ready for Agentverse deployment!**

Just click the Inspector URLs above and complete the Mailbox connection.
