# Jesture AI Agents

This directory contains the Fetch.ai uAgents implementation for intelligent gesture control.

## Architecture

Two autonomous agents built on Fetch.ai's uAgents framework:

1. **AI Auto-Mode Agent** (`ai_mode_agent.py`) - Port 8001
   - Provides context-aware gesture interpretation
   - Uses Gemini (swappable to Claude) for intelligent action mapping
   - No manual workflow configuration needed

2. **Workflow Builder Agent** (`workflow_builder_agent.py`) - Port 8002
   - Converts natural language to workflow JSON
   - Generates complete workflow configurations from text prompts

## Setup

### 1. Install Dependencies
```bash
cd agents
pip install -r requirements.txt
```

### 2. Run Agents

**Terminal 1: AI Auto-Mode Agent**
```bash
python ai_mode_agent.py
```

**Terminal 2: Workflow Builder Agent**
```bash
python workflow_builder_agent.py
```

## Integration with Main App

- Backend server (`server/server.js`) communicates with agents via HTTP POST to agent endpoints
- Agents run independently on ports 8001 and 8002
- Frontend triggers AI features via existing Socket.IO connection to backend

## Environment Variables

Create a `.env` file in this directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
GOVEE_API_KEY=your_govee_api_key_here
```
