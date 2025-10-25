"""
AI Auto-Mode Agent (uAgent #1)
Provides context-aware gesture interpretation using Fetch.ai uAgents + Gemini
"""

from uagents import Agent, Context, Model
from pydantic import BaseModel
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv
import subprocess
import platform

# Load environment variables
load_dotenv()

# Message Models
class ActivateAIMode(BaseModel):
    user_id: str
    session_id: str

class GestureDetected(BaseModel):
    gesture: str
    confidence: float
    timestamp: str

class ExecuteAction(BaseModel):
    action: str
    parameters: dict
    reasoning: str
    success: bool = True

# Initialize Agent (LOCAL MODE - no Almanac registration needed)
ai_mode_agent = Agent(
    name="ai_auto_mode_agent",
    seed="jesture-ai-mode-agent-seed-2025",
    port=8001,
    endpoint=["http://localhost:8001/submit"],
    enable_agent_inspector=False,  # Disable Agentverse inspector for local dev
    log_level="INFO"
)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

# State management
active_sessions = {}

def get_active_window_context():
    """
    Get the currently active application/window context
    Returns dict with app name and additional context
    """
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
                "context_type": detect_app_type(app_name)
            }

        elif system == "Windows":
            # Windows implementation
            import win32gui
            window = win32gui.GetForegroundWindow()
            app_name = win32gui.GetWindowText(window)
            return {
                "app": app_name,
                "platform": "Windows",
                "context_type": detect_app_type(app_name)
            }

        elif system == "Linux":
            # Linux implementation (X11)
            result = subprocess.run(
                ["xdotool", "getactivewindow", "getwindowname"],
                capture_output=True,
                text=True
            )
            app_name = result.stdout.strip()
            return {
                "app": app_name,
                "platform": "Linux",
                "context_type": detect_app_type(app_name)
            }

    except Exception as e:
        print(f"Error getting active window: {e}")
        return {
            "app": "Unknown",
            "platform": system,
            "context_type": "unknown"
        }

def detect_app_type(app_name):
    """Detect what type of application is active"""
    app_lower = app_name.lower()

    if any(media in app_lower for media in ["netflix", "youtube", "vlc", "quicktime", "movies"]):
        return "video_player"
    elif any(music in app_lower for music in ["spotify", "music", "itunes", "apple music"]):
        return "music_player"
    elif any(present in app_lower for present in ["powerpoint", "keynote", "slides", "presentation"]):
        return "presentation"
    elif any(browser in app_lower for browser in ["chrome", "firefox", "safari", "edge", "browser"]):
        return "web_browser"
    elif any(code in app_lower for code in ["vscode", "code", "pycharm", "sublime", "atom"]):
        return "code_editor"
    else:
        return "general"

@ai_mode_agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info("AI Auto-Mode Agent started on port 8001")
    ctx.logger.info("Waiting for AI Mode activation requests...")

@ai_mode_agent.on_message(model=ActivateAIMode)
async def activate_ai_mode(ctx: Context, sender: str, msg: ActivateAIMode):
    """Handle AI Mode activation"""
    active_sessions[msg.user_id] = {
        "session_id": msg.session_id,
        "active": True,
        "context_history": []
    }

    ctx.logger.info(f"✅ AI Mode activated for user {msg.user_id}")

    # Send confirmation back
    response = {
        "status": "active",
        "session_id": msg.session_id,
        "message": "AI Mode is now active. Gestures will be contextually interpreted."
    }

    await ctx.send(sender, response)

@ai_mode_agent.on_message(model=GestureDetected)
async def handle_gesture(ctx: Context, sender: str, msg: GestureDetected):
    """Process gesture with contextual AI interpretation"""

    ctx.logger.info(f"🤚 Gesture detected: {msg.gesture} (confidence: {msg.confidence})")

    # Get current window context
    context = get_active_window_context()
    ctx.logger.info(f"📱 Active context: {context['app']} ({context['context_type']})")

    # Build prompt for Gemini
    prompt = f"""
You are a context-aware gesture control AI assistant. A user performed a gesture and you need to decide what keyboard action to execute based on their current context.

**Gesture performed:** {msg.gesture}
**Confidence:** {msg.confidence}

**Current context:**
- Active application: {context['app']}
- Application type: {context['context_type']}
- Platform: {context['platform']}

**Your task:** Determine the most appropriate keyboard action for this gesture in this context.

**Available keyboard actions:**
- ArrowRight: Move right/forward/next
- ArrowLeft: Move left/backward/previous
- Space: Play/Pause (media), Next slide (presentations)
- ArrowUp: Volume up, Brightness up
- ArrowDown: Volume down, Brightness down
- f: Toggle fullscreen
- Escape: Exit fullscreen/close

**Context-aware mapping examples:**
- swipe_right in Netflix/YouTube → ArrowRight (skip forward 10s)
- swipe_right in Spotify/Music → ArrowRight (next song)
- swipe_right in PowerPoint/Keynote → ArrowRight (next slide)
- swipe_left → opposite of swipe_right
- palm in video player → Space (play/pause)
- thumbs_up → ArrowUp (volume/brightness up)
- thumbs_down → ArrowDown (volume/brightness down)

**Rules:**
1. Be smart about context - same gesture does different things in different apps
2. For unknown apps, use sensible defaults (arrows for navigation, space for pause)
3. Prioritize user intent based on what they're likely trying to do
4. Keep actions simple and predictable

Respond ONLY with valid JSON in this exact format:
{{
    "action": "keyboard",
    "key": "ArrowRight",
    "reasoning": "User is on Netflix and swiped right, so skip forward in the video"
}}
"""

    try:
        # Call Gemini
        response = model.generate_content(prompt)
        decision = parse_json_response(response.text)

        ctx.logger.info(f"🧠 AI Decision: {decision['key']} - {decision['reasoning']}")

        # Send action to executor
        action_msg = ExecuteAction(
            action=decision.get("action", "keyboard"),
            parameters={"key": decision.get("key", "Space")},
            reasoning=decision.get("reasoning", "Context-aware gesture interpretation"),
            success=True
        )

        # Forward to backend for execution
        await ctx.send(sender, action_msg.dict())

    except Exception as e:
        ctx.logger.error(f"❌ Error processing gesture: {e}")

        # Fallback to simple mapping
        fallback_action = get_fallback_action(msg.gesture, context['context_type'])

        action_msg = ExecuteAction(
            action="keyboard",
            parameters={"key": fallback_action},
            reasoning=f"Fallback action for {msg.gesture} in {context['context_type']}",
            success=True
        )

        await ctx.send(sender, action_msg.dict())

def parse_json_response(text: str) -> dict:
    """Extract JSON from Gemini response"""
    import re

    # Try to find JSON in response
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    # Fallback
    return {
        "action": "keyboard",
        "key": "Space",
        "reasoning": "Could not parse AI response"
    }

def get_fallback_action(gesture: str, context_type: str) -> str:
    """Simple fallback mapping when AI fails"""

    # Swipe gestures
    if gesture == "swipe_right":
        return "ArrowRight"
    elif gesture == "swipe_left":
        return "ArrowLeft"

    # Static gestures
    elif gesture == "palm":
        return "Space"  # Play/pause
    elif gesture == "thumbs_up":
        return "ArrowUp"
    elif gesture == "thumbs_down":
        return "ArrowDown"
    elif gesture == "point":
        return "f"  # Fullscreen
    elif gesture == "peace":
        return "Escape"

    # Default
    return "Space"

if __name__ == "__main__":
    print("🚀 Starting AI Auto-Mode Agent...")
    print("📡 Listening on http://localhost:8001")
    print("🤖 Using Gemini for context-aware gesture interpretation")
    ai_mode_agent.run()
