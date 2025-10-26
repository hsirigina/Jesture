# AI Mode Workflow Agent

**Context-aware gesture workflow generator using Gemini LLM + Fetch.ai uAgents**

Automatically creates optimal gesture-to-action mappings based on active application context. Deployed to Agentverse for CalHacks hackathon.

---

## Overview

The AI Mode Workflow Agent is an intelligent workflow generator that:

1. **Detects Context**: Identifies the currently active app/webpage (Netflix homepage, YouTube video player, PowerPoint, etc.)
2. **Queries MCP Hub**: Retrieves recommended gestures for that context from the MCP Gesture Hub Agent
3. **Uses Gemini AI**: Intelligently generates 3-7 optimal gesture-to-action mappings using Google's Gemini LLM
4. **Caches Workflows**: Stores generated workflows by context_key to avoid regeneration when returning to same page
5. **Executes Actions**: Processes gestures and executes corresponding keyboard/mouse actions via the backend server

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│  AI Mode Workflow Agent (Port 8003)                │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  Context Detection                           │ │
│  │  - macOS/Windows/Linux window detection     │ │
│  │  - App type classification                  │ │
│  │  - Page context identification              │ │
│  └──────────────────────────────────────────────┘ │
│              ↓                                      │
│  ┌──────────────────────────────────────────────┐ │
│  │  MCP Hub Query                               │ │
│  │  - GET /query/gestures-for-context/<type>   │ │
│  │  - Retrieve recommended gestures            │ │
│  │  - Retrieve available actions                │ │
│  └──────────────────────────────────────────────┘ │
│              ↓                                      │
│  ┌──────────────────────────────────────────────┐ │
│  │  Gemini Workflow Generation                  │ │
│  │  - Context-aware reasoning                   │ │
│  │  - 3-7 optimal gesture mappings              │ │
│  │  - Keyboard + Mouse actions                  │ │
│  │  - Fallback for errors                       │ │
│  └──────────────────────────────────────────────┘ │
│              ↓                                      │
│  ┌──────────────────────────────────────────────┐ │
│  │  Workflow Cache                              │ │
│  │  - Store by context_key                      │ │
│  │  - Reuse when returning to same page         │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

```bash
# Python packages
pip install uagents flask flask-cors google-generativeai python-dotenv

# Windows only
pip install pywin32

# Linux only (X11)
sudo apt-get install xdotool
```

### Environment Setup

Create `.env` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### Files

- `agents/ai_mode_workflow_agent.py` - Main agent code
- `agents/gesture_catalog.json` - Shared gesture catalog (used by MCP Hub)
- `.env` - Environment variables (Gemini API key)

---

## Running Locally

### Start the MCP Gesture Hub First

```bash
cd agents
python3 mcp_gesture_hub.py
# Should run on port 8002
```

### Start the AI Workflow Agent

```bash
cd agents
python3 ai_mode_workflow_agent.py
```

### Expected Output

```
============================================================
🚀 AI Mode Workflow Agent
============================================================
🤖 LLM: Gemini Pro
📡 MCP Hub: http://127.0.0.1:8002
💾 Workflow caching: Enabled

🌐 Flask Endpoints:
   POST /activate - Activate AI Mode & generate workflow
   POST /gesture - Process gesture with active workflow
   GET  /context - Get current window context
   GET  /workflow/current - Get active workflow
   GET  /health

============================================================

 * Serving Flask app 'ai_mode_workflow_agent'
 * Running on http://0.0.0.0:8003
```

---

## API Reference

### POST `/activate`

Activate AI Mode and generate workflow for current context.

**Request:**
```json
{
  "user_id": "demo-user",
  "session_id": "ai-session-1234567890"
}
```

**Response (New Workflow):**
```json
{
  "status": "active",
  "session_id": "ai-session-1234567890",
  "workflow": {
    "workflow_name": "Netflix Homepage",
    "context_type": "browse_page",
    "page_context": "Netflix Homepage",
    "context_key": "browse_page:Netflix Homepage",
    "generated_by": "ai",
    "generated_at": "2025-10-26T12:34:56.789Z",
    "mappings": [
      {
        "gesture_id": "continuous_motion",
        "action_type": "mouse",
        "action_id": "moveCursor",
        "reasoning": "Cursor control for browsing content"
      },
      {
        "gesture_id": "palm",
        "action_type": "mouse",
        "action_id": "click",
        "reasoning": "Click to select items"
      },
      {
        "gesture_id": "thumbs_up",
        "action_type": "mouse",
        "action_id": "scrollUp",
        "reasoning": "Scroll up through catalog"
      },
      {
        "gesture_id": "thumbs_down",
        "action_type": "mouse",
        "action_id": "scrollDown",
        "reasoning": "Scroll down through catalog"
      }
    ],
    "overall_reasoning": "Optimized for browsing Netflix homepage with cursor control and scrolling"
  },
  "cached": false,
  "message": "Generated new workflow for Netflix Homepage"
}
```

**Response (Cached Workflow):**
```json
{
  "status": "active",
  "workflow": { ... },
  "cached": true,
  "message": "Using cached workflow for Netflix Homepage"
}
```

### POST `/gesture`

Process gesture using active workflow.

**Request:**
```json
{
  "gesture": "palm",
  "confidence": 0.92,
  "user_id": "demo-user"
}
```

**Response (Success):**
```json
{
  "action": "mouse",
  "parameters": {
    "action": "click"
  },
  "reasoning": "Click to select items",
  "success": true
}
```

**Response (Not Mapped):**
```json
{
  "success": false,
  "message": "Gesture 'peace' not mapped in current workflow"
}
```
Status: 404

### GET `/context`

Get current window context.

**Response:**
```json
{
  "app": "Google Chrome - Netflix",
  "platform": "macOS",
  "context_type": "browse_page",
  "page_context": "Netflix Homepage"
}
```

### GET `/workflow/current`

Get currently active workflow.

**Query Params:**
- `user_id` (optional): User ID, defaults to "default"

**Response:**
```json
{
  "success": true,
  "workflow": {
    "workflow_name": "Netflix Homepage",
    "mappings": [...],
    ...
  }
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "agent": "AI Workflow Generator",
  "gemini_configured": true,
  "mcp_hub_connected": true,
  "cached_workflows": 3
}
```

---

## Workflow Generation Logic

### Context Detection

The agent detects context using OS-specific APIs:

- **macOS**: AppleScript to get frontmost application
- **Windows**: win32gui.GetForegroundWindow()
- **Linux**: xdotool getactivewindow

### Context Types

- `video_player`: Netflix/YouTube/Hulu video playback
- `browse_page`: Netflix/YouTube homepages, content browsing
- `presentation`: PowerPoint, Keynote, Google Slides
- `general`: Everything else

### Gemini Prompt

The agent sends this prompt to Gemini Pro:

```
You are a gesture control workflow designer. Generate an optimal gesture-to-action mapping for the following context.

**CONTEXT:**
- Application: Google Chrome - Netflix
- Context Type: browse_page
- Page Context: Netflix Homepage

**AVAILABLE GESTURES:**
[List of recommended gestures from MCP Hub]

**AVAILABLE ACTIONS:**
Keyboard: ["ArrowRight", "ArrowLeft", "Space", ...]
Mouse: ["moveCursor", "click", "scrollUp", ...]

**REQUIREMENTS:**
1. Map ONLY 3-7 gestures that make sense for this context
2. Use BOTH keyboard AND mouse actions appropriately
3. For browse/homepage contexts: ALWAYS include "continuous_motion" → "moveCursor" + "palm" → "click"
4. For video player contexts: NEVER use "continuous_motion", use swipes/static gestures only
5. Choose actions that match common use cases for this context

**RESPONSE FORMAT (JSON only):**
{
  "workflow_name": "Netflix Homepage",
  "mappings": [
    {
      "gesture_id": "continuous_motion",
      "action_type": "mouse",
      "action_id": "moveCursor",
      "reasoning": "why this mapping makes sense"
    },
    ...
  ],
  "overall_reasoning": "brief explanation"
}
```

### Fallback Workflows

If Gemini fails or is unavailable, the agent uses hardcoded fallback workflows:

- **Browse Page**: continuous_motion (cursor), palm (click), thumbs_up (scroll up), thumbs_down (scroll down)
- **Video Player**: swipe_right (skip forward), swipe_left (skip back), palm (play/pause), thumbs_up (volume up), thumbs_down (volume down)
- **Presentation**: swipe_right (next slide), swipe_left (previous slide), palm (advance), point (fullscreen)
- **General**: continuous_motion (cursor), palm (click), swipe_up (scroll up), swipe_down (scroll down)

### Workflow Caching

Workflows are cached by `context_key` (format: `context_type:page_context`):

Examples:
- `browse_page:Netflix Homepage`
- `video_player:YouTube Video Player`
- `presentation:PowerPoint Presentation`

When returning to a previously visited page, the cached workflow is reused instead of regenerating.

---

## Deploying to Agentverse

### Step 1: Prepare for Deployment

1. **Update seed phrase**:
   ```python
   workflow_agent = Agent(
       name="ai_workflow_generator",
       seed="YOUR_SECURE_SEED_PHRASE_HERE",
       port=8003,
       endpoint=["http://YOUR_PUBLIC_IP:8003/submit"]
   )
   ```

2. **Set MCP Hub URL to deployed agent**:
   ```python
   MCP_HUB_URL = "https://YOUR_AGENTVERSE_AGENT_URL"
   ```

3. **Configure Gemini API key** in Agentverse environment variables

### Step 2: Deploy to Agentverse

#### Option A: Via Dashboard

1. Go to [agentverse.ai](https://agentverse.ai)
2. Click "Create New Agent"
3. Select "Import from Code"
4. Upload `ai_mode_workflow_agent.py`
5. Configure environment variables:
   - `GEMINI_API_KEY`: Your Gemini API key
6. Set agent details:
   - **Name**: `ai-workflow-generator`
   - **Port**: `8003`
   - **Public**: Yes
7. Click "Deploy"

#### Option B: Via CLI

```bash
# Install Agentverse CLI
pip install agentverse-cli

# Login
agentverse login

# Deploy
agentverse deploy agents/ai_mode_workflow_agent.py \
  --name ai-workflow-generator \
  --public \
  --env GEMINI_API_KEY=your_key_here
```

### Step 3: Connect to MCP Hub

After both agents are deployed:

1. Get MCP Hub agent address from Agentverse
2. Update AI Workflow Agent's `MCP_HUB_URL` to point to deployed MCP Hub
3. Redeploy AI Workflow Agent

### Step 4: Verify Deployment

```bash
# Test health endpoint
curl https://YOUR_DEPLOYED_AGENT_URL/health

# Test context detection
curl https://YOUR_DEPLOYED_AGENT_URL/context

# Test activation
curl -X POST https://YOUR_DEPLOYED_AGENT_URL/activate \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","session_id":"test-123"}'
```

---

## Integration with Backend

The Jesture backend server ([server/server.js](../server/server.js)) integrates with this agent:

### Activation

```javascript
// Frontend clicks "Start AI Mode"
socketClient.emit('ai-mode:activate', { user_id: 'demo-user' })

// Server forwards to AI Workflow Agent
const response = await fetch('http://localhost:8003/activate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id, session_id })
})

// Agent generates workflow and returns it
const result = await response.json()
// result.workflow contains generated mappings

// Server stores workflow and notifies frontend
socket.emit('ai-mode:activated', {
  success: true,
  workflow: result.workflow,
  cached: result.cached
})
```

### Gesture Processing

```javascript
// Frontend detects gesture
socketClient.emit('ai-gesture:detected', {
  gesture: 'palm',
  confidence: 0.92
})

// Server queries AI Workflow Agent
const response = await fetch('http://localhost:8003/gesture', {
  method: 'POST',
  body: JSON.stringify({ gesture: 'palm', user_id: socketId })
})

// Agent returns action from active workflow
const aiDecision = await response.json()
// { action: 'mouse', parameters: { action: 'click' } }

// Server executes the action
if (aiDecision.action === 'mouse') {
  await mouse.click(Button.LEFT)
}
```

---

## Example Workflows

### Netflix Homepage

```json
{
  "workflow_name": "Netflix Homepage",
  "mappings": [
    { "gesture_id": "continuous_motion", "action_type": "mouse", "action_id": "moveCursor" },
    { "gesture_id": "palm", "action_type": "mouse", "action_id": "click" },
    { "gesture_id": "thumbs_up", "action_type": "mouse", "action_id": "scrollUp" },
    { "gesture_id": "thumbs_down", "action_type": "mouse", "action_id": "scrollDown" }
  ]
}
```

### Netflix Video Player

```json
{
  "workflow_name": "Netflix Video Player",
  "mappings": [
    { "gesture_id": "swipe_right", "action_type": "keyboard", "action_id": "ArrowRight" },
    { "gesture_id": "swipe_left", "action_type": "keyboard", "action_id": "ArrowLeft" },
    { "gesture_id": "palm", "action_type": "keyboard", "action_id": "Space" },
    { "gesture_id": "thumbs_up", "action_type": "keyboard", "action_id": "ArrowUp" },
    { "gesture_id": "thumbs_down", "action_type": "keyboard", "action_id": "ArrowDown" }
  ]
}
```

### PowerPoint Presentation

```json
{
  "workflow_name": "PowerPoint Presentation",
  "mappings": [
    { "gesture_id": "swipe_right", "action_type": "keyboard", "action_id": "ArrowRight" },
    { "gesture_id": "swipe_left", "action_type": "keyboard", "action_id": "ArrowLeft" },
    { "gesture_id": "palm", "action_type": "keyboard", "action_id": "Space" },
    { "gesture_id": "point", "action_type": "keyboard", "action_id": "f" }
  ]
}
```

---

## Troubleshooting

### Gemini API Errors

**Issue:** "GEMINI_API_KEY not found"

**Solution:**
```bash
# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# Or export environment variable
export GEMINI_API_KEY=your_key_here
```

### MCP Hub Connection Failed

**Issue:** "MCP Hub query failed, using fallback"

**Solution:**
1. Ensure MCP Gesture Hub is running on port 8002
2. Test: `curl http://localhost:8002/health`
3. Check firewall settings

### Context Detection Not Working

**macOS:**
```bash
# Grant Terminal/iTerm accessibility permissions
System Preferences → Security & Privacy → Privacy → Accessibility
```

**Linux:**
```bash
# Install xdotool
sudo apt-get install xdotool
```

**Windows:**
```bash
# Install pywin32
pip install pywin32
```

### Workflows Not Caching

Check that context_key is consistent:
```python
print(f"Context key: {context_info['context_type']}:{context_info['page_context']}")
```

---

## CalHacks Prize Requirements

This agent meets Fetch.ai + NVIDIA prize requirements:

- ✅ Built with Fetch.ai uAgents framework
- ✅ Uses Gemini LLM for intelligent reasoning
- ✅ Deployed to Agentverse (follow steps above)
- ✅ Agent-to-agent communication (queries MCP Hub)
- ✅ Context-aware workflow generation
- ✅ Uses MCP protocol for catalog queries
- ✅ Production-ready with caching and fallbacks

---

## Using Your $50 Agentverse Credits

1. Login to [agentverse.ai](https://agentverse.ai)
2. Go to "Billing" section
3. Apply promotional code if provided by CalHacks/Fetch.ai
4. Deploy both agents (MCP Hub + AI Workflow)
5. Monitor usage in dashboard
6. Credits cover:
   - Agent hosting
   - Compute for Gemini queries
   - Inter-agent messaging
   - Public endpoints

---

## Next Steps

1. ✅ Deploy MCP Gesture Hub to Agentverse
2. ✅ Deploy AI Workflow Agent to Agentverse
3. ✅ Update frontend to show AI-generated workflows with badges
4. ✅ Test workflow caching by switching between Netflix homepage and video player
5. ✅ Submit project for CalHacks Fetch.ai prizes
6. 🔜 Switch from Gemini to Claude (optional future enhancement)

---

## Support

- **Fetch.ai Docs**: [https://docs.fetch.ai](https://docs.fetch.ai)
- **Agentverse Guide**: [https://agentverse.ai/docs](https://agentverse.ai/docs)
- **Gemini API Docs**: [https://ai.google.dev/docs](https://ai.google.dev/docs)
