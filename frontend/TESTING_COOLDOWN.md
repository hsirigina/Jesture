# Cooldown Modifier Testing Guide

## What Was Added

**Modifier Nodes** - A new type of node that goes between Input (gesture) and Output (action) nodes:
- Appears with orange border and ⚙️ icon
- Currently supports: **Cooldown** (prevents spam/repeated executions)
- Configuration is **editable** in the right panel

---

## Test 1: Add Cooldown Modifier to Workflow

### Steps:
1. **Restart the server**: `cd server && node server.js` (to pick up new code)
2. **Refresh browser**
3. **Create new workflow**: "Test Cooldown"
4. **Drag nodes onto canvas**:
   - Drag **"Thumbs Up"** (input gesture)
   - Drag **"Cooldown"** (modifier - orange border)
   - Drag **"Type 'hello'"** (output action)
5. **Connect nodes in order**:
   - Thumbs Up → Cooldown → Type "hello"
   - (Input connects to modifier, modifier connects to output)
6. **Click on Cooldown node**
7. **Check right sidebar** - should show:
   - Node Type: Modifier
   - Label: Cooldown
   - Editable input field: "Cooldown (milliseconds)"
   - Default value: 2000 (2.0 seconds)
8. **Save workflow**

### Expected Results:
✅ Cooldown node has orange left border
✅ Cooldown node shows ⚙️ icon
✅ Right panel shows editable cooldown input
✅ Default is 2000ms (2 seconds)

---

## Test 2: Run Workflow With Default Cooldown (2 seconds)

### Steps:
1. **Click "Run"** on the workflow
2. **Check server terminal** - should see:
   ```
   📋 Loading workflow: Test Cooldown
     ✓ Mapped: thumbs_up → Type "hello" [Cooldown]
   ✅ Workflow loaded with 1 gesture mappings
   ```
3. **Open a text editor** (Notes, TextEdit, etc.)
4. **Do thumbs up gesture** - hold for 2 seconds
5. **Wait for "hello" to finish typing**
6. **Immediately do thumbs up again** (without waiting)

### Expected Results:
✅ **First execution**: Types "hello" successfully
✅ **Server shows**: `✅ Executed workflow keyboard action: thumbs_up → Type "hello"`

✅ **Second execution (immediate)**: Does NOT type anything
✅ **Server shows**: `⏸️  Cooldown active for thumbs_up: [X]s remaining`
✅ **Browser console may show**: "Cooldown: [X]s" message

---

## Test 3: Cooldown Expires After 2 Seconds

### Steps:
1. After the immediate retry fails...
2. **Wait 2+ seconds**
3. **Do thumbs up gesture again**

### Expected Results:
✅ Types "hello" again (cooldown expired)
✅ Server shows successful execution message

---

## Test 4: Edit Cooldown Value

### Steps:
1. **Edit the workflow**
2. **Click on Cooldown node**
3. **In right sidebar**, change cooldown from `2000` to `5000` (5 seconds)
4. **Save workflow**
5. **Click "Run"** again
6. **Check server terminal** - should still show mapping with [Cooldown]
7. **Test the gesture**:
   - Do thumbs up → types "hello"
   - Immediately try again → blocked
   - **Wait 5 seconds** → try again → should work

### Expected Results:
✅ Cooldown value updates in the sidebar as you type
✅ Shows seconds conversion below input (e.g., "5.0 seconds")
✅ Server respects new 5-second cooldown
✅ Can't execute again until 5 seconds pass

---

## Test 5: Workflow Without Cooldown

### Steps:
1. **Create new workflow**: "No Cooldown Test"
2. **Add nodes**:
   - Thumbs Up → Type "hello" (direct connection, NO modifier)
3. **Save and Run**
4. **Do thumbs up repeatedly** (as fast as possible)

### Expected Results:
✅ Types "hello" multiple times in rapid succession
✅ **Problem demonstrated**: Spam/overlapping text
✅ **This is why cooldown is useful!**

---

## Test 6: Multiple Gestures With Different Cooldowns

### Steps:
1. **Create workflow**: "Multi-Gesture Cooldown"
2. **Add nodes**:
   - Thumbs Up → Cooldown (2000ms) → Type "A"
   - Peace → Cooldown (5000ms) → Type "B"
3. **Save and Run**
4. **Test each gesture independently**:
   - Thumbs up → types "A" → wait 2s → thumbs up → types "A" again ✅
   - Peace → types "B" → wait 2s → peace → blocked ❌
   - Peace → types "B" → wait 5s → peace → types "B" again ✅

### Expected Results:
✅ Each gesture has independent cooldown tracking
✅ Thumbs up can execute every 2 seconds
✅ Peace can only execute every 5 seconds
✅ One gesture's cooldown doesn't affect another

---

## Test 7: Cooldown Values Edge Cases

### Test different cooldown values:

**0ms cooldown** (no delay):
1. Set cooldown to `0`
2. Should allow rapid repeated execution (same as no modifier)

**100ms cooldown** (very short):
1. Set cooldown to `100`
2. Should allow execution roughly 10 times per second
3. Prevents immediate spam but allows quick repetition

**10000ms cooldown** (10 seconds):
1. Set cooldown to `10000`
2. Can only execute once every 10 seconds
3. Good for actions that shouldn't repeat often

---

## Test 8: Server Console Messages

### Check server logs for these patterns:

**Successful execution:**
```
Gesture detected: { gesture: 'thumbs_up', ... }
✅ Executed workflow keyboard action: thumbs_up → Type "hello"
```

**Cooldown blocking execution:**
```
Gesture detected: { gesture: 'thumbs_up', ... }
⏸️  Cooldown active for thumbs_up: 1.5s remaining
```

**Workflow loading with modifier:**
```
📋 Loading workflow: Test Cooldown
  ✓ Mapped: thumbs_up → Type "hello" [Cooldown]
✅ Workflow loaded with 1 gesture mappings
```

---

## Common Issues & Solutions

### Issue: Cooldown node doesn't connect
**Cause**: Trying to connect input directly to output after placing cooldown
**Fix**: Delete existing edge, reconnect: Input → Cooldown → Output

### Issue: Cooldown value doesn't save
**Cause**: Didn't click "Save" on workflow after editing
**Fix**: Always click "Save" after changing cooldown value

### Issue: Gesture still executes during cooldown
**Check**:
- Is the modifier actually connected in the path?
- Did you restart the server after code changes?
- Check server logs - does it show [Cooldown] in the mapping?

### Issue: Can't edit cooldown value
**Cause**: Modifier node isn't selected
**Fix**: Click on the Cooldown node first, then right panel shows editable field

---

## Success Criteria

All tests pass if:
✅ Cooldown modifier node appears in library (orange border, ⚙️ icon)
✅ Can drag and connect: Input → Cooldown → Output
✅ Right panel shows editable cooldown input when selected
✅ Cooldown value can be changed and saved
✅ Server loads workflow with [Cooldown] indicator
✅ Gesture execution is blocked during cooldown period
✅ Server logs show "⏸️ Cooldown active" with remaining time
✅ Execution allowed after cooldown expires
✅ Each gesture has independent cooldown tracking

---

## Next Steps

After testing, you have:
✅ **Modifier system** - Extensible for future modifiers
✅ **Cooldown prevention** - No more "hellohellohello" spam!
✅ **Editable configurations** - Can customize per workflow

**Future modifier ideas:**
- Max executions (limit to N times)
- Debouncing (wait for gesture to stop before triggering)
- Delay (wait X seconds before executing)
- Rate limiting (max X executions per minute)
