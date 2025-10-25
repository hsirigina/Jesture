# 🤖 AI Mode Setup Guide

## Overview

AI Mode provides **context-aware gesture control** using Fetch.ai uAgents + Gemini AI. The AI agent detects which app you're using (Netflix, Spotify, PowerPoint, etc.) and intelligently maps gestures to appropriate actions.

**Example:**
- Swipe right in PowerPoint → Next slide
- Swipe right in Netflix → Skip forward 10 seconds
- Swipe right in Spotify → Next song

**Same gesture, different actions based on context!**

---

## 🚀 Quick Start (4 Steps)

### Step 1: Install Node Dependencies

**Terminal 1 - Frontend:**
```bash
cd frontend
npm install
```

**Terminal 2 - Server:**
```bash
cd server
npm install
```

### Step 2: Set up Python Environment for AI Agent

```bash
cd agents

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Mac/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Start All Services

You need **3 terminals** running:

**Terminal 1 - AI Agent (Python):**
```bash
cd agents
source venv/bin/activate
python ai_mode_agent.py
```
You should see:
```
🚀 Starting AI Auto-Mode Agent...
📡 Listening on http://localhost:8001
🤖 Using Gemini for context-aware gesture interpretation
```

**Terminal 2 - Backend Server (Node.js):**
```bash
cd server
npm start
```
You should see:
```
Server running on http://localhost:3001
Socket.IO ready for connections
```

**Terminal 3 - Frontend (React):**
```bash
cd frontend
npm run dev
```
You should see:
```
➜  Local:   http://localhost:5173/
```

### Step 4: Use AI Mode

1. Open browser to `http://localhost:5173`
2. Log in with your Supabase account
3. On the dashboard, you'll see a **fixed "🤖 AI Mode" panel** in the top-right corner
4. Run a workflow (or skip and use AI Mode directly)
5. Click **"▶️ Start AI Mode"**
6. Green border appears → AI Mode is active!
7. Open any app (Netflix, Spotify, PowerPoint, etc.)
8. Make gestures → AI decides what to do based on your context

---

## 🎯 How It Works

### Architecture Flow

```
User makes gesture
      ↓
Frontend (MediaPipe) detects gesture
      ↓
If AI Mode active → Route to AI agent
      ↓
AI Agent (Python uAgent on port 8001)
      ↓
Get active window context (macOS/Windows/Linux)
      ↓
Send to Gemini AI with prompt
      ↓
Gemini decides: "User is on Netflix + swipe_right → ArrowRight key"
      ↓
AI Agent responds with keyboard action
      ↓
Backend executes keyboard action via @nut-tree
      ↓
Action happens in your active app!
```

### Context Detection

The AI agent uses OS-specific APIs to detect your active window:

- **macOS**: AppleScript to get frontmost app
- **Windows**: win32gui to get foreground window
- **Linux**: xdotool to get active window

Then categorizes it:
- `video_player`: Netflix, YouTube, VLC, etc.
- `music_player`: Spotify, Apple Music, etc.
- `presentation`: PowerPoint, Keynote, Google Slides
- `web_browser`: Chrome, Firefox, Safari
- `code_editor`: VSCode, PyCharm, etc.
- `general`: Everything else

### Supported Gestures

- `swipe_right` - Swipe hand right
- `swipe_left` - Swipe hand left
- `thumbs_up` - Thumbs up
- `thumbs_down` - Thumbs down
- `palm` - Open palm
- `point` - Pointing finger up
- `peace` - Peace sign

---

## 🛠️ Troubleshooting

### "Could not connect to AI agent" Error

**Problem:** Backend can't reach AI agent on port 8001

**Solutions:**
1. Make sure AI agent is running: `python agents/ai_mode_agent.py`
2. Check port 8001 isn't blocked: `curl http://localhost:8001`
3. Check firewall settings

### "Error getting active window" in AI agent logs

**Problem:** AI agent can't detect active application

**Solutions:**

**macOS:**
- Grant accessibility permissions to Terminal
- System Settings → Privacy & Security → Accessibility → Add Terminal

**Windows:**
- Install pywin32: `pip install pywin32`

**Linux:**
- Install xdotool: `sudo apt-get install xdotool`

### Gestures detected but no action happens

**Problem:** Keyboard actions not executing

**Solutions:**
1. Make sure backend server is running
2. Check backend logs for errors
3. Grant accessibility permissions (macOS) or run as admin (Windows)
4. @nut-tree needs permissions to control keyboard

### AI makes wrong decisions

**Problem:** AI interprets gestures incorrectly

**Solutions:**
1. Check if active window detection is working (see agent logs)
2. Gemini might need better prompts (edit `ai_mode_agent.py`)
3. Use fallback mode: AI agent has hardcoded fallbacks if Gemini fails

---

## 📝 Configuration

### Change Gemini API Key

Edit `agents/.env`:
```
GEMINI_API_KEY=your_new_key_here
```

### Swap Gemini → Claude

As per the PRD, the agent is designed to be swappable. To use Claude:

1. Install Anthropic SDK:
```bash
pip install anthropic
```

2. Edit `agents/ai_mode_agent.py`:
```python
# Replace:
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

# With:
from anthropic import Anthropic
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
```

3. Update the AI call in `handle_gesture()`:
```python
# Replace:
response = model.generate_content(prompt)
decision = parse_json_response(response.text)

# With:
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=2048,
    messages=[{"role": "user", "content": prompt}]
)
decision = parse_json_response(response.content[0].text)
```

### Customize Gesture Mappings

Edit the Gemini prompt in `agents/ai_mode_agent.py` (line ~131) to change how AI interprets gestures.

---

## 🎨 Frontend Integration (No Conflicts!)

The AI Mode feature is **completely isolated** to avoid merge conflicts:

### New Files (won't conflict):
- `frontend/src/components/AIMode.jsx` - Isolated component
- `agents/` - Entire directory is new
- `server/server.js` - Only added new Socket.IO handlers (lines 498-607)

### Modified Files (minimal changes):
- `frontend/src/App.jsx` - Added:
  - Import for AIMode component
  - `aiModeActive` state
  - Gesture routing logic (if AI Mode, route to AI agent)
  - AIMode component render

**All changes are additive** - existing workflow functionality untouched!

---

## 🔥 Demo Script

1. Start all 3 services (AI agent, backend, frontend)
2. Open Jesture app in browser
3. Click "▶️ Start AI Mode" button
4. Open PowerPoint presentation
5. Swipe right → Next slide
6. Open Netflix
7. Swipe right → Skip forward in video
8. Watch the "Last Action" panel show AI reasoning!

---

## 📦 File Structure

```
Jesture/
├── agents/                          # NEW - AI agent directory
│   ├── ai_mode_agent.py            # AI Auto-Mode Agent (uAgent #1)
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # API keys
│   └── README.md                   # Agent documentation
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── AIMode.jsx          # NEW - AI Mode UI component
│   │   └── App.jsx                 # MODIFIED - Added AI Mode integration
│   └── .env                        # Supabase credentials
│
├── server/
│   ├── server.js                   # MODIFIED - Added AI Mode Socket.IO handlers
│   └── package.json                # MODIFIED - Added node-fetch dependency
│
└── AIMODE_SETUP.md                 # This file
```

---

## 🎯 Success Metrics

You know it's working when:
- ✅ AI agent shows "📡 Listening on http://localhost:8001"
- ✅ Frontend shows green "Active - AI is watching your screen" indicator
- ✅ Gestures trigger different actions based on active app
- ✅ "Last Action" panel shows AI reasoning

---

## 🚨 Important Notes

1. **Permissions Required:**
   - macOS: Accessibility permissions for Terminal/Python
   - Windows: Run as administrator for keyboard control

2. **Internet Required:**
   - Gemini API needs internet connection
   - Fallback to hardcoded gestures if offline

3. **Only ONE mode at a time:**
   - Either AI Mode OR Workflow mode
   - Not both simultaneously

4. **Platform Support:**
   - macOS: Fully supported ✅
   - Windows: Supported (needs pywin32) ✅
   - Linux: Supported (needs xdotool) ✅

---

## 📚 Next Steps

- **Agent #2:** Implement Workflow Builder Agent (natural language → JSON)
- **Poke MCP:** Add remote activation via iMessage
- **Custom Contexts:** Train AI on your specific use cases
- **Multi-Agent:** Coordination between multiple agents

---

**Questions?** Check the AI_AGENTS_PRD.md for full architecture details.
