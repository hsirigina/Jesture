# MCP Gesture Hub Agent

**Catalog service providing queryable gesture and action definitions via Model Context Protocol (MCP)**

Part of the Jesture AI Agents system for CalHacks hackathon using Fetch.ai uAgents framework.

---

## Overview

The MCP Gesture Hub Agent is a centralized catalog service that stores and provides access to all available gestures and actions in the Jesture system. It uses the Fetch.ai uAgents framework combined with Flask HTTP endpoints to serve both agent-to-agent queries and HTTP requests.

### Key Features

- **Gesture Catalog**: 10 predefined hand gestures (swipes, palm, thumbs, point, peace, continuous_motion)
- **Action Catalog**: Keyboard actions (arrows, space, etc.) and mouse actions (click, scroll, cursor)
- **Context Recommendations**: Pre-configured gesture recommendations for different contexts (video_player, browse_page, presentation, general)
- **MCP Protocol**: Queryable via HTTP REST endpoints and uAgent message passing
- **Dual-Protocol**: Flask HTTP server + uAgent protocol running concurrently

---

## Architecture

```
┌─────────────────────────────────────────┐
│   MCP Gesture Hub Agent (Port 8002)    │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Flask HTTP Server               │ │
│  │   - GET /gestures                 │ │
│  │   - GET /actions                  │ │
│  │   - GET /contexts                 │ │
│  │   - GET /query/gestures-for-...  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   uAgent Protocol                 │ │
│  │   - Query handlers                │ │
│  │   - Inter-agent messaging         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Gesture Catalog JSON            │ │
│  │   - Gestures                      │ │
│  │   - Actions (keyboard + mouse)    │ │
│  │   - Context recommendations       │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

```bash
python3 -m pip install uagents flask flask-cors
```

### Files

- `agents/mcp_gesture_hub.py` - Main agent code
- `agents/gesture_catalog.json` - Gesture/action catalog data

---

## Running Locally

### Start the Agent

```bash
cd agents
python3 mcp_gesture_hub.py
```

### Expected Output

```
============================================================
🚀 MCP Gesture Hub Agent
============================================================
📦 Gestures loaded: 10
⌨️  Keyboard actions: 8
🖱️  Mouse actions: 6
📱 Contexts: 4

🌐 MCP HTTP Endpoints:
   GET  /health
   GET  /gestures
   GET  /gestures/<id>
   GET  /actions
   GET  /actions/keyboard
   GET  /actions/mouse
   GET  /contexts
   GET  /contexts/<type>
   GET  /query/gestures-for-context/<type>

🤖 uAgent Protocol:
   Address: Will be displayed after startup
   Port: 8002
============================================================

 * Serving Flask app 'mcp_gesture_hub'
 * Running on http://0.0.0.0:8002
```

---

## API Reference

### HTTP Endpoints

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "agent": "MCP Gesture Hub",
  "catalog_loaded": true,
  "total_gestures": 10,
  "total_actions": 14
}
```

#### GET `/gestures`
Get all available gestures.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "swipe_right",
      "name": "Swipe Right",
      "description": "Swipe hand from left to right",
      "type": "dynamic",
      "detection": "motion",
      "confidence_threshold": 0.8
    },
    ...
  ],
  "count": 10
}
```

#### GET `/gestures/<gesture_id>`
Get specific gesture by ID.

**Example:** `GET /gestures/palm`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "palm",
    "name": "Palm (Stop/Click)",
    "description": "Open palm facing camera",
    "type": "static",
    "detection": "pose",
    "confidence_threshold": 0.85
  }
}
```

#### GET `/actions`
Get all available actions (keyboard + mouse).

**Response:**
```json
{
  "success": true,
  "data": {
    "keyboard": [...],
    "mouse": [...]
  },
  "keyboard_count": 8,
  "mouse_count": 6
}
```

#### GET `/actions/keyboard`
Get keyboard actions only.

#### GET `/actions/mouse`
Get mouse actions only.

#### GET `/contexts`
Get all context recommendations.

**Response:**
```json
{
  "success": true,
  "data": {
    "video_player": {
      "description": "Video streaming platforms during playback",
      "recommended_gestures": ["swipe_right", "swipe_left", "palm", "thumbs_up", "thumbs_down"],
      "avoid_gestures": ["continuous_motion"],
      "platforms": ["Netflix", "YouTube", "Hulu", "Disney+", "Amazon Prime"]
    },
    ...
  },
  "count": 4
}
```

#### GET `/contexts/<context_type>`
Get recommendations for specific context.

**Example:** `GET /contexts/video_player`

**Response:**
```json
{
  "success": true,
  "data": {
    "description": "Video streaming platforms during playback",
    "recommended_gestures": ["swipe_right", "swipe_left", "palm", "thumbs_up", "thumbs_down"],
    "avoid_gestures": ["continuous_motion"],
    "platforms": ["Netflix", "YouTube", "Hulu"],
    "recommended_gesture_objects": [
      {
        "id": "swipe_right",
        "name": "Swipe Right",
        ...
      },
      ...
    ]
  }
}
```

#### GET `/query/gestures-for-context/<context_type>`
**Primary endpoint used by AI Workflow Agent** - Get recommended gestures with full details.

**Example:** `GET /query/gestures-for-context/browse_page`

**Response:**
```json
{
  "success": true,
  "context_type": "browse_page",
  "description": "Content browsing pages (homepages, catalogs)",
  "platforms": ["Netflix Homepage", "YouTube Browse"],
  "recommended_gestures": [
    {
      "id": "continuous_motion",
      "name": "Continuous Motion (Point Held)",
      "description": "Point gesture held for cursor control",
      "type": "continuous",
      "detection": "pose_hold",
      "confidence_threshold": 0.85
    },
    ...
  ],
  "avoid_gestures": [],
  "recommended_count": 6
}
```

---

## Deploying to Agentverse

### Step 1: Prepare Agent for Deployment

1. **Update seed phrase** for production:
   ```python
   gesture_hub_agent = Agent(
       name="gesture_hub",
       seed="YOUR_SECURE_SEED_PHRASE_HERE",  # Use unique, secure seed
       port=8002,
       endpoint=["http://YOUR_PUBLIC_IP:8002/submit"]
   )
   ```

2. **Set public endpoint** (if deploying to cloud):
   - Replace `127.0.0.1` with your public IP or domain
   - Ensure port 8002 is open in firewall

### Step 2: Create Agentverse Account

1. Go to [agentverse.ai](https://agentverse.ai)
2. Sign up with GitHub or email
3. Navigate to "My Agents" section

### Step 3: Deploy Agent

#### Option A: Deploy via Agentverse Dashboard

1. Click "Create New Agent"
2. Select "Import from Code"
3. Upload `mcp_gesture_hub.py` and `gesture_catalog.json`
4. Configure:
   - **Name**: `gesture-hub`
   - **Port**: `8002`
   - **Public**: Yes (if you want other agents to discover it)
5. Click "Deploy"

#### Option B: Deploy via CLI

```bash
# Install Agentverse CLI
pip install agentverse-cli

# Login
agentverse login

# Deploy
agentverse deploy agents/mcp_gesture_hub.py \
  --name gesture-hub \
  --public \
  --include agents/gesture_catalog.json
```

### Step 4: Verify Deployment

1. Check agent status in Agentverse dashboard
2. Copy agent address (format: `agent1q...`)
3. Test health endpoint:
   ```bash
   curl https://YOUR_AGENT_URL/health
   ```

### Step 5: Register Agent (Optional)

If you want other agents to discover this agent in the Agentverse marketplace:

```python
# Add to agent code
@gesture_hub_agent.on_event("startup")
async def register_to_almanac(ctx: Context):
    ctx.logger.info("Registering to Almanac...")
    # Registration happens automatically with uAgents
```

---

## Usage Examples

### Query from AI Workflow Agent

The AI Workflow Agent queries this hub when generating workflows:

```python
import requests

# Get gestures for video player context
response = requests.get('http://localhost:8002/query/gestures-for-context/video_player')
data = response.json()

recommended_gestures = data['recommended_gestures']
# Use gestures to generate workflow with Gemini
```

### Query via curl

```bash
# Get all gestures
curl http://localhost:8002/gestures

# Get specific gesture
curl http://localhost:8002/gestures/palm

# Get keyboard actions
curl http://localhost:8002/actions/keyboard

# Get context-specific gestures
curl http://localhost:8002/query/gestures-for-context/presentation
```

---

## Customization

### Adding New Gestures

Edit `gesture_catalog.json`:

```json
{
  "gestures": [
    {
      "id": "my_new_gesture",
      "name": "My New Gesture",
      "description": "Description of the gesture",
      "type": "static",  // or "dynamic", "continuous"
      "detection": "pose",  // or "motion", "pose_hold"
      "confidence_threshold": 0.85
    }
  ]
}
```

Restart the agent to load changes.

### Adding New Contexts

```json
{
  "contexts": {
    "my_context": {
      "description": "Description of context",
      "recommended_gestures": ["swipe_right", "palm"],
      "avoid_gestures": ["continuous_motion"],
      "platforms": ["App Name 1", "App Name 2"]
    }
  }
}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill existing process on port 8002
lsof -ti:8002 | xargs kill -9
```

### Catalog Not Loading

Check that `gesture_catalog.json` is in the same directory as `mcp_gesture_hub.py`:

```bash
ls agents/
# Should show both files
```

### Agent Not Responding

1. Check logs for errors
2. Verify Flask is running: `curl http://localhost:8002/health`
3. Ensure uAgent port 8002 is not blocked by firewall

---

## CalHacks Prize Requirements

This agent meets Fetch.ai prize requirements:

- ✅ Built with Fetch.ai uAgents framework
- ✅ Uses Almanac/Agentverse deployment
- ✅ Provides catalog service via MCP protocol
- ✅ Inter-agent communication ready
- ✅ Deployed to Agentverse (follow deployment steps above)

---

## Next Steps

1. Deploy to Agentverse using $50 credits
2. Note the deployed agent address
3. Update AI Workflow Agent with the agent address
4. Test inter-agent communication
5. Submit for CalHacks Fetch.ai prizes
