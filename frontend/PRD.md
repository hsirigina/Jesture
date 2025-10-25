# Gesture Workflow Builder - Product Requirements Document

## Overview
A visual workflow builder (similar to n8n/Flowwise) that allows users to create custom gesture-controlled automation workflows using a drag-and-drop canvas interface.

## Core Concept
Users build workflows by connecting **Input Nodes** (gesture detectors) to **Output Nodes** (actions). Each node is self-contained code that can be connected via a visual canvas.

---

## User Flow

### 1. Authentication
- **Technology**: Supabase authentication
- Users must log in to access the application
- Support for signup/login flows

### 2. Workflow Dashboard
- After login, users see a list of their saved workflows
- Each workflow shows:
  - Workflow name
  - Number of gesture → action pairs
  - Last modified date
  - Active/Inactive status
- Actions available:
  - **Edit** - Open workflow in canvas editor
  - **Run** - Activate this workflow (stops any other running workflow)
  - **Stop** - Deactivate workflow
  - **Delete** - Remove workflow
  - **Create New** - Build a new workflow from scratch

### 3. Workflow Canvas Editor
- **Technology**: React Flow library
- Visual drag-and-drop interface
- Two-panel layout:
  - **Left**: Node library/wordbank
  - **Center**: Canvas for building workflow
  - **Right** (optional): Node configuration panel

---

## Node System

### Input Nodes (Gesture Detectors)
**Visual Design**: Rectangle with a triangle/arrow on the right side (connection point)

**Available Gestures** (Initial Set):
- `swipe_left` - Swipe hand left
- `swipe_right` - Swipe hand right
- `thumbs_up` - Thumbs up gesture
- `thumbs_down` - Thumbs down gesture
- `palm` - Open palm/hand
- `point` - Pointing finger up
- `peace` - Peace sign (2 fingers)

**Future additions**: `swipe_up`, `swipe_down`, custom recorded gestures

**Node Behavior**:
- Each input node contains the gesture detection code
- When triggered, outputs the gesture name as a string (e.g., "thumbs_up")
- Can only connect to ONE output node (1:1 mapping for v1)

### Output Nodes (Actions)
**Visual Design**: Rectangle without triangle (endpoint)

**Output Categories**:

1. **Keyboard Actions**
   - Press specific keys (Arrow keys, F5, Escape, etc.)
   - Keyboard shortcuts (Cmd+C, Ctrl+V, etc.)
   - Type text strings

2. **Smart Home Controls**
   - Turn lights on/off (Govee integration)
   - Adjust brightness (+/- or specific value)
   - Change colors (cycle or specific RGB)

3. **Mouse Actions** (Future)
   - Click, double-click, right-click
   - Move cursor
   - Scroll

4. **System Commands** (Future)
   - Run terminal commands
   - Open applications
   - Volume control

5. **API Calls** (Future)
   - HTTP requests
   - Webhook triggers

**Node Behavior**:
- Receives gesture name as input
- Executes the corresponding action code
- Returns success/failure status

---

## Workflow Execution Model

### Architecture
```
Frontend (Canvas) → Server → Action Executor
     ↓
Gesture Detection (MediaPipe + Fingerpose)
     ↓
Socket.IO emit to Server
     ↓
Server routes to active workflow
     ↓
Execute mapped action
```

### How It Works

1. **Build Phase** (Canvas Editor):
   - User drags input nodes (gestures) onto canvas
   - User drags output nodes (actions) onto canvas
   - User connects input → output with visual lines
   - Each connection represents: "When [gesture] detected → Execute [action]"
   - Configuration panel allows setting action parameters (e.g., which key to press, brightness value)

2. **Save Phase**:
   - Workflow saved to Supabase database as JSON structure:
   ```json
   {
     "id": "workflow_123",
     "name": "Presentation Controller",
     "user_id": "user_abc",
     "nodes": [
       {
         "id": "node_1",
         "type": "input",
         "gesture": "swipe_right",
         "position": { "x": 100, "y": 100 }
       },
       {
         "id": "node_2",
         "type": "output",
         "action": "keyboard",
         "config": { "key": "ArrowRight" },
         "position": { "x": 400, "y": 100 }
       }
     ],
     "connections": [
       {
         "from": "node_1",
         "to": "node_2"
       }
     ],
     "active": false,
     "created_at": "2025-01-15T10:00:00Z",
     "updated_at": "2025-01-15T10:00:00Z"
   }
   ```

3. **Run Phase**:
   - User clicks "Run" on a workflow
   - Frontend fetches workflow JSON from database
   - Sends workflow configuration to server via Socket.IO
   - Server loads the gesture → action mappings into memory
   - Gesture detection starts (or continues if already running)
   - Only ONE workflow can be active at a time
   - When active workflow changes, server clears old mappings and loads new ones

4. **Detection & Execution**:
   - Frontend continuously detects gestures using MediaPipe
   - When gesture detected, emits to server: `{ gesture: "thumbs_up", confidence: 0.95 }`
   - Server checks active workflow for matching gesture
   - Executes corresponding action node code
   - Returns result to frontend for visual feedback

### Workflow States
- **Inactive**: Saved but not running
- **Active**: Currently loaded and processing gestures
- **Running**: Active + gesture detection is on

---

## Technical Architecture

### Frontend Stack
- **React** + **Vite**
- **React Flow** - Canvas/workflow builder
- **MediaPipe Hands** - Gesture detection (existing)
- **Fingerpose** - Gesture recognition (existing)
- **Socket.IO Client** - Server communication
- **Supabase Client** - Auth + Database

### Backend Stack
- **Node.js** + **Express** (existing)
- **Socket.IO Server** (existing)
- **@nut-tree-fork/nut-js** - Keyboard/mouse control (existing)
- **Govee API** - Smart light control (existing)

### Database Schema (Supabase)

**users** (handled by Supabase Auth)
- Standard Supabase auth table

**workflows**
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- name: text
- description: text (optional)
- workflow_data: jsonb (stores nodes + connections)
- active: boolean (is this workflow currently running?)
- created_at: timestamp
- updated_at: timestamp
```

**Constraints**:
- Only one workflow per user can have `active = true` at a time
- Use database trigger or application logic to enforce this

---

## User Interface Design

### Dashboard View
```
┌─────────────────────────────────────────┐
│  My Workflows               [+ New]     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Presentation Controller      [ACTIVE]│ │
│ │ 4 gestures • Modified 2h ago        │ │
│ │ [Edit] [Stop] [Delete]              │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Smart Home Control                  │ │
│ │ 5 gestures • Modified 1d ago        │ │
│ │ [Edit] [Run] [Delete]               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Canvas Editor View
```
┌─────────────���───────────────────────────────────────────┐
│  Presentation Controller    [Save] [Test] [Back]        │
├───────────┬─────────────────────────────────┬───────────┤
│           │                                 │           │
│  INPUTS   │         CANVAS                  │  CONFIG   │
│           │                                 │           │
│ 📥 Swipe  │   ┌─────────┐                  │  Node:    │
│    Left   │   │ Swipe   │─────┐            │  Swipe    │
│           │   │ Right   │     │            │  Right    │
│ 📥 Swipe  │   └─────────┘     │            │           │
│    Right  │                   ▼            │  Action:  │
│           │             ┌───────────┐      │  Keyboard │
│ 👍 Thumbs │             │ Press Key │      │           │
│    Up     │             │ [Right ▼] │      │  Key:     │
│           │             └───────────┘      │  [Right▼] │
│ 👎 Thumbs │                                │           │
│    Down   │                                │           │
│           │                                │           │
│ OUTPUTS   │                                │           │
│           │                                │           │
│ ⌨️  Press │                                │           │
│    Key    │                                │           │
│           │                                │           │
│ 💡 Light  │                                │           │
│    On/Off │                                │           │
│           │                                │           │
│ 💡 Bright │                                │           │
│    ness   │                                │           │
└───────────┴─────────────────────────────────┴───────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Set up Supabase project (auth + database)
- [ ] Create workflows table schema
- [ ] Implement authentication flow (login/signup)
- [ ] Build dashboard view (list workflows)

### Phase 2: Canvas Editor
- [ ] Integrate React Flow library
- [ ] Create input node components for each gesture
- [ ] Create output node components (keyboard, lights)
- [ ] Implement drag-and-drop from library to canvas
- [ ] Implement node connections (edges)
- [ ] Build configuration panel for output nodes

### Phase 3: Workflow Execution
- [ ] Implement "Save Workflow" (store to Supabase)
- [ ] Implement "Run Workflow" (activate workflow)
- [ ] Update server to accept dynamic workflow mappings
- [ ] Replace hardcoded gesture maps with dynamic workflow loading
- [ ] Implement single-active-workflow enforcement
- [ ] Add visual feedback when gestures trigger actions

### Phase 4: Polish & Testing
- [ ] Add workflow naming/description
- [ ] Add "Test Mode" in canvas (simulate gestures)
- [ ] Error handling (disconnected devices, invalid configs)
- [ ] Performance optimization (gesture detection throttling)
- [ ] User onboarding/tutorial

### Future Enhancements
- [ ] Gesture sequences (combo moves)
- [ ] Multiple outputs per gesture
- [ ] Conditional logic nodes (if/else)
- [ ] Custom gesture recording
- [ ] Workflow templates/marketplace
- [ ] Workflow sharing between users
- [ ] Analytics (most used gestures, accuracy)

---

## Key Design Principles

1. **Modularity**: Each node is self-contained code that only needs its inputs
2. **Visual Clarity**: Clear distinction between inputs (gestures) and outputs (actions)
3. **Simplicity First**: v1 is linear (1 gesture → 1 action), complexity comes later
4. **Single Source of Truth**: Database stores workflow state, server executes from that state
5. **Real-time Feedback**: Visual indicators when gestures are detected and actions execute

---

## Open Questions / Decisions Needed

1. **Node Configuration UI**: Inline editing vs. side panel vs. modal?
2. **Workflow Testing**: Should users be able to test without leaving editor?
3. **Error States**: How to handle when a device is disconnected (e.g., lights offline)?
4. **Gesture Conflicts**: What happens if user maps same gesture twice in one workflow?
5. **Migration**: How to handle existing hardcoded gestures during transition?

---

## Success Metrics

- Users can create a working workflow in < 5 minutes
- Gesture detection accuracy remains ≥ 90%
- Workflow execution latency < 200ms from detection to action
- Zero conflicts when switching between workflows
- Users create average of 3+ workflows per account

---

## Notes

- Gesture detection code stays in frontend (MediaPipe/Fingerpose)
- Server only receives gesture name + executes action
- All workflow logic stored as JSON in database
- React Flow handles canvas rendering/interaction
- Supabase handles all data persistence and auth
