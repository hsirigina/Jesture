import { useEffect, useRef, useState } from 'react'
import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import * as fp from 'fingerpose'
import './CameraFeed.css'

// Define custom gestures using fingerpose
const ThumbsUpGesture = new fp.GestureDescription('thumbs_up')
ThumbsUpGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0)
ThumbsUpGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 1.0)
ThumbsUpGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpLeft, 0.9)
ThumbsUpGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpRight, 0.9)
for (let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  ThumbsUpGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0)
}

const ThumbsDownGesture = new fp.GestureDescription('thumbs_down')
ThumbsDownGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0)
ThumbsDownGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalDown, 1.0)
ThumbsDownGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalDownLeft, 0.9)
ThumbsDownGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalDownRight, 0.9)
for (let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  ThumbsDownGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0)
}

const PalmGesture = new fp.GestureDescription('palm')
for (let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  PalmGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0)
}
PalmGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 0.5)

const PointGesture = new fp.GestureDescription('point')
PointGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0)
PointGesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0)
PointGesture.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft, 0.9)
PointGesture.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpRight, 0.9)
for (let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  PointGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0)
}
PointGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 0.9)
PointGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.9)

const PeaceGesture = new fp.GestureDescription('peace')
PeaceGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0)
PeaceGesture.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0)
for (let finger of [fp.Finger.Ring, fp.Finger.Pinky]) {
  PeaceGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0)
}

const CameraFeed = ({ onGestureDetected }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const [detectedGesture, setDetectedGesture] = useState(null)
  const [holdProgress, setHoldProgress] = useState({ gesture: null, progress: 0 })
  const lastGestureTimeRef = useRef(0)
  const gestureTimeoutRef = useRef(null)
  const previousHandPositionRef = useRef(null)
  const gestureHoldStartRef = useRef(null)
  const lastTriggeredGestureRef = useRef({ name: null, time: 0 })
  const continuousMotionActiveRef = useRef(false) // Lock for continuous motion
  const gestureBufferRef = useRef([]) // Buffer to smooth gesture detection over multiple frames
  const palmPointWaitingRef = useRef(null) // Track palm/point waiting for swipe (AI Mode feature)

  useEffect(() => {
    let camera = null
    let hands = null
    let isUnmounting = false

    // Initialize fingerpose GestureEstimator
    const GE = new fp.GestureEstimator([
      ThumbsUpGesture,
      ThumbsDownGesture,
      PalmGesture,
      PointGesture,
      PeaceGesture
    ])

    const initializeCamera = async () => {
      if (isUnmounting) return
      try {
        // Completely suppress MediaPipe console spam
        const originalWarn = console.warn
        console.warn = () => {} // Disable all warnings (MediaPipe spams constantly)

        hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          }
        })

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0, // Lowest complexity = less memory
          minDetectionConfidence: 0.3, // Lower = faster but less accurate
          minTrackingConfidence: 0.3,
          selfieMode: false // Better performance
        })

        hands.onResults(onResults)

        if (videoRef.current) {
          let lastFrameTime = 0
          const targetFPS = 240 // Ultra-high FPS for maximum smoothness
          const frameDuration = 1000 / targetFPS

          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && hands && !isUnmounting) {
                const now = performance.now()
                if (now - lastFrameTime < frameDuration) {
                  return // Skip frame to maintain target FPS
                }
                lastFrameTime = now

                try {
                  await hands.send({ image: videoRef.current })
                } catch (err) {
                  // Ignore errors from unmounting
                  if (!isUnmounting) {
                    console.error('Frame processing error:', err)
                  }
                }
              }
            },
            width: 640,
            height: 480,
            facingMode: 'user'
          })

          await camera.start()
        }
      } catch (err) {
        console.error('Camera initialization error:', err)
      }
    }

    // Store canvas contexts once to prevent memory leaks
    let ctx = null
    let octx = null

    const onResults = (results) => {
      if (!canvasRef.current || !overlayRef.current) return

      const canvas = canvasRef.current
      const overlay = overlayRef.current

      // Get contexts only once
      if (!ctx) ctx = canvas.getContext('2d', { alpha: false, desynchronized: true, willReadFrequently: false })
      if (!octx) octx = overlay.getContext('2d', { alpha: true, desynchronized: true, willReadFrequently: false })

      // VIDEO CANVAS - Draw EVERY frame for smoothness
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(-1, 1)
      ctx.translate(-canvas.width, 0)
      if (results.image) {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)
      }
      ctx.restore()

      // OVERLAY - Draw EVERY frame for smoothness
      octx.clearRect(0, 0, overlay.width, overlay.height)

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0]

        octx.save()
        octx.scale(-1, 1)
        octx.translate(-overlay.width, 0)

        // Draw all connections
        drawConnectors(octx, landmarks, Hands.HAND_CONNECTIONS, {
          color: '#00ff00',
          lineWidth: 2
        })

        // Draw all 21 landmark points
        drawLandmarks(octx, landmarks, {
          color: '#00ff00',
          fillColor: '#ffffff',
          radius: 3
        })

        octx.restore()

        // Gesture detection - run EVERY frame for maximum smoothness
        detectGestureSimple(landmarks)
      }
    }

    // Custom geometry-based gesture detection using landmark positions
    const detectGestureByGeometry = (landmarks) => {
      // Landmark indices: 0=wrist, 4=thumb tip, 8=index tip, 12=middle tip, 16=ring tip, 20=pinky tip
      // Base knuckles: 2=thumb base, 5=index base, 9=middle base, 13=ring base, 17=pinky base

      const thumbTip = landmarks[4]
      const thumbBase = landmarks[2]
      const indexTip = landmarks[8]
      const indexBase = landmarks[5]
      const middleTip = landmarks[12]
      const middleBase = landmarks[9]
      const ringTip = landmarks[16]
      const ringBase = landmarks[13]
      const pinkyTip = landmarks[20]
      const pinkyBase = landmarks[17]
      const wrist = landmarks[0]

      // Helper: Check if finger is extended (tip is above base)
      const isExtended = (tip, base) => tip.y < base.y - 0.05

      // Helper: Check if finger is CLEARLY curled (tip below base significantly)
      const isCurled = (tip, base) => tip.y > base.y + 0.03

      // Check individual fingers
      const thumbExtended = isExtended(thumbTip, thumbBase)
      const indexExtended = isExtended(indexTip, indexBase)
      const middleExtended = isExtended(middleTip, middleBase)
      const ringExtended = isExtended(ringTip, ringBase)
      const pinkyExtended = isExtended(pinkyTip, pinkyBase)

      // Check for clearly curled fingers
      const middleCurled = isCurled(middleTip, middleBase)
      const ringCurled = isCurled(ringTip, ringBase)
      const pinkyCurled = isCurled(pinkyTip, pinkyBase)

      // Helper: Distance between two points
      const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))

      // PRIORITY 1: POINT - Only index extended, middle/ring/pinky MUST be clearly curled
      if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        // STRICT: Middle, ring, and pinky must be CLEARLY curled (not ambiguous)
        if (middleCurled && ringCurled && pinkyCurled) {
          // Additional check: Index and middle should be FAR apart (middle curled down)
          const indexMiddleDist = distance(indexTip, middleTip)

          // If middle is truly curled, it should be much farther from index tip
          if (indexMiddleDist > 0.08) {
            // Make sure thumb is NOT pointing up (key distinction from thumbs_up)
            const thumbToWristDist = distance(thumbTip, wrist)
            const indexToWristDist = distance(indexTip, wrist)

            // Thumb should be closer to wrist than index (not extended upward)
            if (thumbToWristDist < indexToWristDist * 0.8) {
              return 'point'
            }
          }
        }
      }

      // PRIORITY 2: THUMBS UP - Only thumb extended upward, all fingers curled
      if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        // Make sure thumb is pointing UP not sideways
        if (thumbTip.y < wrist.y - 0.1) {
          return 'thumbs_up'
        }
      }

      // PRIORITY 3: THUMBS DOWN - Only thumb extended downward, all fingers curled
      if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        // Check if thumb is below wrist
        if (thumbTip.y > wrist.y + 0.1) {
          return 'thumbs_down'
        }
      }

      // PRIORITY 4: PEACE - Index and middle BOTH extended, close together
      if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        // Peace sign: index and middle should be CLOSE together (not spread apart)
        const indexMiddleDist = distance(indexTip, middleTip)

        // If they're close (< 0.08), it's definitely peace sign
        if (indexMiddleDist < 0.08) {
          return 'peace'
        }
      }

      // PRIORITY 5: PALM - All fingers extended (open hand)
      if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
        return 'palm'
      }

      return null
    }

    // Temporal smoothing: require gesture to be stable across multiple frames
    const smoothGestureDetection = (rawGesture) => {
      // Add to buffer
      gestureBufferRef.current.push(rawGesture)

      // Keep only last 5 frames
      if (gestureBufferRef.current.length > 5) {
        gestureBufferRef.current.shift()
      }

      // Need at least 3 frames to make a decision
      if (gestureBufferRef.current.length < 3) {
        return null
      }

      // Count occurrences of each gesture in buffer
      const counts = {}
      gestureBufferRef.current.forEach(g => {
        if (g) counts[g] = (counts[g] || 0) + 1
      })

      // Find most common gesture
      let maxCount = 0
      let consensusGesture = null
      for (const [gesture, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count
          consensusGesture = gesture
        }
      }

      // Require at least 3 out of 5 frames to agree (60% consensus)
      if (maxCount >= 3) {
        return consensusGesture
      }

      return null
    }

    const detectGestureSimple = (landmarks) => {
      const wrist = landmarks[0]
      let gestureName = null
      const now = Date.now()

      // PRIORITY 0: Check for SWIPE gestures FIRST (motion-based)
      if (previousHandPositionRef.current) {
        const currentX = wrist.x
        const previousX = previousHandPositionRef.current.x
        const deltaX = currentX - previousX
        const deltaTime = now - previousHandPositionRef.current.timestamp

        // Swipe detection: RELAXED thresholds for easier detection
        // If hand moves more than 5% of screen width in reasonable time = swipe
        if (deltaTime > 20 && deltaTime < 1000) {
          if (deltaX > 0.05) {
            gestureName = 'swipe_right'
            console.log('🌊🌊🌊 SWIPE RIGHT TRIGGERED!', { deltaX: deltaX.toFixed(3), deltaTime })
          } else if (deltaX < -0.05) {
            gestureName = 'swipe_left'
            console.log('🌊🌊🌊 SWIPE LEFT TRIGGERED!', { deltaX: deltaX.toFixed(3), deltaTime })
          }
        }
      }

      // Update previous hand position for swipe detection
      previousHandPositionRef.current = {
        x: wrist.x,
        y: wrist.y,
        timestamp: now
      }

      // Use fingerpose for static gesture detection (if no swipe)
      if (!gestureName) {
        // If continuous motion is active, ONLY look for point gesture (ignore others)
        if (continuousMotionActiveRef.current) {
          // Check if index finger is still extended (point gesture maintained)
          const indexTip = landmarks[8]
          const indexBase = landmarks[5]
          const middleTip = landmarks[12]

          // Simple check: index extended, middle curled
          const indexExtended = indexTip.y < indexBase.y - 0.1
          const middleCurled = middleTip.y > indexBase.y

          if (indexExtended && middleCurled) {
            gestureName = 'point' // Keep continuous motion active
          } else {
            // Lost point gesture - deactivate continuous motion
            continuousMotionActiveRef.current = false
          }
        } else {
          // Custom geometry-based gesture detection with temporal smoothing
          const rawGesture = detectGestureByGeometry(landmarks)
          gestureName = smoothGestureDetection(rawGesture) // Apply smoothing

          // If point gesture detected with consensus, activate continuous motion lock
          if (gestureName === 'point') {
            continuousMotionActiveRef.current = true
          }
        }
      }

      // HOLD TIME & COOLDOWN LOGIC
      if (gestureName) {
        // Determine hold time: swipes, palm, and point are instant for tracking, others need 2000ms
        const isSwipeGesture = gestureName === 'swipe_left' || gestureName === 'swipe_right'
        const isPalmGesture = gestureName === 'palm'
        const isPointGesture = gestureName === 'point'
        const requiredHoldTime = (isSwipeGesture || isPalmGesture || isPointGesture) ? 0 : 2000

        // Check if this is a new gesture or continuation
        if (gestureHoldStartRef.current?.name === gestureName) {
          // Same gesture continuing
          const holdDuration = now - gestureHoldStartRef.current.startTime

          // Update progress bar (0-100%)
          const progress = Math.min(100, (holdDuration / requiredHoldTime) * 100)
          setHoldProgress({ gesture: gestureName, progress })

          // Check cooldown period (NO cooldown for palm and point, 500ms for others)
          const cooldownTime = (isPalmGesture || isPointGesture) ? 0 : 500
          const timeSinceLastTrigger = now - lastTriggeredGestureRef.current.time
          const isSameGestureInCooldown =
            lastTriggeredGestureRef.current.name === gestureName &&
            timeSinceLastTrigger < cooldownTime

          if (holdDuration >= requiredHoldTime && !isSameGestureInCooldown) {
            // Gesture held long enough and not in cooldown
            setDetectedGesture(gestureName)
            setHoldProgress({ gesture: null, progress: 0 })

            // Clear previous timeout
            if (gestureTimeoutRef.current) {
              clearTimeout(gestureTimeoutRef.current)
            }

            // Hide after 2 seconds
            gestureTimeoutRef.current = setTimeout(() => {
              setDetectedGesture(null)
            }, 2000)

            // Trigger callback with hand position data
            if (onGestureDetected) {
              // Get index finger tip position (landmark 8) for cursor tracking
              const indexTip = landmarks[8]

              // Convert 'point' gesture to 'continuous_motion' with position tracking
              const actualGestureName = isPointGesture ? 'continuous_motion' : gestureName

              onGestureDetected(actualGestureName, 0.9, {
                x: indexTip.x,
                y: indexTip.y
              })
            }

            // Update last triggered
            lastTriggeredGestureRef.current = { name: gestureName, time: now }
          }
        } else {
          // New gesture detected, start hold timer
          gestureHoldStartRef.current = { name: gestureName, startTime: now }
          setHoldProgress({ gesture: gestureName, progress: 0 })
          console.log('👁️ Gesture candidate:', gestureName)
        }
      } else {
        // No gesture detected, reset hold timer and progress
        gestureHoldStartRef.current = null
        setHoldProgress({ gesture: null, progress: 0 })

        // Reset tracking if palm or point was being tracked
        if (lastTriggeredGestureRef.current.name === 'palm') {
          // Send reset signal to server
          if (onGestureDetected) {
            onGestureDetected('palm_release', 0, null)
          }
        }
        if (lastTriggeredGestureRef.current.name === 'point') {
          // Send reset signal for continuous motion
          continuousMotionActiveRef.current = false // Clear lock
          if (onGestureDetected) {
            onGestureDetected('continuous_motion_release', 0, null)
          }
        }
      }
    }

    initializeCamera()

    return () => {
      isUnmounting = true

      // Stop camera first to prevent new frames
      if (camera) {
        try {
          camera.stop()
        } catch (err) {
          // Ignore cleanup errors
        }
        camera = null
      }

      // Close hands immediately and forcefully
      if (hands) {
        try {
          hands.close()
        } catch (err) {
          // Ignore cleanup errors
        }
        hands = null
      }

      // Clear canvas contexts to free memory
      ctx = null
      octx = null

      // Clear any pending timeouts
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
        gestureTimeoutRef.current = null
      }
    }
  }, [onGestureDetected])

  return (
    <div className="camera-container">
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} width={640} height={480} className="camera-canvas" />
      <canvas ref={overlayRef} width={640} height={480} className="camera-overlay" />

      {/* Triggered Gesture Indicator */}
      {detectedGesture && (
        <div className="gesture-indicator">
          {detectedGesture}
        </div>
      )}

      {/* Hold Progress Bar */}
      {holdProgress.gesture && holdProgress.progress > 0 && (
        <div className="hold-progress-container">
          <div className="hold-progress-label">{holdProgress.gesture}</div>
          <div className="hold-progress-bar">
            <div
              className="hold-progress-fill"
              style={{ width: `${holdProgress.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CameraFeed
