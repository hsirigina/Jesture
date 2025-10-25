# Server Integration Testing Guide

## Prerequisites
1. **Start the server**: `cd server && node server.js`
2. **Start the frontend**: `cd frontend && npm run dev`
3. **Open browser**: `http://localhost:5173`
4. **Log in** with your account

---

## Test 1: Create and Run a Simple Workflow

### Steps:
1. From dashboard, click **"+ New Workflow"**
2. Name it: **"Test Keyboard Controls"**
3. **Drag "Swipe Right"** from left sidebar onto canvas
4. **Drag "Press Key"** from left sidebar onto canvas
5. **Connect** Swipe Right → Press Key (drag from right edge to left edge)
6. Click **"Save"**
7. Return to dashboard
8. Click **"Run"** on the workflow

### Expected Results:
✅ **In browser console:**
- "✅ Workflow loaded on server: Test Keyboard Controls"

✅ **In server terminal:**
- "📋 Loading workflow: Test Keyboard Controls"
- "  ✓ Mapped: swipe_right → Press Key"
- "✅ Workflow loaded with 1 gesture mappings"

✅ **In dashboard:**
- Green "ACTIVE" badge appears on the workflow card

---

## Test 2: Execute Gesture and Verify Action

### Steps:
1. With workflow active from Test 1
2. Open PowerPoint or any app where arrow keys work
3. In the browser, perform a **swipe right gesture** in front of camera
4. Hold for 2 seconds until it triggers

### Expected Results:
✅ **In browser:**
- Green progress bar fills up
- "swipe_right" appears in gesture indicator

✅ **In server terminal:**
- "Gesture detected: { gesture: 'swipe_right', confidence: 0.9, ... }"
- "✅ Executed workflow keyboard action: swipe_right → Press Right"

✅ **In PowerPoint/App:**
- **Should advance to next slide** (or move cursor right)

---

## Test 3: Multiple Gesture Mappings

### Steps:
1. Create new workflow: **"Presentation Full Control"**
2. Add and connect these nodes:
   - Swipe Right → Press Key
   - Swipe Left → Press Key
   - Thumbs Up → Press Key
3. Click **"Save"**
4. Click **"Run"**

### Expected Results:
✅ **In server terminal:**
- "📋 Loading workflow: Presentation Full Control"
- "  ✓ Mapped: swipe_right → Press Key"
- "  ✓ Mapped: swipe_left → Press Key"
- "  ✓ Mapped: thumbs_up → Press Key"
- "✅ Workflow loaded with 3 gesture mappings"

### Test each gesture:
- **Swipe Right** → Should press Right arrow
- **Swipe Left** → Should press Left arrow
- **Thumbs Up** → Should press F5 key (if configured)

---

## Test 4: Light Control Integration

### Steps:
1. Create new workflow: **"Light Controls"**
2. Add and connect:
   - Thumbs Up → Lights ON
   - Thumbs Down → Lights OFF
   - Peace → Cycle Color
3. Click **"Save"**
4. Click **"Run"**

### Expected Results:
✅ **In server terminal:**
- "📋 Loading workflow: Light Controls"
- "  ✓ Mapped: thumbs_up → Lights ON"
- "  ✓ Mapped: thumbs_down → Lights OFF"
- "  ✓ Mapped: peace → Cycle Color"
- "✅ Workflow loaded with 3 gesture mappings"

### Test each gesture:
- **Thumbs Up** → Govee lights turn ON
- **Thumbs Down** → Govee lights turn OFF
- **Peace** → Lights cycle through colors

---

## Test 5: Stop Workflow

### Steps:
1. With any workflow active
2. Click **"Stop"** button in dashboard

### Expected Results:
✅ **In browser console:**
- "✅ Workflow unloaded from server"

✅ **In server terminal:**
- "🗑️  Unloading active workflow"

✅ **In dashboard:**
- "ACTIVE" badge disappears
- Button changes back to "Run"

### Verify workflow is stopped:
- Perform any gesture
- **Should NOT execute any action** (server has no mappings)

---

## Test 6: Switch Between Workflows

### Steps:
1. Create Workflow A: Maps Swipe Right → Press Key
2. Create Workflow B: Maps Swipe Right → Lights ON
3. Click **"Run"** on Workflow A
4. Perform **Swipe Right** → Should press keyboard
5. Click **"Run"** on Workflow B (don't stop A first)
6. Perform **Swipe Right** again

### Expected Results:
✅ **After step 3:**
- Workflow A is active
- Swipe Right presses keyboard key

✅ **After step 5:**
- Workflow A automatically becomes inactive (no ACTIVE badge)
- Workflow B becomes active (ACTIVE badge appears)
- Only ONE workflow can be active at a time

✅ **After step 6:**
- Swipe Right now turns lights ON (uses Workflow B mapping)
- **NOT** pressing keyboard anymore

---

## Test 7: Empty Workflow (No Gestures)

### Steps:
1. Create workflow with name but **no nodes**
2. Click **"Save"**
3. Click **"Run"**

### Expected Results:
✅ **In server terminal:**
- "📋 Loading workflow: [name]"
- "✅ Workflow loaded with 0 gesture mappings"

✅ **Behavior:**
- Workflow is marked active
- Performing gestures does nothing (no mappings)
- No errors occur

---

## Test 8: Disconnected Gestures (Nodes Not Connected)

### Steps:
1. Create workflow
2. Add **Swipe Right** node (input)
3. Add **Press Key** node (output)
4. **Don't connect them** (no edge/line)
5. Click **"Save"** and **"Run"**

### Expected Results:
✅ **In server terminal:**
- "✅ Workflow loaded with 0 gesture mappings"

✅ **Behavior:**
- Swipe Right gesture does nothing (no connection = no mapping)

---

## Test 9: Reload/Refresh Persistence

### Steps:
1. Create and **Run** a workflow
2. **Refresh the browser page**
3. Log in again

### Expected Results:
✅ **In dashboard:**
- Workflow still shows "ACTIVE" badge (persisted in database)

⚠️ **However:**
- Server mappings are cleared on refresh
- Need to click **"Run"** again to reload workflow on server
- **(Future enhancement: Auto-load active workflow on page load)**

---

## Test 10: Server Console Debugging

### Check server logs for these patterns:

**Successful workflow load:**
```
📋 Loading workflow: My Workflow
  ✓ Mapped: swipe_right → Press Key
  ✓ Mapped: thumbs_up → Lights ON
✅ Workflow loaded with 2 gesture mappings
```

**Gesture execution:**
```
Gesture detected: { gesture: 'swipe_right', ... }
✅ Executed workflow keyboard action: swipe_right → Press Right
```

**Workflow unload:**
```
🗑️  Unloading active workflow
```

**No mapping found:**
```
No workflow action mapped for gesture: palm
```

---

## Common Issues & Solutions

### Issue: Gestures detected but no action happens
**Check:**
- Is workflow **actually active** (ACTIVE badge showing)?
- Did you click **"Run"** after creating it?
- Are nodes **connected** with a line?
- Check server terminal for "No workflow action mapped" message

### Issue: Server shows "0 gesture mappings"
**Cause:**
- Nodes exist but aren't connected
- Or workflow has no nodes at all

**Fix:**
- Edit workflow
- Connect input nodes to output nodes with lines
- Save and run again

### Issue: Wrong action executes
**Check:**
- Multiple workflows active (shouldn't happen, but check)
- Verify the correct workflow has ACTIVE badge
- Check server logs to see what mapping was loaded

### Issue: Server not receiving workflow
**Check:**
- Socket.IO connection (should show "Connected to server" in browser console)
- Server is running (`node server.js`)
- CORS is configured correctly (origin: http://localhost:5173)

---

## Success Criteria

All tests pass if:
✅ Creating workflow saves nodes/edges to database
✅ Running workflow sends mappings to server
✅ Server logs show correct gesture → action mappings
✅ Gestures trigger the mapped actions
✅ Keyboard actions press the correct keys
✅ Light actions control Govee lights
✅ Stopping workflow clears server mappings
✅ Only one workflow can be active at a time
✅ Switching workflows changes the active mappings

---

## Next Steps After Testing

If all tests pass, you have a **fully functional gesture workflow builder**! 🎉

**Future enhancements:**
- Auto-load active workflow when page loads
- Editable node configurations (change which key to press)
- Gesture sequences (combo moves)
- Multiple outputs per gesture
- Test mode to simulate gestures
