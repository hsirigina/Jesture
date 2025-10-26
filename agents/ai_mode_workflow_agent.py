"""
AI Mode Workflow Agent
Context-aware gesture workflow generator using Claude (Anthropic)
Queries MCP Gesture Hub for available gestures
Generates and caches workflows by context
Deployed to Agentverse
"""

from uagents import Agent, Context, Model
from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import json
import os
from dotenv import load_dotenv
import subprocess
import platform
import requests
from threading import Thread
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure Claude (Anthropic)
claude_client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

# Initialize uAgent with environment variables for Agentverse
AGENT_SEED = os.getenv("AGENT_SEED_PHRASE", "workflow_agent_seed_phrase_67890")

workflow_agent = Agent(
    name="ai_workflow_generator",
    seed=AGENT_SEED,
    port=8003,
    endpoint=["http://127.0.0.1:8003/submit"]
)

# MCP Gesture Hub endpoint
MCP_HUB_URL = "http://127.0.0.1:8002"

# Workflow cache: {context_key: workflow_data}
workflow_cache = {}

# Active sessions
active_sessions = {}

# ============================================
# CONTEXT DETECTION
# ============================================

def get_active_window_context():
    """Get currently active application/window context"""
    system = platform.system()

    try:
        if system == "Darwin":  # macOS
            script = '''
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
                return frontApp
            end tell
            '''
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True,
                text=True
            )
            app_name = result.stdout.strip()

            return {
                "app": app_name,
                "platform": "macOS",
                "context_type": detect_context_type(app_name),
                "page_context": detect_page_context(app_name)
            }

        elif system == "Windows":
            import win32gui
            window = win32gui.GetForegroundWindow()
            app_name = win32gui.GetWindowText(window)
            return {
                "app": app_name,
                "platform": "Windows",
                "context_type": detect_context_type(app_name),
                "page_context": detect_page_context(app_name)
            }

        elif system == "Linux":
            result = subprocess.run(
                ["xdotool", "getactivewindow", "getwindowname"],
                capture_output=True,
                text=True
            )
            app_name = result.stdout.strip()
            return {
                "app": app_name,
                "platform": "Linux",
                "context_type": detect_context_type(app_name),
                "page_context": detect_page_context(app_name)
            }

    except Exception as e:
        print(f"Error getting active window: {e}")
        return {
            "app": "Unknown",
            "platform": system,
            "context_type": "general",
            "page_context": "unknown"
        }

def detect_context_type(app_name):
    """Map app to MCP context type"""
    app_lower = app_name.lower()

    # Video platforms
    if any(video in app_lower for video in ["netflix", "youtube", "hulu", "disney", "prime video"]):
        # Check if on homepage or video player
        if "watch" in app_lower or "playing" in app_lower:
            return "video_player"
        else:
            return "browse_page"

    # Presentation
    elif any(present in app_lower for present in ["powerpoint", "keynote", "slides"]):
        return "presentation"

    # Music
    elif any(music in app_lower for music in ["spotify", "music", "itunes"]):
        return "video_player"  # Similar controls to video

    # General browsing
    elif any(browser in app_lower for browser in ["chrome", "firefox", "safari", "edge"]):
        return "browse_page"

    else:
        return "general"

def detect_page_context(app_name):
    """Detect specific page context for workflow naming"""
    app_lower = app_name.lower()

    # Netflix
    if "netflix" in app_lower:
        if "watch" in app_lower or "playing" in app_lower:
            return "Netflix Video Player"
        else:
            return "Netflix Homepage"

    # YouTube
    elif "youtube" in app_lower:
        if "watch" in app_lower:
            return "YouTube Video Player"
        else:
            return "YouTube Browse"

    # Hulu
    elif "hulu" in app_lower:
        if "watch" in app_lower:
            return "Hulu Video Player"
        else:
            return "Hulu Browse"

    # Presentation
    elif "powerpoint" in app_lower:
        return "PowerPoint Presentation"
    elif "keynote" in app_lower:
        return "Keynote Presentation"
    elif "slides" in app_lower:
        return "Google Slides Presentation"

    # Spotify
    elif "spotify" in app_lower:
        return "Spotify Player"

    # Generic browser
    elif any(browser in app_lower for browser in ["chrome", "firefox", "safari", "edge"]):
        return "Web Browser"

    else:
        return app_name

def create_context_key(context_info):
    """Create unique key for caching workflows"""
    return f"{context_info['context_type']}:{context_info['page_context']}"

# ============================================
# MCP GESTURE HUB QUERIES
# ============================================

def query_mcp_hub(endpoint):
    """Query MCP Gesture Hub Agent"""
    try:
        response = requests.get(f"{MCP_HUB_URL}{endpoint}", timeout=5)
        if response.ok:
            return response.json()
        else:
            print(f"❌ MCP Hub error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Failed to query MCP Hub: {e}")
        return None

def get_gestures_for_context(context_type):
    """Get recommended gestures for context from MCP Hub"""
    result = query_mcp_hub(f"/query/gestures-for-context/{context_type}")
    if result and result.get('success'):
        return result
    return None

def get_all_actions():
    """Get all available actions from MCP Hub"""
    result = query_mcp_hub("/actions")
    if result and result.get('success'):
        return result.get('data', {})
    return {"keyboard": [], "mouse": []}

# ============================================
# CLAUDE WORKFLOW GENERATION
# ============================================

def generate_workflow_with_claude(context_info, available_gestures, available_actions):
    """Use Claude to intelligently generate workflow"""

    prompt = f"""You are a gesture control workflow designer. Generate an optimal gesture-to-action mapping for the following context.

**CONTEXT:**
- Application: {context_info['app']}
- Context Type: {context_info['context_type']}
- Page Context: {context_info['page_context']}

**AVAILABLE GESTURES:**
{json.dumps(available_gestures, indent=2)}

**AVAILABLE ACTIONS:**
Keyboard: {json.dumps([a['id'] for a in available_actions.get('keyboard', [])], indent=2)}
Mouse: {json.dumps([a['id'] for a in available_actions.get('mouse', [])], indent=2)}

**REQUIREMENTS:**
1. Map ONLY 3-7 gestures that make sense for this context
2. Use BOTH keyboard AND mouse actions appropriately
3. For browse/homepage contexts: ALWAYS include "continuous_motion" → "moveCursor" + "palm" → "click"
4. For video player contexts: NEVER use "continuous_motion", use swipes/static gestures only
5. Choose actions that match common use cases for this context
6. Consider the recommended gestures from the context data

**RESPONSE FORMAT (JSON only, no markdown):**
{{
  "workflow_name": "descriptive name like 'Netflix Homepage' or 'YouTube Video Player'",
  "mappings": [
    {{
      "gesture_id": "continuous_motion",
      "action_type": "mouse",
      "action_id": "moveCursor",
      "reasoning": "why this mapping makes sense"
    }},
    {{
      "gesture_id": "palm",
      "action_type": "mouse",
      "action_id": "click",
      "reasoning": "why this mapping makes sense"
    }}
  ],
  "overall_reasoning": "brief explanation of workflow design choices"
}}

Generate the workflow now. Return ONLY the JSON, no markdown formatting."""

    try:
        response = claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = response.content[0].text.strip()

        # Parse JSON from response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            workflow_data = json.loads(json_match.group())
            return workflow_data
        else:
            print(f"❌ Could not parse Claude response")
            return None

    except Exception as e:
        print(f"❌ Claude generation error: {e}")
        return None

def create_fallback_workflow(context_info, available_gestures):
    """Fallback workflow if Claude fails"""
    context_type = context_info['context_type']
    page_context = context_info['page_context']

    # Browse/homepage contexts
    if context_type == "browse_page":
        return {
            "workflow_name": page_context,
            "mappings": [
                {"gesture_id": "continuous_motion", "action_type": "mouse", "action_id": "moveCursor", "reasoning": "Cursor control for browsing"},
                {"gesture_id": "palm", "action_type": "mouse", "action_id": "click", "reasoning": "Click to select items"},
                {"gesture_id": "thumbs_up", "action_type": "mouse", "action_id": "scrollUp", "reasoning": "Scroll up through content"},
                {"gesture_id": "thumbs_down", "action_type": "mouse", "action_id": "scrollDown", "reasoning": "Scroll down through content"}
            ],
            "overall_reasoning": "Fallback workflow for browsing context"
        }

    # Video player contexts
    elif context_type == "video_player":
        return {
            "workflow_name": page_context,
            "mappings": [
                {"gesture_id": "swipe_right", "action_type": "keyboard", "action_id": "ArrowRight", "reasoning": "Skip forward"},
                {"gesture_id": "swipe_left", "action_type": "keyboard", "action_id": "ArrowLeft", "reasoning": "Skip backward"},
                {"gesture_id": "palm", "action_type": "keyboard", "action_id": "Space", "reasoning": "Play/Pause"},
                {"gesture_id": "thumbs_up", "action_type": "keyboard", "action_id": "ArrowUp", "reasoning": "Volume up"},
                {"gesture_id": "thumbs_down", "action_type": "keyboard", "action_id": "ArrowDown", "reasoning": "Volume down"}
            ],
            "overall_reasoning": "Fallback workflow for video playback"
        }

    # Presentation contexts
    elif context_type == "presentation":
        return {
            "workflow_name": page_context,
            "mappings": [
                {"gesture_id": "swipe_right", "action_type": "keyboard", "action_id": "ArrowRight", "reasoning": "Next slide"},
                {"gesture_id": "swipe_left", "action_type": "keyboard", "action_id": "ArrowLeft", "reasoning": "Previous slide"},
                {"gesture_id": "palm", "action_type": "keyboard", "action_id": "Space", "reasoning": "Advance"},
                {"gesture_id": "point", "action_type": "keyboard", "action_id": "f", "reasoning": "Toggle fullscreen"}
            ],
            "overall_reasoning": "Fallback workflow for presentations"
        }

    # General
    else:
        return {
            "workflow_name": "General Control",
            "mappings": [
                {"gesture_id": "continuous_motion", "action_type": "mouse", "action_id": "moveCursor", "reasoning": "General cursor control"},
                {"gesture_id": "palm", "action_type": "mouse", "action_id": "click", "reasoning": "General click"},
                {"gesture_id": "swipe_up", "action_type": "mouse", "action_id": "scrollUp", "reasoning": "Scroll up"},
                {"gesture_id": "swipe_down", "action_type": "mouse", "action_id": "scrollDown", "reasoning": "Scroll down"}
            ],
            "overall_reasoning": "Fallback general workflow"
        }

# ============================================
# FLASK ENDPOINTS
# ============================================

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        "status": "ok",
        "agent": "AI Workflow Generator",
        "claude_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "mcp_hub_connected": query_mcp_hub("/health") is not None,
        "cached_workflows": len(workflow_cache)
    })

@app.route('/activate', methods=['POST'])
def activate_ai_mode():
    """Activate AI Mode and generate workflow for current context"""
    data = request.json
    user_id = data.get('user_id', 'default')
    session_id = data.get('session_id', 'default')

    print(f"✅ AI Mode activated for user {user_id}")

    # Get current context
    context_info = get_active_window_context()
    context_key = create_context_key(context_info)

    print(f"📱 Context: {context_info['page_context']} ({context_info['context_type']})")

    # Check cache first
    if context_key in workflow_cache:
        print(f"💾 Using cached workflow for {context_key}")
        cached_workflow = workflow_cache[context_key]

        active_sessions[user_id] = {
            "session_id": session_id,
            "active": True,
            "context_key": context_key,
            "workflow": cached_workflow
        }

        return jsonify({
            "status": "active",
            "session_id": session_id,
            "workflow": cached_workflow,
            "cached": True,
            "message": f"Using cached workflow for {context_info['page_context']}"
        })

    # Generate new workflow
    print(f"🧠 Generating new workflow for {context_key}...")

    # Query MCP Hub for gestures
    gesture_data = get_gestures_for_context(context_info['context_type'])
    if not gesture_data:
        print("⚠️  MCP Hub query failed, using fallback")
        available_gestures = []
    else:
        available_gestures = gesture_data.get('recommended_gestures', [])

    # Query MCP Hub for actions
    available_actions = get_all_actions()

    # Generate with Claude
    workflow = generate_workflow_with_claude(context_info, available_gestures, available_actions)

    # Fallback if Claude fails
    if not workflow:
        print("⚠️  Claude generation failed, using fallback workflow")
        workflow = create_fallback_workflow(context_info, available_gestures)

    # Add metadata
    workflow['context_type'] = context_info['context_type']
    workflow['page_context'] = context_info['page_context']
    workflow['generated_at'] = datetime.utcnow().isoformat()
    workflow['generated_by'] = 'ai'
    workflow['context_key'] = context_key

    # Cache workflow
    workflow_cache[context_key] = workflow
    print(f"✅ Workflow generated and cached: {workflow['workflow_name']}")

    # Store in session
    active_sessions[user_id] = {
        "session_id": session_id,
        "active": True,
        "context_key": context_key,
        "workflow": workflow
    }

    return jsonify({
        "status": "active",
        "session_id": session_id,
        "workflow": workflow,
        "cached": False,
        "message": f"Generated new workflow for {context_info['page_context']}"
    })

@app.route('/gesture', methods=['POST'])
def handle_gesture():
    """Process gesture using active workflow"""
    data = request.json
    gesture = data.get('gesture')
    confidence = data.get('confidence', 1.0)
    user_id = data.get('user_id', 'default')

    print(f"🤚 Gesture: {gesture} (confidence: {confidence})")

    # Get active session
    session = active_sessions.get(user_id)
    if not session or not session.get('active'):
        return jsonify({
            "success": False,
            "message": "No active AI Mode session"
        }), 400

    # Get workflow
    workflow = session.get('workflow')
    if not workflow:
        return jsonify({
            "success": False,
            "message": "No workflow available"
        }), 400

    # Find mapping for gesture
    mappings = workflow.get('mappings', [])
    mapping = next((m for m in mappings if m['gesture_id'] == gesture), None)

    if not mapping:
        print(f"⚠️  No mapping found for gesture '{gesture}' in current workflow")
        return jsonify({
            "success": False,
            "message": f"Gesture '{gesture}' not mapped in current workflow"
        }), 404

    # Return action
    result = {
        "action": mapping['action_type'],
        "parameters": {"key": mapping['action_id']} if mapping['action_type'] == 'keyboard' else {"action": mapping['action_id']},
        "reasoning": mapping.get('reasoning', ''),
        "success": True
    }

    print(f"📤 Action: {mapping['action_type']} → {mapping['action_id']}")
    return jsonify(result)

@app.route('/context', methods=['GET'])
def get_context():
    """Get current window context"""
    context = get_active_window_context()
    return jsonify(context)

@app.route('/workflow/current', methods=['GET'])
def get_current_workflow():
    """Get current active workflow"""
    user_id = request.args.get('user_id', 'default')
    session = active_sessions.get(user_id)

    if session and session.get('workflow'):
        return jsonify({
            "success": True,
            "workflow": session['workflow']
        })
    else:
        return jsonify({
            "success": False,
            "message": "No active workflow"
        }), 404

@app.route('/workflow/cache', methods=['GET'])
def get_workflow_cache():
    """Get all cached workflows (for debugging)"""
    return jsonify({
        "success": True,
        "cache": workflow_cache,
        "count": len(workflow_cache)
    })

# ============================================
# uAGENT HANDLERS
# ============================================

@workflow_agent.on_event("startup")
async def startup(ctx: Context):
    """Agent startup"""
    ctx.logger.info("🚀 AI Workflow Generator Agent started")
    ctx.logger.info(f"🤖 Using Claude (Anthropic) for workflow generation")
    ctx.logger.info(f"📡 MCP Hub: {MCP_HUB_URL}")
    ctx.logger.info(f"🌐 Flask API: http://127.0.0.1:8003")

# ============================================
# RUN BOTH FLASK + uAGENT
# ============================================

def run_flask():
    """Run Flask server in separate thread"""
    app.run(host='0.0.0.0', port=8003, debug=False, use_reloader=False)

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 AI Mode Workflow Agent")
    print("=" * 60)
    print(f"🤖 LLM: Claude 3.5 Sonnet (Anthropic)")
    print(f"📡 MCP Hub: {MCP_HUB_URL}")
    print(f"💾 Workflow caching: Enabled")
    print()
    print("🌐 Flask Endpoints:")
    print("   POST /activate - Activate AI Mode & generate workflow")
    print("   POST /gesture - Process gesture with active workflow")
    print("   GET  /context - Get current window context")
    print("   GET  /workflow/current - Get active workflow")
    print("   GET  /health")
    print()
    print("=" * 60)
    print()

    # Start Flask in separate thread
    flask_thread = Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Run uAgent in main thread
    workflow_agent.run()
