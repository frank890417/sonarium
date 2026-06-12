/**
 * L2 — embodied motion: device tilt steers the ears (I10), a shake strums the visible
 * page left→right (I11). iOS 13+ requires a permission request from a user gesture; attach()
 * runs inside the unlock gesture, so we ask immediately and degrade silently if refused.
 */
import type { Engine } from '../core/engine'

const SHAKE_THRESHOLD = 18 // m/s² deviation from gravity
const SHAKE_REFRACTORY_MS = 600

export function attachMotion(engine: Engine): () => void {
  if (typeof DeviceOrientationEvent === 'undefined') return () => {}

  let lastShake = 0
  let attached = false

  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return
    engine.rig?.tiltTo(e.gamma, e.beta)
  }

  const onMotion = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x == null || a.y == null || a.z == null) return
    const magnitude = Math.abs(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) - 9.81)
    const now = performance.now()
    if (magnitude > SHAKE_THRESHOLD && now - lastShake > SHAKE_REFRACTORY_MS) {
      lastShake = now
      engine.strum(engine.scanner.visibleElements(), 0.5)
    }
  }

  const listen = () => {
    if (attached) return
    attached = true
    window.addEventListener('deviceorientation', onOrientation, { passive: true })
    window.addEventListener('devicemotion', onMotion, { passive: true })
  }

  const request = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
  if (typeof request === 'function') {
    request.call(DeviceOrientationEvent)
      .then((state) => { if (state === 'granted') listen() })
      .catch(() => { /* user said no, or we were outside a gesture — stay silent */ })
  } else {
    listen()
  }

  return () => {
    if (!attached) return
    window.removeEventListener('deviceorientation', onOrientation)
    window.removeEventListener('devicemotion', onMotion)
  }
}
