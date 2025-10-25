# Product Requirements Document: GestureThing

## 1. Executive Summary

**Project Name:** GestureThing
**Timeline:** 5-7 days (Hackathon)
**Vision:** A web application that enables users to control any device using hand gestures captured through their camera. An IFTTT-style visual interface allows users to map gestures to device actions without code.

**Core Value Proposition:** Transform natural hand movements into device controls through an intuitive drag-and-drop interface.

---

## 2. Technical Stack

### Frontend
- **Framework:** React + Vite
- **Gesture Recognition:** MediaPipe Hands (JavaScript)
- **ASL Recognition:** Pre-trained TensorFlow.js model
- **Real-time Communication:** Socket.IO client

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Real-time Communication:** Socket.IO
- **Device Control Libraries:**
  - nut-js (keyboard/mouse simulation)
  - Philips Hue API (smart lighting)

---

## 3. MVP Scope

### 3.1 Use Cases (Hackathon Demo)

#### Use Case 1: Presentation Control
**Goal:** Control presentation slides with hand gestures
**Gestures:**
- Swipe Left ’ Previous slide
- Swipe Right ’ Next slide
- Fist ’ Start/stop presentation

**Implementation:** nut-js sends keyboard events (Arrow Left/Right, F5)

---

#### Use Case 2: AR Drawing Canvas
**Goal:** Draw in the air using finger tracking
**Gestures:**
- Point (index finger) ’ Draw
- Fist ’ Stop drawing
- Palm ’ Clear canvas
- Peace sign ’ Change color

**Implementation:** Canvas API with finger position tracking

---

#### Use Case 3: Smart Home Control
**Goal:** Control Philips Hue light bulb with gestures
**Gestures:**
- Thumbs Up ’ Turn light on
- Thumbs Down ’ Turn light off
- Peace Sign ’ Cycle through colors
- Palm ’ Brightness up
- Fist ’ Brightness down

**Implementation:** HTTP API calls to Hue Bridge

---

#### Use Case 4: ASL Translator
**Goal:** Real-time American Sign Language letter recognition
**Features:**
- Live camera feed with hand skeleton overlay
- Letter detection and display
- Word builder (accumulates letters)
- Clear/delete last letter gestures

**Implementation:** TensorFlow.js pre-trained ASL model

---

## 4. Core Features

### 4.1 Visual Gesture Mapping Interface
**Description:** Drag-and-drop interface for mapping gestures to actions

**Components:**
- **Gesture Library Panel:** Cards showing available gestures (fist, palm, point, etc.)
- **Action Library Panel:** Cards showing available actions by device
- **Mapping Canvas:** Visual workspace where users drag gesture cards onto action cards
- **Connection Indicators:** Visual lines showing active mappings

**User Flow:**
1. User drags "Swipe Right" gesture card
2. User drops onto "Next Slide" action card
3. Connection created and displayed
4. Mapping immediately active

---

### 4.2 Live Camera Feed with Hand Tracking
**Description:** Real-time video feed showing hand detection overlay

**Features:**
- 30 FPS camera capture
- MediaPipe hand skeleton visualization (21 landmarks per hand)
- Gesture confidence indicator
- Activation state visual feedback (green border when in control mode)

---

### 4.3 Device Connection Manager
**Description:** Interface for connecting and managing controllable devices

**Supported Devices (MVP):**
- **Local Computer:** Auto-detected (always available)
- **Philips Hue:** Auto-discover via mDNS, manual IP entry fallback

**UI Components:**
- Device list with connection status (connected/disconnected)
- "Add Device" button with device type selector
- Connection settings modal (IP address, API key for Hue)
- Test connection button

**Hue Setup Flow:**
1. User clicks "Add Hue Bulb"
2. App scans network for Hue Bridge
3. User presses bridge button for pairing
4. App retrieves API key
5. App discovers connected bulbs
6. Bulbs appear in action library

---

### 4.4 Gesture Library (Predefined)

**8 Basic Gestures:**
1. **Fist:** All fingers closed
2. **Palm:** All fingers extended, hand flat
3. **Point:** Index finger extended
4. **Peace Sign:** Index + middle finger extended (V shape)
5. **Thumbs Up:** Thumb extended upward
6. **Thumbs Down:** Thumb extended downward
7. **Swipe Left:** Hand moves left rapidly
8. **Swipe Right:** Hand moves right rapidly

**Detection Parameters:**
- Confidence threshold: 0.8
- Gesture hold time: 300ms (prevents accidental triggers)
- Cooldown period: 500ms between same gesture

---

### 4.5 Activation System
**Description:** Prevents accidental gesture triggers during normal hand movement

**Mechanism:**
- **Activation Gesture:** Show palm to camera
- **Hold Duration:** 2 seconds
- **Visual Feedback:** Progress ring around hand while holding
- **Active State:** Green border around video feed
- **Deactivation:** Show palm for 2 seconds again OR 30 seconds of inactivity

**States:**
- **Idle:** Hand tracking active, gestures ignored
- **Activating:** Palm shown, counting down
- **Active:** Gestures trigger actions
- **Deactivating:** Palm shown while active, counting down

---

### 4.6 Template Presets
**Description:** Pre-configured gesture mappings for common use cases

**Available Templates:**
1. **Presentation Mode**
   - Swipe Right ’ Next slide
   - Swipe Left ’ Previous slide
   - Fist ’ Start presentation
   - Thumbs Up ’ End presentation

2. **Smart Home Mode**
   - Thumbs Up ’ Lights on
   - Thumbs Down ’ Lights off
   - Peace Sign ’ Change color
   - Palm ’ Brightness up

3. **Media Player Mode**
   - Swipe Right ’ Next track
   - Swipe Left ’ Previous track
   - Fist ’ Play/pause
   - Palm ’ Volume up
   - Thumbs Down ’ Volume down

4. **ASL Translator Mode**
   - All gestures mapped to letter recognition
   - Special UI with letter display and word builder

**User Flow:**
1. User clicks "Templates" dropdown
2. Selects "Presentation Mode"
3. Gesture mappings auto-populate
4. User can modify or use as-is

---

## 5. Key User Flows

### 5.1 First-Time User Flow
1. User opens web app in browser
2. Camera permission prompt appears ’ User allows
3. Welcome screen with "Choose a template" or "Create custom mapping"
4. User selects "Presentation Mode" template
5. Gesture mappings auto-populate in mapping interface
6. User sees live camera feed with hand tracking
7. User performs palm activation gesture (2s hold)
8. Screen border turns green (active mode)
9. User swipes right ’ Next slide advances
10. Success confirmation shown

---

### 5.2 Adding Smart Home Device Flow
1. User on dashboard, clicks "Add Device"
2. Modal shows device types: "Philips Hue" or "Local Computer"
3. User selects "Philips Hue"
4. App scans network, displays "Press button on Hue Bridge"
5. User presses bridge button
6. App retrieves API key, discovers bulbs
7. Bulbs appear in device list with green "Connected" status
8. Bulb actions appear in action library panel
9. User drags "Thumbs Up" to "Turn On Living Room Light"
10. Mapping created, immediately active

---

### 5.3 ASL Translator Mode Flow
1. User clicks "Templates" ’ "ASL Translator"
2. Interface switches to ASL mode:
   - Larger camera feed
   - Letter display overlay (large text showing detected letter)
   - Word builder panel below (accumulates letters)
   - "Clear" and "Delete Last" buttons
3. User signs letter "H" ’ "H" appears in letter display
4. After 1 second, "H" moves to word builder
5. User signs "E", "L", "L", "O"
6. Word builder shows "HELLO"
7. User clicks "Clear" ’ Word builder resets

---

### 5.4 Custom Gesture Mapping Flow
1. User clicks "Create Custom Mapping"
2. Blank mapping canvas appears
3. Gesture library on left, empty action panel on right
4. User clicks "Add Device" ’ Adds Hue bulb
5. Hue actions appear in action panel
6. User drags "Peace Sign" gesture
7. User drops on "Change Color" action
8. Connection line drawn between cards
9. User activates control mode (palm gesture)
10. User makes peace sign ’ Light color changes
11. User clicks "Save Mapping" ’ Named and saved to "My Mappings"

---

## 6. Connection Architecture

### 6.1 Same-Device Control (Presentation/Media)
```
Browser (React App)
    “ WebSocket (Socket.IO)
Local Node Server
    “ nut-js API
Operating System Keyboard/Mouse
    “
Target Application (PowerPoint, Keynote, etc.)
```

**Data Flow:**
1. MediaPipe detects "Swipe Right" gesture
2. React app emits `gesture:detected` event via Socket.IO
3. Node server receives event with gesture type
4. Server maps gesture to keyboard action (Right Arrow)
5. nut-js simulates keypress
6. Presentation advances

---

### 6.2 Smart Bulb Control
```
Browser (React App)
    “ WebSocket (Socket.IO)
Local Node Server
    “ HTTP API Request
Philips Hue Bridge (Local Network)
    “ Zigbee Protocol
Hue Light Bulb
```

**Data Flow:**
1. MediaPipe detects "Thumbs Up" gesture
2. React app emits `gesture:detected` event
3. Node server receives event
4. Server makes HTTP PUT request to Hue API: `/api/{username}/lights/1/state`
5. Request body: `{"on": true}`
6. Hue Bridge sends Zigbee command to bulb
7. Bulb turns on
8. Server emits confirmation to browser
9. UI shows "Light turned on" feedback

---

### 6.3 WebSocket Event Schema

**Client ’ Server Events:**
```javascript
// Gesture detected
{
  event: 'gesture:detected',
  data: {
    gesture: 'swipe_right',
    confidence: 0.95,
    timestamp: 1640000000000
  }
}

// Request device list
{
  event: 'devices:list',
  data: {}
}

// Add new device
{
  event: 'device:add',
  data: {
    type: 'hue',
    config: { ip: '192.168.1.50' }
  }
}
```

**Server ’ Client Events:**
```javascript
// Action executed confirmation
{
  event: 'action:completed',
  data: {
    action: 'next_slide',
    success: true,
    message: 'Slide advanced'
  }
}

// Device list response
{
  event: 'devices:update',
  data: [
    { id: 'local', type: 'computer', status: 'connected' },
    { id: 'hue_1', type: 'hue', name: 'Living Room', status: 'connected' }
  ]
}

// Device connection error
{
  event: 'device:error',
  data: {
    deviceId: 'hue_1',
    error: 'Bridge not found on network'
  }
}
```

---

## 7. Technical Implementation Details

### 7.1 MediaPipe Hands Integration
```javascript
// Simplified gesture detection logic
import { Hands } from '@mediapipe/hands';

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.8
});

hands.onResults((results) => {
  if (results.multiHandLandmarks) {
    const landmarks = results.multiHandLandmarks[0];
    const gesture = recognizeGesture(landmarks);

    if (gesture && gesture.confidence > 0.8) {
      handleGesture(gesture);
    }
  }
});
```

**Gesture Recognition Logic:**
- Calculate angles between finger joints
- Measure distances between landmarks
- Compare against gesture templates
- Return gesture type + confidence score

---

### 7.2 Philips Hue API Integration
```javascript
// Server-side Hue control
const axios = require('axios');

class HueController {
  constructor(bridgeIP, username) {
    this.baseURL = `http://${bridgeIP}/api/${username}`;
  }

  async discoverBridge() {
    const response = await axios.get('https://discovery.meethue.com');
    return response.data[0].internalipaddress;
  }

  async createUser() {
    const response = await axios.post(
      `http://${this.bridgeIP}/api`,
      { devicetype: 'gesturething#app' }
    );
    return response.data[0].success.username;
  }

  async turnOn(lightId) {
    await axios.put(`${this.baseURL}/lights/${lightId}/state`, {
      on: true
    });
  }

  async setColor(lightId, hue) {
    await axios.put(`${this.baseURL}/lights/${lightId}/state`, {
      on: true,
      hue: hue, // 0-65535
      sat: 254,
      bri: 254
    });
  }
}
```

---

### 7.3 Keyboard Control with nut-js
```javascript
// Server-side keyboard simulation
const { keyboard, Key } = require('@nut-tree/nut-js');

async function executeKeyboardAction(action) {
  switch(action) {
    case 'next_slide':
      await keyboard.type(Key.Right);
      break;
    case 'previous_slide':
      await keyboard.type(Key.Left);
      break;
    case 'start_presentation':
      await keyboard.type(Key.F5);
      break;
  }
}
```

---

## 8. User Interface Specifications

### 8.1 Dashboard Layout
```
                                                         
 GestureThing                    [Templates ¼] [Settings]
                                                         $
                                                          
                                                    
                                Gesture Library     
    Camera Feed                              
    (640x480)                   =J       
                                             
    [Hand tracking]             Fist  Palm  Point   
                                                    
                                                       
                                                          
                                                      
   Active Mappings                                     
   Swipe Right             ’ Next Slide               
   Swipe Left              ’ Previous Slide           
   Thumbs Up               ’ Lights On                
                                                      
                                                          
                                                      
   Connected Devices               [+ Add Device]     
   Ï Local Computer (Keyboard)                        
   Ï Philips Hue - Living Room                        
                                                      
                                                         
```

---

### 8.2 Gesture Mapping Interface
```
                                                         
 Create Gesture Mapping                          [Save]  
                                                         $
                                                          
  Gestures              Mapping Canvas        Actions    
                                                  
   =J Fist                              Next      
                                        Slide     
                        Drop                      
    Palm              gesture                   
                        and             Previous  
                        action          Slide     
    Point             here to                   
                        connect                   
                                        Light On  
    Peace                                       
                                                  
                                        Light Off 
   =M Up                                          
                                                    
                                                         
```

---

### 8.3 ASL Translator Mode
```
                                                         
 ASL Translator Mode                         [Exit Mode] 
                                                         $
                                                          
                                                       
                                                       
              Camera Feed (800x600)                    
              [Hand skeleton overlay]                  
                                                       
                                                     
                     H    Detected                  
                            Letter                   
                                                       
                                                       
                                                          
                                                      
   Word Builder:                                       
    H E L L O                                          
                           [Delete Last] [Clear]       
                                                      
                                                          
                                                      
   Confidence: ˆˆˆˆˆˆˆˆ‘‘ 85%                         
                                                      
                                                         
```

---

## 9. Out of Scope (Post-Hackathon)

### Explicitly NOT Included in MVP:
- **Mobile App:** Web-only for hackathon
- **Drone Control:** Requires drone hardware + APIs
- **Robot Arm Control:** Requires robot hardware integration
- **Remote Control:** Cross-internet device control (security/networking complexity)
- **Custom Gesture Training:** ML model training interface
- **Multi-hand Gestures:** Two-handed gesture combinations
- **Voice Commands:** Audio integration
- **Gesture Recording:** Record and replay gesture sequences
- **Cloud Sync:** Save mappings to cloud
- **Multi-user Support:** User accounts and profiles

---

## 10. Success Metrics (Hackathon Demo)

### Must-Have for Demo:
1.  All 4 use cases functional (Presentation, AR Drawing, Hue Control, ASL)
2.  Gesture recognition accuracy >80% in good lighting
3.  <200ms latency from gesture to action
4.  Hue bulb connection works on first try
5.  Visual interface is intuitive (no explanation needed)
6.  Activation system prevents accidental triggers
7.  At least 2 templates work perfectly
8.  ASL translator recognizes 26 letters with >75% accuracy

### Nice-to-Have:
- Gesture confidence visualization
- Settings panel (adjust sensitivity, hold times)
- Dark mode UI
- Gesture history log
- Export/import mapping configurations

---

## 11. Development Timeline (5-7 Days)

### Day 1-2: Core Infrastructure
- Set up React + Vite project
- MediaPipe Hands integration
- Socket.IO client/server setup
- Basic camera feed + hand tracking visualization
- Gesture detection logic (8 basic gestures)

### Day 3-4: Device Integration
- nut-js keyboard control
- Philips Hue API integration
- Device connection manager UI
- Presentation Mode implementation
- Smart Home Mode implementation

### Day 5: Advanced Features
- AR Drawing canvas
- ASL translator (TensorFlow.js model integration)
- Activation system (palm hold)
- Template presets

### Day 6: UI/UX Polish
- Gesture mapping interface (drag-and-drop)
- Visual feedback improvements
- Error handling + user notifications
- Responsive design

### Day 7: Testing & Demo Prep
- End-to-end testing all use cases
- Demo script preparation
- Bug fixes
- Performance optimization

---

## 12. Technical Risks & Mitigations

### Risk 1: Gesture Recognition Accuracy
**Impact:** High - Core functionality
**Mitigation:**
- Use MediaPipe's pre-trained model (proven accuracy)
- Implement confidence thresholds
- Add gesture hold time to filter false positives
- Test in various lighting conditions

### Risk 2: Hue Bridge Discovery Failure
**Impact:** Medium - One use case affected
**Mitigation:**
- Implement manual IP entry fallback
- Clear on-screen instructions for bridge button press
- Test with multiple Hue Bridge versions

### Risk 3: Cross-Platform Keyboard Control
**Impact:** Medium - Presentation mode may vary by OS
**Mitigation:**
- Focus on one OS for demo (macOS or Windows)
- Document OS-specific key mappings
- nut-js supports Windows/macOS/Linux

### Risk 4: Camera Permission Issues
**Impact:** High - App won't work without camera
**Mitigation:**
- Clear permission request messaging
- Fallback UI showing troubleshooting steps
- HTTPS requirement for camera access (use localhost or ngrok)

### Risk 5: ASL Model Performance
**Impact:** Low - One feature among four
**Mitigation:**
- Use lightweight pre-trained model
- Focus on static letter signs (easier than dynamic)
- Acceptable accuracy threshold at 75%

---

## 13. Demo Script (3-Minute Pitch)

**Minute 1: Problem + Solution**
- "Imagine controlling your entire world with just hand gestures"
- Show gesture ’ light turns on (immediate wow factor)
- "No special hardware, just your camera and our app"

**Minute 2: Use Cases**
- Presentation Mode: Control slides hands-free while presenting
- Smart Home: Control lights without touching phone
- AR Drawing: Create art in mid-air
- ASL Translator: Bridge communication gaps

**Minute 3: How It Works**
- Show visual mapping interface
- Drag gesture to action
- "It's IFTTT for gestures"
- Show template presets
- Mention extensibility (future: drones, robots, more devices)

**Closing:**
- "GestureThing makes gesture control accessible to everyone"
- Live demo: Spell "HELLO" in ASL, draw a smiley face, turn off lights

---

## 14. Appendix

### A. Gesture Detection Algorithms

**Fist Detection:**
```javascript
function isFist(landmarks) {
  // Check if all fingertips are below their respective PIPs
  const fingers = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
  const pips = [6, 10, 14, 18];

  for (let i = 0; i < fingers.length; i++) {
    if (landmarks[fingers[i]].y < landmarks[pips[i]].y) {
      return false; // Finger is extended
    }
  }
  return true;
}
```

**Peace Sign Detection:**
```javascript
function isPeaceSign(landmarks) {
  const indexTip = landmarks[8];
  const indexPIP = landmarks[6];
  const middleTip = landmarks[12];
  const middlePIP = landmarks[10];
  const ringTip = landmarks[16];
  const ringPIP = landmarks[14];

  // Index and middle extended
  const indexExtended = indexTip.y < indexPIP.y;
  const middleExtended = middleTip.y < middlePIP.y;

  // Ring, pinky, thumb curled
  const ringCurled = ringTip.y > ringPIP.y;

  return indexExtended && middleExtended && ringCurled;
}
```

### B. Hue API Endpoints
```
GET  /api/{username}/lights              - List all lights
PUT  /api/{username}/lights/{id}/state   - Control light
POST /api                                - Create user (pairing)
GET  https://discovery.meethue.com       - Discover bridges
```

### C. File Structure
```
gesturething/
   client/                    # React frontend
      src/
         components/
            CameraFeed.jsx
            GestureMapper.jsx
            DeviceManager.jsx
            ASLTranslator.jsx
            ARDrawing.jsx
         services/
            gestureRecognition.js
            socketClient.js
            mediapipe.js
         App.jsx
         main.jsx
      package.json
   server/                    # Node.js backend
      controllers/
         keyboardController.js
         hueController.js
         gestureHandler.js
      services/
         deviceManager.js
         socketServer.js
      server.js
      package.json
   models/                    # TensorFlow.js models
      asl-model/
   README.md
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Status:** Ready for Implementation