🎯 Gesture Workflow Builder - Project Handoff
📋 Project Overview
We're building a visual workflow builder for gesture-controlled automation - think n8n/Flowwise but for hand gestures. Users create workflows by connecting gesture inputs to actions (keyboard, lights, etc.) with a drag-and-drop interface.
📍 Current Status: FULLY FUNCTIONAL MVP
We have a working end-to-end system where users can:
Log in (Supabase auth)
Create workflows visually (React Flow canvas)
Map gestures → actions with optional cooldown modifiers
Run workflows → Camera detects gestures → Actions execute in real-time
All data persists to database
🗂️ Project Structure
mrgesture/
├── frontend/                         # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.jsx              # ✅ Login/signup (no email confirmation)
│   │   │   ├── WorkflowDashboard.jsx # ✅ List/manage workflows
│   │   │   ├── WorkflowCanvas.jsx    # ✅ Visual workflow editor (React Flow)
│   │   │   ├── CameraFeed.jsx        # ✅ MediaPipe gesture detection
│   │   │   └── MiniPanel.jsx         # (Legacy - not used in new flow)
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx       # ✅ User authentication state
│   │   ├── services/
│   │   │   ├── workflowService.js    # ✅ CRUD operations for workflows
│   │   │   └── socketClient.js       # ✅ Socket.IO communication
│   │   ├── lib/
│   │   │   └── supabase.js           # ✅ Supabase client setup
│   │   └── App.jsx                   # ✅ Main router (Auth → Dashboard → Canvas)
│   ├── .env                          # Supabase URL + anon key
│   ├── PRD.md                        # Original product requirements
│   ├── TESTING.md                    # Dashboard feature tests
│   ├── TESTING_SERVER_INTEGRATION.md # End-to-end workflow tests
│   └── TESTING_COOLDOWN.md           # Cooldown modifier tests
│
└── server/
    ├── server.js                     # ✅ Express + Socket.IO + gesture execution
    └── goveeController.js            # ✅ Smart light control (Govee API)
🏗️ Architecture
Flow:
User Browser (Frontend)
    ↓ (Socket.IO)
Server (Node.js)
    ↓
Actions Execute:
  - Keyboard (@nut-tree-fork/nut-js)
  - Lights (Govee API)
Data Flow:
1. User creates workflow in canvas
2. Workflow saved to Supabase (JSON: nodes + edges)
3. User clicks "Run" → Workflow sent to server via Socket.IO
4. Server builds gesture → action mappings
5. Camera detects gesture → Sends to server
6. Server executes mapped action (with cooldown check)
7. Action happens (types text, controls lights, etc.)
📊 Database Schema (Supabase)
workflows table:
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- name: text
- description: text
- workflow_data: jsonb  ← Stores nodes + edges from React Flow
- active: boolean       ← Only 1 can be true per user
- created_at: timestamptz
- updated_at: timestamptz
Key Features:
Row Level Security (RLS) - Users only see their own workflows
Trigger enforces single active workflow per user
Auto-updates updated_at timestamp
🧩 Node System
3 Node Types:
1. Input Nodes (Gestures) - Green border, 👋 icon
{
  id: 'node-1',
  type: 'input',
  data: {
    label: 'Thumbs Up',
    nodeType: 'input',
    gesture: 'thumbs_up'  ← Key for server mapping
  }
}
Available Gestures:
swipe_left
swipe_right
thumbs_up
thumbs_down
palm
point
peace
2. Modifier Nodes - Orange border, ⚙️ icon
{
  id: 'node-2',
  type: 'default',
  data: {
    label: 'Cooldown',
    nodeType: 'modifier',
    category: 'modifier',
    config: { cooldown: 2000 }  ← Editable!
  }
}
Purpose: Sits between input and output to modify behavior Available Modifiers:
Cooldown - Prevents execution for X milliseconds after triggering
3. Output Nodes - Blue border, ⌨️/💡 icon
{
  id: 'node-3',
  type: 'default',
  data: {
    label: 'Type "hello"',
    nodeType: 'output',
    category: 'keyboard',
    config: { action: 'typeText', text: 'hello' }
  }
}
Keyboard Actions:
Type text: { action: 'typeText', text: 'hello' }
Press key: { key: 'Right' } (uses @nut-tree-fork/nut-js Key enum)
Light Actions:
Turn on/off: { action: 'turnOn' } or { action: 'turnOff' }
Set brightness: { action: 'setBrightness', value: 50 }
Cycle color: { action: 'colorCycle' }
🔌 Socket.IO Events
Client → Server:
workflow:load - When user clicks "Run"
{
  workflowName: 'My Workflow',
  workflowData: {
    nodes: [...],
    edges: [...]
  }
}
workflow:unload - When user clicks "Stop" gesture:detected - When camera detects gesture
{
  gesture: 'thumbs_up',
  confidence: 0.95,
  timestamp: 1234567890
}
Server → Client:
workflow:loaded - Confirmation workflow is active
{
  success: true,
  mappingCount: 3
}
action:completed - Result of gesture execution
{
  action: 'thumbs_up',
  success: true,
  message: 'Typed "hello"'
}
🎮 Server Workflow Loading Logic
The server does path tracing to build gesture → action mappings:
// Simplified version
1. Find all input nodes (gestures)
2. For each input, trace connected path:
   - Input → [Modifier(s)] → Output
3. Build mapping:
   Map<gesture, {
     label: 'Type hello',
     category: 'keyboard',
     config: { action: 'typeText', text: 'hello' },
     modifiers: [{ category: 'modifier', config: { cooldown: 2000 } }]
   }>
4. When gesture detected:
   - Check cooldown
   - Execute action
   - Record execution time
Example Server Log:
📋 Loading workflow: Test Workflow
  ✓ Mapped: thumbs_up → Type "hello" [Cooldown]
✅ Workflow loaded with 1 gesture mappings

Gesture detected: { gesture: 'thumbs_up', ... }
✅ Executed workflow keyboard action: thumbs_up → Type "hello"

Gesture detected: { gesture: 'thumbs_up', ... }
⏸️  Cooldown active for thumbs_up: 1.5s remaining
🎥 Camera Control
Key Implementation:
// App.jsx
const [cameraActive, setCameraActive] = useState(false)

// Dashboard view
{cameraActive && (
  <div style={{ display: 'none' }}>
    <CameraFeed onGestureDetected={handleGestureDetected} />
  </div>
)}

// Run workflow → setCameraActive(true)
// Stop workflow → setCameraActive(false)
Behavior:
Camera ONLY runs when workflow is active
Runs hidden in background (display: none)
User can tab away but camera keeps detecting (browser-dependent)
🧪 Testing Documentation
TESTING.md - Dashboard Tests
Auth flow (signup/login)
Workflow CRUD operations
Canvas drag-and-drop
Save/load workflows
Run/stop workflows
TESTING_SERVER_INTEGRATION.md - End-to-End Tests
Workflow loading on server
Gesture detection → action execution
Multiple gesture mappings
Light control integration
Switching between workflows
TESTING_COOLDOWN.md - Modifier Tests
Adding cooldown to workflow
Editing cooldown value
Cooldown blocking execution
Cooldown expiration
Multiple gestures with different cooldowns
🚀 How to Run
Prerequisites:
# Server dependencies already installed
cd server && npm install  # (already done)

# Frontend dependencies already installed
cd frontend && npm install  # (already done)
Environment Setup:
Frontend .env:
VITE_SUPABASE_URL=https://yidescxoyqxsetemznnh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...  # (already configured)
Run:
Terminal 1 - Server:
cd server
node server.js
Terminal 2 - Frontend:
cd frontend
npm run dev
Browser:
http://localhost:5173
✅ What's Working (Fully Tested)
✅ Authentication - Signup/login with Supabase (no email confirmation)
✅ Dashboard - View, create, edit, delete workflows
✅ Canvas Editor - Drag-and-drop React Flow interface
✅ Save/Load - Workflows persist to Supabase
✅ Run/Stop - Activate workflows, camera control
✅ Gesture Detection - MediaPipe + Fingerpose detecting 7 gestures
✅ Server Integration - Socket.IO sends workflows to server
✅ Action Execution - Keyboard typing, key presses, light control
✅ Cooldown Modifier - Prevents spam, editable timing
✅ Single Active Workflow - Database constraint enforced
🐛 Known Issues
Camera doesn't work when tabbed away - Browser throttles inactive tabs
Workaround: Keep browser window visible
Output configs not editable - Can't change which key to press in UI
Workaround: Must edit code in WorkflowCanvas.jsx OUTPUT_ACTIONS
No workflow auto-load on refresh - User must click "Run" again
Technical debt: Need to fetch active workflow on mount and auto-load
Cooldown is only available modifier - Could add delay, max executions, etc.
Limited output types - Only keyboard (type/press) and lights
Missing: Mouse actions, API calls, system commands
🔧 Key Code Locations
Node Definitions:
frontend/src/components/WorkflowCanvas.jsx:
Lines 10-23: GESTURE_INPUTS array
Lines 26-63: OUTPUT_ACTIONS array
Lines 66-74: MIDDLEWARE_NODES array
Server Workflow Loading:
server/server.js:
Lines 239-324: workflow:load event handler (path tracing logic)
Server Action Execution:
server/server.js:
Lines 79-166: executeWorkflowAction() function (cooldown + execution)
Camera Control:
frontend/src/App.jsx:
Line 20: cameraActive state
Lines 84-89: Conditional camera rendering
Database Service:
frontend/src/services/workflowService.js:
Complete CRUD for workflows (getWorkflows, createWorkflow, etc.)
📈 PRD Implementation Status
Phase 1: Core Infrastructure ✅ COMPLETE
✅ Supabase auth + database
✅ Workflows table schema
✅ Authentication flow
✅ Dashboard view
Phase 2: Canvas Editor ✅ COMPLETE
✅ React Flow integration
✅ Input/output node components
✅ Drag-and-drop functionality
✅ Node connections (edges)
✅ Configuration panel
Phase 3: Workflow Execution ✅ COMPLETE
✅ Save workflow to Supabase
✅ Run workflow (activate)
✅ Dynamic workflow loading on server
✅ Single-active-workflow enforcement
✅ Visual feedback (ACTIVE badge)
Phase 4: Polish & Testing ✅ COMPLETE
✅ Workflow naming/description
✅ Error handling
✅ Performance optimization
✅ Testing documentation
Phase 5: Modifiers (BONUS) ✅ COMPLETE
✅ Middleware node system
✅ Cooldown modifier implementation
✅ Editable configurations
🎯 Current Capabilities
You can build workflows like: Example 1: Presentation Control
Swipe Right → Cooldown (2s) → Press Key (Right Arrow)
Swipe Left  → Cooldown (2s) → Press Key (Left Arrow)
Thumbs Up   → Cooldown (5s) → Press Key (F5)
Example 2: Smart Home
Thumbs Up   → Cooldown (3s) → Lights ON
Thumbs Down → Cooldown (3s) → Lights OFF
Peace       → Cooldown (1s) → Cycle Color
Example 3: Text Automation
Point → Cooldown (2s) → Type "Hello World!"
Palm  → Cooldown (1s) → Type "Goodbye"
🔮 Immediate Next Steps (Not Yet Implemented)
Priority 1: Editable Output Configs
Allow users to change keyboard key in UI (currently hardcoded)
Add text input for "Type text" action
Priority 2: Auto-Load Active Workflow
On page load, fetch active workflow from database
Automatically send to server and start camera
Priority 3: Mouse Actions
Add output nodes for click, move, scroll
Priority 4: More Modifiers
Delay (wait before executing)
Max Executions (limit to N times)
Debounce (wait for gesture to stabilize)
💡 Important Design Decisions
Why 3 node types?
Input = Source (what triggers)
Modifier = Transform (how to modify)
Output = Sink (what happens)
Keeps it simple and extensible
Why cooldown on server not client?
Server is source of truth
Client can refresh/disconnect
Prevents cheating by multiple clients
Why path tracing not direct mapping?
Allows chaining multiple modifiers
Future: Input → Delay → Cooldown → Output
More flexible than 1:1 connections
Why camera only when active?
Privacy concern
Performance (MediaPipe is heavy)
User requested this behavior
📞 Key Integration Points
If you need to extend the system:
Add New Gesture:
Define in CameraFeed.jsx (fingerpose GestureDescription)
Add to GESTURE_INPUTS in WorkflowCanvas.jsx
Test detection in camera feed
Add New Output Action:
Add to OUTPUT_ACTIONS in WorkflowCanvas.jsx
Handle in executeWorkflowAction() in server.js
Add New Modifier:
Add to MIDDLEWARE_NODES in WorkflowCanvas.jsx
Add config UI in node config panel
Handle in server workflow loading
Implement logic in executeWorkflowAction()
🎉 What Makes This Special
No-code gesture automation - Visual, accessible
Real-time execution - Instant feedback
Extensible system - Easy to add gestures/actions/modifiers
Privacy-first - Camera only on when needed
Database-backed - All workflows persist
Multi-device ready - Same workflow works on any computer (with camera)
🚨 Critical Things to Know
Server must be restarted after code changes to server.js
Browser must be refreshed after frontend code changes
Camera permissions are browser-specific (allow on first load)
Cooldown is tracked in-memory on server (resets on server restart)
Only one workflow active at a time (database enforced)
Gesture detection requires good lighting and visible hand