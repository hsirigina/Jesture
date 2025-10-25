"""
AI Auto-Mode Agent (Simplified Version)
Provides context-aware gesture interpretation using Gemini
Simple Flask server - no uAgents complexity
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv
import subprocess
import platform

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
    elif any(code in app_lower for code in ["vscode", "code", "pycharm", "sublime", "atom", "cursor"]):
        return "code_editor"
    else:
        return "general"

def parse_json_response(text: str) -> dict:
    """Extract JSON from Gemini response"""
    import re

    # Try to find JSON in response
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    # Fallback
    return {
        "action": "keyboard",
        "key": "Space",
        "reasoning": "Could not parse AI response"
    }

def get_fallback_action(gesture: str, context_type: str) -> str:
    """Simple direct mapping - NO AI"""

    # Swipe gestures - ALWAYS arrow keys
    if gesture == "swipe_right":
        return "ArrowRight"
    elif gesture == "swipe_left":
        return "ArrowLeft"

    # Static gestures
    elif gesture == "palm":
        return "Space"  # Play/pause
    elif gesture == "thumbs_up":
        return "ArrowUp"  # Volume up
    elif gesture == "thumbs_down":
        return "ArrowDown"  # Volume down
    elif gesture == "point":
        return "f"  # Fullscreen
    elif gesture == "peace":
        return "Escape"

    # Default
    return "Space"

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "AI Mode Agent is running"})

@app.route('/activate', methods=['POST'])
def activate_ai_mode():
    """Handle AI Mode activation"""
    data = request.json
    user_id = data.get('user_id', 'default')
    session_id = data.get('session_id', 'default')

    active_sessions[user_id] = {
        "session_id": session_id,
        "active": True,
        "context_history": []
    }

    print(f"✅ AI Mode activated for user {user_id}")

    return jsonify({
        "status": "active",
        "session_id": session_id,
        "message": "AI Mode is now active"
    })

@app.route('/gesture', methods=['POST'])
def handle_gesture():
    """Process gesture with contextual AI interpretation"""
    data = request.json
    gesture = data.get('gesture')
    confidence = data.get('confidence', 1.0)

    print(f"🤚 Gesture detected: {gesture} (confidence: {confidence})")

    # Get current window context
    context = get_active_window_context()
    print(f"📱 Active context: {context['app']} ({context['context_type']})")

    # SKIP GEMINI - USE DIRECT MAPPING
    # Just use the fallback mapping directly
    action_key = get_fallback_action(gesture, context['context_type'])

    print(f"🧠 Decision: {action_key} for {gesture}")

    result = {
        "action": "keyboard",
        "parameters": {"key": action_key},
        "reasoning": f"{gesture} → {action_key}",
        "success": True
    }

    print(f"📤 Sending response to backend: {result}")
    return jsonify(result)

if __name__ == "__main__":
    print("🚀 Starting AI Auto-Mode Agent (Simple Version)...")
    print("📡 Listening on http://localhost:8001")
    print("🤖 Using Gemini for context-aware gesture interpretation")
    print("✅ No Almanac registration needed - pure local HTTP server")
    print()
    app.run(host='0.0.0.0', port=8001, debug=False)
