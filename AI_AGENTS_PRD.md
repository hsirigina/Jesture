# AI Agents Implementation PRD
## Fetch.ai uAgents + Gemini Integration for Gesture Control System

---

## Executive Summary

Extend the existing gesture control workflow builder with two autonomous AI agents built on Fetch.ai's uAgents framework. These agents use Gemini (swappable to Claude) to provide intelligent, context-aware gesture control and natural language workflow generation.

**Core Value:** Transform manual workflow configuration into intelligent, AI-driven automation.

---

## Agent Architecture Overview

```
┌─────────────────────────────────────────────────┐
│            React Frontend (Existing)             │
│  [AI Mode Button]  [Workflow Editor + AI Build] │
└────────────┬────────────────────────────────────┘
             │ HTTP/WebSocket
┌────────────▼─────────────────────────────────────┐
│         Node.js Backend (Existing)               │
│         + uAgents Server (NEW)                   │
└───┬──────────────────────────┬───────────────────┘
    │                          │
┌───▼────────────────┐    ┌────▼─────────────────┐
│ AI Auto-Mode Agent │    │ Workflow Builder     │
│  (uAgent #1)       │    │ Agent (uAgent #2)    │
└────────┬───────────┘    └──────────┬───────────┘
         │                           │
         └───────────┬───────────────┘
                     │
            ┌────────▼─────────┐
            │  Gemini API      │
            │ (→ Claude later) │
            └──────────────────┘
```

**Key Design Decisions:**
- ✅ Two independent agents (no orchestrator needed)
- ✅ Gemini for testing, Claude-ready architecture
- ✅ Agents communicate via uAgents messaging protocol
- ✅ Frontend triggers agents via existing backend APIs
- ✅ Optional Poke MCP server for bonus track

---

## Agent 1: AI Auto-Mode Agent

### Purpose
Provides context-aware gesture interpretation without manual workflow configuration. Analyzes user's current application/activity and dynamically maps gestures to appropriate actions.

### User Flow
```
1. User clicks "AI Mode" button on frontend
2. Frontend sends activation request to backend
3. Backend sends message to AI Auto-Mode Agent
4. Agent activates:
   - Turns on camera/gesture detection
   - Starts monitoring active window/context
5. User performs gesture (e.g., swipe_right)
6. Agent receives gesture event
7. Agent queries Gemini:
   - Current context: "User in PowerPoint, slide 5/20"
   - Gesture performed: "swipe_right"
   - Available actions: [next_slide, skip_section, etc.]
8. Gemini responds with contextual action + reasoning
9. Agent executes action via existing action executor
10. Visual feedback to user
```

### Technical Specification

#### uAgent Definition
```python
from uagents import Agent, Context, Model
from pydantic import BaseModel
import google.generativeai as genai

# Message Models
class ActivateAIMode(BaseModel):
    user_id: str
    session_id: str

class GestureDetected(BaseModel):
    gesture: str
    confidence: float
    timestamp: str
    user_context: dict  # {app: "PowerPoint", slide: "5/20", etc.}

class ExecuteAction(BaseModel):
    action: str
    parameters: dict
    reasoning: str

# Initialize Agent
ai_mode_agent = Agent(
    name="ai_auto_mode_agent",
    seed="your-unique-seed-phrase-here",
    port=8001,
    endpoint=["http://localhost:8001/submit"]
)

# Configure Gemini (swappable to Claude)
genai.configure(api_key="AIzaSyAmC0HEeRGEDk93Wo6LCJ9EyDVeCLUmwlU")
model = genai.GenerativeModel('gemini-pro')

# State management
active_sessions = {}

@ai_mode_agent.on_message(model=ActivateAIMode)
async def activate_ai_mode(ctx: Context, sender: str, msg: ActivateAIMode):
    """Handle AI Mode activation"""
    active_sessions[msg.user_id] = {
        "session_id": msg.session_id,
        "active": True,
        "context_history": []
    }

    ctx.logger.info(f"AI Mode activated for user {msg.user_id}")

    # Send confirmation back
    await ctx.send(sender, {"status": "active", "session_id": msg.session_id})

@ai_mode_agent.on_message(model=GestureDetected)
async def handle_gesture(ctx: Context, sender: str, msg: GestureDetected):
    """Process gesture with contextual AI interpretation"""

    # Build prompt for Gemini
    prompt = f"""
    You are a gesture control AI assistant. A user performed a gesture and you need to decide what action to execute.

    Gesture performed: {msg.gesture}
    Confidence: {msg.confidence}

    Current context:
    - Active application: {msg.user_context.get('app', 'Unknown')}
    - Additional context: {msg.user_context}

    Available actions:
    - next_slide: Move to next PowerPoint slide
    - previous_slide: Move to previous slide
    - play_pause: Toggle play/pause in media
    - volume_up: Increase volume
    - volume_down: Decrease volume
    - lights_on: Turn on smart lights
    - lights_off: Turn off smart lights
    - brightness_up: Increase light brightness

    Based on the context, what action should execute?

    Respond in JSON format:
    {{
        "action": "action_name",
        "parameters": {{}},
        "reasoning": "Brief explanation of why this action makes sense"
    }}
    """

    # Call Gemini
    response = model.generate_content(prompt)
    decision = parse_json_response(response.text)

    ctx.logger.info(f"AI Decision: {decision}")

    # Send action to executor
    action_msg = ExecuteAction(
        action=decision["action"],
        parameters=decision.get("parameters", {}),
        reasoning=decision["reasoning"]
    )

    # Forward to action executor (your existing backend)
    await ctx.send(sender, action_msg)

def parse_json_response(text: str) -> dict:
    """Extract JSON from Gemini response"""
    import json
    import re

    # Try to find JSON in response
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    # Fallback
    return {"action": "unknown", "parameters": {}, "reasoning": "Could not parse response"}

if __name__ == "__main__":
    ai_mode_agent.run()
```

#### Integration Points

**Frontend → Backend:**
```javascript
// Activate AI Mode
const activateAIMode = async () => {
  const response = await fetch('/api/ai-mode/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: currentUser.id,
      session_id: generateSessionId()
    })
  });

  const { status, session_id } = await response.json();
  if (status === 'active') {
    setAIModeEnabled(true);
  }
};

// Send gesture events
socket.emit('gesture_detected', {
  gesture: 'swipe_right',
  confidence: 0.95,
  user_context: {
    app: getActiveApplication(),
    additional_data: getAdditionalContext()
  }
});
```

**Backend → uAgent:**
```javascript
// In your existing Node.js backend
const axios = require('axios');

// Forward AI Mode activation to uAgent
app.post('/api/ai-mode/activate', async (req, res) => {
  const { user_id, session_id } = req.body;

  // Send to uAgent
  const agentResponse = await axios.post('http://localhost:8001/submit', {
    type: 'ActivateAIMode',
    user_id,
    session_id
  });

  res.json(agentResponse.data);
});

// Forward gestures to uAgent
io.on('connection', (socket) => {
  socket.on('gesture_detected', async (data) => {
    const agentResponse = await axios.post('http://localhost:8001/submit', {
      type: 'GestureDetected',
      gesture: data.gesture,
      confidence: data.confidence,
      timestamp: new Date().toISOString(),
      user_context: data.user_context
    });

    // Execute action from agent's decision
    const action = agentResponse.data;
    await executeAction(action.action, action.parameters);

    // Send feedback to frontend
    socket.emit('action_executed', {
      action: action.action,
      reasoning: action.reasoning
    });
  });
});
```

---

## Agent 2: Workflow Builder Agent

### Purpose
Converts natural language descriptions into complete workflow JSON configurations. Eliminates manual node placement and connection.

### User Flow
```
1. User is in workflow editor
2. User clicks "AI Build" button
3. Modal/textbox appears
4. User types: "I want to control my presentation - swipe right for next slide, swipe left for previous, thumbs up to start, thumbs down to end"
5. Frontend sends request to Workflow Builder Agent
6. Agent sends prompt to Gemini with:
   - User's natural language input
   - Available input nodes (gestures)
   - Available output nodes (actions)
   - Workflow JSON schema
7. Gemini generates complete workflow JSON
8. Agent validates JSON structure
9. Agent returns workflow to frontend
10. Frontend populates React Flow canvas with nodes + connections
11. User can edit/save workflow
```

### Technical Specification

#### uAgent Definition
```python
from uagents import Agent, Context, Model
from pydantic import BaseModel
import google.generativeai as genai
import json

# Message Models
class BuildWorkflowRequest(BaseModel):
    user_id: str
    natural_language_prompt: str
    available_gestures: list[str]
    available_actions: list[dict]

class WorkflowGenerated(BaseModel):
    workflow_json: dict
    validation_status: str
    suggestions: list[str]

# Initialize Agent
workflow_builder_agent = Agent(
    name="workflow_builder_agent",
    seed="your-unique-seed-phrase-2",
    port=8002,
    endpoint=["http://localhost:8002/submit"]
)

# Configure Gemini
genai.configure(api_key="AIzaSyAmC0HEeRGEDk93Wo6LCJ9EyDVeCLUmwlU")
model = genai.GenerativeModel('gemini-pro')

@workflow_builder_agent.on_message(model=BuildWorkflowRequest)
async def build_workflow(ctx: Context, sender: str, msg: BuildWorkflowRequest):
    """Generate workflow from natural language"""

    # Build comprehensive prompt
    prompt = f"""
    You are a workflow generator for a gesture control system. Convert the user's natural language description into a complete workflow JSON.

    User request: "{msg.natural_language_prompt}"

    Available gestures (input nodes):
    {', '.join(msg.available_gestures)}

    Available actions (output nodes):
    {json.dumps(msg.available_actions, indent=2)}

    Generate a workflow JSON with this exact structure:
    {{
      "name": "Workflow name based on user intent",
      "description": "Brief description",
      "nodes": [
        {{
          "id": "node_1",
          "type": "input",
          "gesture": "gesture_name",
          "position": {{"x": 100, "y": 100}}
        }},
        {{
          "id": "node_2",
          "type": "output",
          "action": "action_type",
          "config": {{"key": "value"}},
          "position": {{"x": 400, "y": 100}}
        }}
      ],
      "connections": [
        {{
          "from": "node_1",
          "to": "node_2"
        }}
      ]
    }}

    Rules:
    1. Each gesture mentioned should be an input node
    2. Each action mentioned should be an output node
    3. Connect gestures to their corresponding actions
    4. Use realistic position coordinates (space nodes vertically by 150px)
    5. Ensure all node IDs are unique
    6. Include appropriate config parameters for output nodes

    Respond ONLY with valid JSON, no additional text.
    """

    # Call Gemini
    response = model.generate_content(prompt)

    try:
        # Parse JSON response
        workflow_json = json.loads(response.text)

        # Validate workflow structure
        validation = validate_workflow(workflow_json)

        ctx.logger.info(f"Generated workflow: {workflow_json['name']}")

        # Send response
        result = WorkflowGenerated(
            workflow_json=workflow_json,
            validation_status=validation["status"],
            suggestions=validation.get("suggestions", [])
        )

        await ctx.send(sender, result)

    except json.JSONDecodeError as e:
        ctx.logger.error(f"Failed to parse JSON: {e}")

        # Send error response
        error_result = WorkflowGenerated(
            workflow_json={},
            validation_status="error",
            suggestions=[f"JSON parsing failed: {str(e)}"]
        )

        await ctx.send(sender, error_result)

def validate_workflow(workflow: dict) -> dict:
    """Validate workflow JSON structure"""
    errors = []
    suggestions = []

    # Check required fields
    if "nodes" not in workflow:
        errors.append("Missing 'nodes' field")
    if "connections" not in workflow:
        errors.append("Missing 'connections' field")

    # Validate nodes
    if "nodes" in workflow:
        node_ids = set()
        for node in workflow["nodes"]:
            if "id" not in node:
                errors.append(f"Node missing 'id' field")
            else:
                if node["id"] in node_ids:
                    errors.append(f"Duplicate node ID: {node['id']}")
                node_ids.add(node["id"])

            if "type" not in node:
                errors.append(f"Node {node.get('id', 'unknown')} missing 'type'")

    # Validate connections
    if "connections" in workflow and "nodes" in workflow:
        node_ids = {node["id"] for node in workflow["nodes"]}
        for conn in workflow["connections"]:
            if conn["from"] not in node_ids:
                errors.append(f"Connection references non-existent node: {conn['from']}")
            if conn["to"] not in node_ids:
                errors.append(f"Connection references non-existent node: {conn['to']}")

    if errors:
        return {"status": "invalid", "errors": errors}

    return {"status": "valid", "suggestions": suggestions}

if __name__ == "__main__":
    workflow_builder_agent.run()
```

#### Integration Points

**Frontend → Backend:**
```javascript
// Workflow Builder UI
const AIWorkflowBuilder = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const buildWorkflow = async () => {
    setLoading(true);

    const response = await fetch('/api/workflow/ai-build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        natural_language_prompt: prompt,
        available_gestures: ['swipe_left', 'swipe_right', 'thumbs_up', 'thumbs_down', 'palm', 'point', 'peace'],
        available_actions: [
          { type: 'keyboard', options: ['ArrowLeft', 'ArrowRight', 'Space', 'Escape'] },
          { type: 'lights', options: ['on', 'off', 'brightness', 'color'] },
          { type: 'media', options: ['play', 'pause', 'volume_up', 'volume_down'] }
        ]
      })
    });

    const { workflow_json, validation_status } = await response.json();

    if (validation_status === 'valid') {
      // Populate React Flow canvas
      loadWorkflowToCanvas(workflow_json);
    } else {
      alert('Workflow generation failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="ai-builder">
      <textarea
        placeholder="Describe your workflow in natural language..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={buildWorkflow} disabled={loading}>
        {loading ? 'Generating...' : 'Build Workflow'}
      </button>
    </div>
  );
};
```

**Backend → uAgent:**
```javascript
app.post('/api/workflow/ai-build', async (req, res) => {
  const { user_id, natural_language_prompt, available_gestures, available_actions } = req.body;

  // Send to Workflow Builder Agent
  const agentResponse = await axios.post('http://localhost:8002/submit', {
    type: 'BuildWorkflowRequest',
    user_id,
    natural_language_prompt,
    available_gestures,
    available_actions
  });

  res.json(agentResponse.data);
});
```

---

## Bonus: Poke MCP Server

### Purpose
Win the "Best MCP Automation" prize by allowing remote gesture system activation via Poke (iMessage AI assistant).

### User Flow
```
1. User texts Poke: "Start my presentation mode"
2. Poke calls your MCP server
3. MCP server activates:
   - Gesture detection
   - Loads "presentation" workflow
   - Dims smart lights
4. Poke responds: "✅ Presentation mode active"
```

### Technical Specification

```python
# poke_mcp_server.py
from fastmcp import FastMCP
import requests

mcp = FastMCP("Gesture Control MCP")

# Store Poke API credentials
POKE_API_KEY = "your-poke-api-key"
GESTURE_BACKEND_URL = "http://localhost:3000"

@mcp.tool
def activate_presentation_mode() -> str:
    """Activate gesture-controlled presentation mode with smart lighting"""

    # Activate AI Mode
    requests.post(f"{GESTURE_BACKEND_URL}/api/ai-mode/activate", json={
        "user_id": "poke_user",
        "session_id": "poke_session"
    })

    # Load presentation workflow
    requests.post(f"{GESTURE_BACKEND_URL}/api/workflow/activate", json={
        "workflow_name": "Presentation Controller"
    })

    # Dim lights
    requests.post(f"{GESTURE_BACKEND_URL}/api/lights/dim", json={
        "brightness": 30
    })

    return "✅ Presentation mode activated! Gesture control is now active. Swipe right for next slide, swipe left for previous."

@mcp.tool
def deactivate_gesture_control() -> str:
    """Turn off gesture control and restore normal lighting"""

    requests.post(f"{GESTURE_BACKEND_URL}/api/ai-mode/deactivate")
    requests.post(f"{GESTURE_BACKEND_URL}/api/lights/restore")

    return "Gesture control deactivated. Lights restored."

@mcp.tool
def check_gesture_status() -> str:
    """Check if gesture control is currently active"""

    response = requests.get(f"{GESTURE_BACKEND_URL}/api/ai-mode/status")
    status = response.json()

    if status["active"]:
        return f"Gesture control is ACTIVE. Current mode: {status['mode']}"
    else:
        return "Gesture control is currently OFF."

if __name__ == "__main__":
    mcp.run()
```

### Poke Setup
```bash
# Deploy MCP server to Render (or run locally with ngrok)
git clone https://github.com/InteractionCo/mcp-server-template
cd mcp-server-template

# Replace src code with poke_mcp_server.py
# Deploy to Render

# Add to Poke settings:
# Go to poke.com/settings/connections/integrations/new
# Add MCP server URL: https://your-service.onrender.com/mcp
```

---

## Setup & Installation

### Prerequisites
```bash
# Python 3.10+
python --version

# Node.js 18+
node --version
```

### Install uAgents Framework
```bash
pip install uagents
pip install google-generativeai
pip install pydantic
```

### Project Structure
```
Jesture/
├── frontend/          (existing React app)
├── server/            (existing Node.js backend)
├── agents/            (NEW)
│   ├── ai_mode_agent.py
│   ├── workflow_builder_agent.py
│   ├── poke_mcp_server.py
│   └── requirements.txt
└── AI_AGENTS_PRD.md   (this file)
```

### Running the Agents

**Terminal 1: AI Auto-Mode Agent**
```bash
cd agents
python ai_mode_agent.py
```

**Terminal 2: Workflow Builder Agent**
```bash
cd agents
python workflow_builder_agent.py
```

**Terminal 3: Existing Backend**
```bash
cd server
npm start
```

**Terminal 4: Frontend**
```bash
cd frontend
npm run dev
```

---

## Swapping Gemini → Claude

When ready to switch to Claude API:

```python
# Replace Gemini import
# from google.generativeai import genai
from anthropic import Anthropic

# Replace initialization
# genai.configure(api_key="...")
# model = genai.GenerativeModel('gemini-pro')
client = Anthropic(api_key="your-claude-api-key")

# Replace generation call
# response = model.generate_content(prompt)
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=2048,
    messages=[{"role": "user", "content": prompt}]
)

# Extract response text
# decision = parse_json_response(response.text)
decision = parse_json_response(response.content[0].text)
```

---

## Implementation Timeline

### Phase 1: Core Setup (2 hours)
- [ ] Install uAgents framework
- [ ] Create agents/ directory
- [ ] Set up basic agent skeletons
- [ ] Test agent communication

### Phase 2: AI Auto-Mode Agent (4 hours)
- [ ] Implement ActivateAIMode message handler
- [ ] Implement GestureDetected message handler
- [ ] Integrate Gemini API
- [ ] Build context extraction logic
- [ ] Test with frontend button

### Phase 3: Workflow Builder Agent (3 hours)
- [ ] Implement BuildWorkflowRequest handler
- [ ] Build comprehensive Gemini prompt
- [ ] Implement JSON validation
- [ ] Test with sample natural language inputs
- [ ] Integrate with React Flow canvas

### Phase 4: Poke MCP (Optional - 3 hours)
- [ ] Set up FastMCP server
- [ ] Implement 3 MCP tools
- [ ] Deploy to Render
- [ ] Connect to Poke settings
- [ ] Test with iMessage

### Phase 5: Testing & Demo Prep (2 hours)
- [ ] End-to-end testing
- [ ] Prepare demo script
- [ ] Create backup workflow JSONs
- [ ] Document edge cases

**Total Time: 12-14 hours**

---

## Demo Script for Judges

### Opening (30 seconds)
"We built an AI-powered gesture control system using **Fetch.ai's multi-agent architecture**. Instead of manually configuring gestures, our system uses **autonomous AI agents** to intelligently interpret your intentions."

### Demo 1: AI Auto-Mode (1 minute)
1. Click "AI Mode" button
2. Open PowerPoint
3. Perform swipe right gesture
4. **Point out**: "The AI agent analyzed I'm in PowerPoint and contextually decided to advance the slide"
5. Switch to YouTube
6. Perform same gesture
7. **Point out**: "Same gesture, but the agent recognized I'm watching a video and skipped ahead instead"

**Buzzwords**: ✅ Fetch.ai uAgents ✅ Contextual AI ✅ Autonomous agents

### Demo 2: Workflow Builder (1 minute)
1. Open workflow editor
2. Click "AI Build"
3. Type: "Control my presentation with gestures"
4. Show generated workflow appearing on canvas
5. **Point out**: "The AI agent converted natural language into a complete workflow - no dragging, no manual connections"

**Buzzwords**: ✅ Multi-agent system ✅ Natural language processing ✅ Gemini integration (Claude-ready)

### Demo 3 (Optional): Poke MCP (30 seconds)
1. Show iMessage on phone
2. Text Poke: "Start presentation mode"
3. Show gesture system activating on computer
4. Lights dimming automatically

**Buzzwords**: ✅ MCP integration ✅ Proactive AI ✅ Multi-device orchestration

### Closing (30 seconds)
"This demonstrates **Fetch.ai's vision of autonomous agents** - our two uAgents coordinate to provide intelligent automation without user configuration. The architecture is **Claude-ready via MCP** and extensible to additional agents."

**Sponsor Callouts:**
- Fetch.ai: Multi-agent orchestration with uAgents
- Anthropic: Claude MCP integration (Gemini for now)
- Interaction/Poke: Remote automation via MCP tools

---

## Success Metrics

- ✅ Two functional uAgents deployed
- ✅ AI Mode accurately interprets 3+ different contexts
- ✅ Workflow Builder generates valid JSON from natural language
- ✅ End-to-end latency < 2 seconds
- ✅ Poke MCP successfully triggers remote activation
- ✅ Ready to swap Gemini → Claude with <10 lines of code changes

---

## Edge Cases & Fallbacks

**If Gemini API fails:**
- Fallback to hardcoded decision tree
- Log failure and retry

**If workflow generation is invalid:**
- Show validation errors to user
- Suggest corrections
- Allow manual editing

**If agents can't communicate:**
- Degrade to direct HTTP calls
- Still functional, just less "agentic"

**Demo day connectivity issues:**
- Pre-record video demos as backup
- Have sample workflow JSONs ready
- Run everything locally (no internet needed)

---

## Questions & Clarifications

**Q: Do agents need to be deployed to Agentverse?**
A: No, for hackathon they can run locally. Agentverse deployment is a future enhancement.

**Q: Can we use this without Fetch.ai?**
A: Yes, but you lose the "multi-agent orchestration" talking point that judges love.

**Q: What if we run out of Gemini credits?**
A: Implement rate limiting + caching. Worst case, use hardcoded responses for demo.

---

**Ready to implement. Questions?**
