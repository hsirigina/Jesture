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
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && hands && !isUnmounting) {
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
            // Request max frame rate from camera
            facingMode: 'user'
          })

          await camera.start()
        }
      } catch (err) {
        console.error('Camera initialization error:', err)
      }
    }

    const onResults = (results) => {
      if (!canvasRef.current || !overlayRef.current) return

      const canvas = canvasRef.current
      const overlay = overlayRef.current
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true, willReadFrequently: false })
      const octx = overlay.getContext('2d', { alpha: true, desynchronized: true, willReadFrequently: false })

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

        // Swipe detection: FAST movement wins over static gestures
        const velocity = Math.abs(deltaX) / (deltaTime / 1000)

        if (deltaTime > 50 && deltaTime < 400 && velocity > 0.4) {
          if (deltaX > 0.1) {
            gestureName = 'swipe_right'
          } else if (deltaX < -0.1) {
            gestureName = 'swipe_left'
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
        // Convert MediaPipe landmarks to fingerpose format
        // MediaPipe gives {x, y, z} but fingerpose expects array of [x, y, z]
        const landmarksArray = landmarks.map(point => [point.x, point.y, point.z])

        const estimatedGestures = GE.estimate(landmarksArray, 8.0)

        console.log('👋 All detected gestures:', estimatedGestures.gestures)

        if (estimatedGestures.gestures && estimatedGestures.gestures.length > 0) {
          // Sort by score and get the best match
          const bestGesture = estimatedGestures.gestures.reduce((prev, current) =>
            prev.score > current.score ? prev : current
          )

          if (bestGesture.score > 8.0) {
            gestureName = bestGesture.name
            console.log('🎯 Fingerpose detected:', bestGesture.name, 'score:', bestGesture.score.toFixed(2))
          }
        }
      }

      // HOLD TIME & COOLDOWN LOGIC
      if (gestureName) {
        // Determine hold time: swipes and palm are instant for tracking, others need 2000ms
        const isSwipeGesture = gestureName === 'swipe_left' || gestureName === 'swipe_right'
        const isPalmGesture = gestureName === 'palm'
        const requiredHoldTime = (isSwipeGesture || isPalmGesture) ? 0 : 2000

        // Check if this is a new gesture or continuation
        if (gestureHoldStartRef.current?.name === gestureName) {
          // Same gesture continuing
          const holdDuration = now - gestureHoldStartRef.current.startTime

          // Update progress bar (0-100%)
          const progress = Math.min(100, (holdDuration / requiredHoldTime) * 100)
          setHoldProgress({ gesture: gestureName, progress })

          // Check cooldown period (NO cooldown for palm, 500ms for others)
          const cooldownTime = isPalmGesture ? 0 : 500
          const timeSinceLastTrigger = now - lastTriggeredGestureRef.current.time
          const isSameGestureInCooldown =
            lastTriggeredGestureRef.current.name === gestureName &&
            timeSinceLastTrigger < cooldownTime

          if (holdDuration >= requiredHoldTime && !isSameGestureInCooldown) {
            // Gesture held long enough and not in cooldown
            console.log('✅ GESTURE TRIGGERED:', gestureName, `(held ${holdDuration}ms)`)
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
              onGestureDetected(gestureName, 0.9, {
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

        // Reset tracking if palm was being tracked
        if (lastTriggeredGestureRef.current.name === 'palm') {
          // Send reset signal to server
          if (onGestureDetected) {
            onGestureDetected('palm_release', 0, null)
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
