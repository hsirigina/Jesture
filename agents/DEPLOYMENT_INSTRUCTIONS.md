# Deploying Jesture Agents to Agentverse

## Current Status

Your agents are currently running **locally** and need to be deployed to Agentverse for the hackathon demo.

## Option 1: Run Agents Locally (Easiest for Demo)

Since your agents use Flask HTTP endpoints (not just uAgents messaging), the simplest approach for the hackathon is to:

1. **Keep agents running locally** on your machine
2. **Use ngrok** to expose them to the internet for demo
3. **Update the Agentverse dashboard** to point to your ngrok URLs

### Steps:

```bash
# Terminal 1: Start MCP Gesture Hub
cd agents
export $(cat ../.env | grep -v '^#' | xargs)
python3 mcp_gesture_hub.py

# Terminal 2: Start AI Workflow Agent
cd agents
export $(cat ../.env | grep -v '^#' | xargs)
python3 ai_mode_workflow_agent.py

# Terminal 3: Expose with ngrok (if needed for external access)
ngrok http 8002  # For MCP Hub
ngrok http 8003  # For Workflow Agent (run in separate terminal)
```

## Option 2: Deploy to Cloud Service (Better for Production)

Your agents are full Flask+uAgents hybrids, so they need to be deployed as web services.

### Deploy to Render.com (Free tier)

1. Create a `render.yaml` in your repo
2. Push to GitHub
3. Connect Render to your repo
4. Agents will auto-deploy

### Deploy to Railway.app (Free tier)

1. Connect Railway to GitHub repo
2. Add services for each agent
3. Set environment variables
4. Deploy

## Option 3: Register Agents to Agentverse (Advanced)

For pure uAgent-to-uAgent communication (not HTTP):

```python
from uagents import Agent

# Your agent needs to be modified to use Agentverse mailbox
agent = Agent(
    name="gesture-hub",
    seed=os.getenv("AGENT_SEED_PHRASE"),
    mailbox=True,  # Enable Agentverse mailbox
    mailbox_key=os.getenv("AGENTVERSE_KEY")
)
```

Then deploy the code to Agentverse dashboard directly.

## Recommended Approach for CalHacks Demo

**Use Option 1** (Local + ngrok if needed)

Why:
- Your agents work perfectly locally
- Flask endpoints need to be accessible
- Fastest to get working
- You can demo everything offline if needed

## Testing Your Current Setup

```bash
# Check if agents are responding
curl http://localhost:8002/health
curl http://localhost:8003/health

# Test gesture query
curl http://localhost:8002/query/gestures-for-context/video_player

# Test AI workflow generation
curl -X POST http://localhost:8003/activate \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "session_id": "test123"}'
```

## What's Already Configured

✅ Environment variables set in `.env`
✅ Claude API key configured
✅ Agentverse key ready
✅ Both agent seeds configured

## Next Steps

1. **Start both agents locally**
2. **Test the endpoints** with curl
3. **Integrate with your frontend**
4. **Demo at hackathon**
5. **(Optional)** Deploy to cloud for persistence

---

**For this hackathon, local deployment is perfectly fine!** The judges care about the functionality and AI integration, not whether it's cloud-hosted.
