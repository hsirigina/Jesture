# Testing Guide for Gesture Workflow Builder

## Current Features Testing

### 1. Authentication Tests

**Sign Up Flow:**
1. Open app at `http://localhost:5173`
2. Enter email: `test@example.com`
3. Enter password: `password123`
4. Click "Sign Up"
5. ✅ **Expected**: Should automatically log you in and show the workflow dashboard

**Sign In Flow:**
1. Sign out if logged in
2. Enter same email/password from signup
3. Click "Sign In"
4. ✅ **Expected**: Should log you in and show dashboard

**Sign Out:**
1. Click "Sign Out" button in dashboard header
2. ✅ **Expected**: Should return to login screen

---

### 2. Workflow Dashboard Tests

**Empty State:**
1. Log in with a fresh account
2. ✅ **Expected**: Should see "No workflows yet" message with "Create Workflow" button

**Create New Workflow:**
1. Click "+ New Workflow" button
2. ✅ **Expected**: Should navigate to empty canvas editor
3. ✅ **Expected**: Title should say "Untitled Workflow"

**View Existing Workflows:**
1. Create and save at least 2 workflows
2. Return to dashboard
3. ✅ **Expected**: Should see grid of workflow cards
4. ✅ **Expected**: Each card shows:
   - Workflow name
   - Number of gestures (e.g., "3 gestures")
   - Last modified time (e.g., "5m ago")
   - Edit, Run, Delete buttons

---

### 3. Workflow Canvas Editor Tests

**Navigate to Canvas:**
1. From dashboard, click "+ New Workflow" OR click "Edit" on existing workflow
2. ✅ **Expected**: Should see canvas with 3 panels:
   - Left: Node library
   - Center: Canvas with grid
   - Right: "Select a node to configure" message

**Edit Workflow Name:**
1. Click in the title field at top
2. Type a new name (e.g., "My Presentation Controls")
3. Add description (e.g., "Controls for PowerPoint")
4. ✅ **Expected**: Text should update as you type

**Drag Input Node (Gesture):**
1. Find "Swipe Right" in the left sidebar under "Input Gestures"
2. Drag it onto the canvas (center panel)
3. ✅ **Expected**:
   - Green bordered node appears on canvas
   - Has label "Swipe Right"
   - Has connection point on right side

**Drag Output Node (Action):**
1. Find "Press Key" in left sidebar under "Output Actions"
2. Drag it onto canvas
3. ✅ **Expected**:
   - Purple/blue bordered node appears
   - Has label "Press Key"
   - Has connection point on left side

**Connect Nodes:**
1. Hover over the right edge of input node (Swipe Right)
2. Click and drag from the connection point
3. Drag to the left edge of output node (Press Key)
4. Release mouse
5. ✅ **Expected**:
   - Blue line connects the two nodes
   - Line should be smooth/curved

**Select Node:**
1. Click on any node
2. ✅ **Expected**:
   - Node border becomes highlighted/darker
   - Right sidebar shows "Node Settings"
   - Shows node type, label, and configuration

**Delete Node:**
1. Click on a node to select it
2. Click "Delete Node" button in right sidebar
3. ✅ **Expected**:
   - Node disappears from canvas
   - Any connected edges also disappear
   - Right sidebar returns to "Select a node to configure"

**Save Workflow:**
1. Add at least 2 connected nodes
2. Give it a name
3. Click "Save" button at top right
4. ✅ **Expected**:
   - Alert: "Workflow saved successfully!"
   - Returns to dashboard
   - New workflow appears in grid

**Load Workflow:**
1. From dashboard, click "Edit" on a saved workflow
2. ✅ **Expected**:
   - Canvas loads with all previously saved nodes
   - All connections/edges are restored
   - Workflow name and description populate at top
   - Can drag nodes around and modify

**Edit and Re-save:**
1. Edit an existing workflow
2. Add/remove nodes
3. Click "Save"
4. Go back and edit again
5. ✅ **Expected**: All changes should persist

---

### 4. Workflow Management Tests

**Activate Workflow (Run):**
1. From dashboard, click "Run" on a workflow
2. ✅ **Expected**:
   - Button changes to "Stop"
   - Green "ACTIVE" badge appears on the card
   - Any other active workflows become inactive (only 1 active at a time)

**Deactivate Workflow (Stop):**
1. Click "Stop" on an active workflow
2. ✅ **Expected**:
   - Button changes back to "Run"
   - "ACTIVE" badge disappears

**Delete Workflow:**
1. Click "Delete" on any workflow
2. Confirm deletion in popup
3. ✅ **Expected**:
   - Workflow disappears from dashboard
   - If it was active, no workflows are active now

**Single Active Workflow Enforcement:**
1. Create 3 workflows
2. Click "Run" on Workflow A → should be active
3. Click "Run" on Workflow B
4. ✅ **Expected**:
   - Workflow B is now active
   - Workflow A is automatically deactivated
   - Only one "ACTIVE" badge visible

---

### 5. Available Nodes Test

**Input Gestures (should have 7):**
- ✅ Swipe Left
- ✅ Swipe Right
- ✅ Thumbs Up
- ✅ Thumbs Down
- ✅ Palm
- ✅ Point
- ✅ Peace

**Output Actions (should have 5):**
- ✅ Press Key (Keyboard category)
- ✅ Lights ON (Light category)
- ✅ Lights OFF (Light category)
- ✅ Set Brightness (Light category)
- ✅ Cycle Color (Light category)

---

## Edge Cases to Test

**Multiple Connections:**
1. Try connecting one input to multiple outputs
2. ✅ **Expected**: Should be allowed (for future feature)

**Node Movement:**
1. Drag nodes around the canvas after placing them
2. ✅ **Expected**: Nodes move, connections follow

**Canvas Zoom/Pan:**
1. Use mouse wheel to zoom in/out
2. Click and drag on empty canvas space to pan
3. ✅ **Expected**: Canvas zooms and pans smoothly

**Empty Workflow Save:**
1. Create new workflow
2. Don't add any nodes
3. Try to save
4. ✅ **Expected**: Should save successfully (0 gestures)

**Missing Workflow Name:**
1. Create workflow
2. Delete the title
3. Try to save
4. ✅ **Expected**: Alert: "Please enter a workflow name"

---

## Database Persistence Tests

**Refresh Test:**
1. Create and save a workflow
2. Refresh the browser page
3. Log in again
4. ✅ **Expected**: Workflow is still there

**Multiple Sessions:**
1. Log in on one browser
2. Create workflow
3. Log in on another browser (same account)
4. ✅ **Expected**: Workflow appears in both browsers

---

## Known Limitations (Not Yet Implemented)

❌ Workflow execution doesn't actually control anything yet
❌ Node configuration is read-only (can't change keyboard keys, etc.)
❌ Can't customize gesture parameters
❌ No "Test Mode" to simulate gestures
❌ Camera feed not integrated with workflow builder yet

---

## Next Feature to Test: Server Integration

Once server integration is complete, test:
- Running a workflow actually sends mappings to server
- Gesture detection triggers the mapped actions
- Active workflow executes gestures in real-time
