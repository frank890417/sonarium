/**
 * FieldRig — embodiment for the ambisonic backend (SPATIAL.md §3.1): mouse-look on desktop,
 * device attitude on mobile, lerped per frame into one field rotation. Exposes the same
 * pointTo/tiltTo surface as the legacy ListenerRig so L2 drivers don't care which world they
 * live in.
 */
import { clamp, lerp } from '../math/util'
import { DEG } from './sh'
import { lookMatrix } from './rotation'
import type { SpatialBackend } from './backend'

const POINTER_YAW_MAX = 40 * DEG
const POINTER_PITCH_MAX = 20 * DEG
const TILT_YAW_MAX = 35 * DEG
const TILT_PITCH_MAX = 25 * DEG

export class FieldRig {
  private target = { yaw: 0, pitch: 0 }
  private tilt = { yaw: 0, pitch: 0 }
  private look = { yaw: 0, pitch: 0 }
  private raf = 0
  private running = false

  constructor(
    private backend: SpatialBackend,
    private mode: 'pointer' | 'center',
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    const step = () => {
      if (!this.running) return
      const gy = clamp(this.target.yaw + this.tilt.yaw, -Math.PI / 2, Math.PI / 2)
      const gp = clamp(this.target.pitch + this.tilt.pitch, -Math.PI / 3, Math.PI / 3)
      const ny = lerp(this.look.yaw, gy, 0.1)
      const np = lerp(this.look.pitch, gp, 0.1)
      if (Math.abs(ny - this.look.yaw) > 1e-4 || Math.abs(np - this.look.pitch) > 1e-4) {
        this.look.yaw = ny
        this.look.pitch = np
        this.backend.setRotation(lookMatrix(this.look.yaw, this.look.pitch))
      }
      this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  /** I9 — cursor (viewport-normalized 0..1) becomes look direction: right edge = look right. */
  pointTo(tx: number, ty: number): void {
    if (this.mode !== 'pointer') return
    this.target.yaw = (2 * clamp(tx, 0, 1) - 1) * POINTER_YAW_MAX
    this.target.pitch = (1 - 2 * clamp(ty, 0, 1)) * POINTER_PITCH_MAX
  }

  /** I10 — device attitude: γ right-tilt = look right, β beyond ~40° = look up/down. */
  tiltTo(gamma: number, beta: number): void {
    this.tilt.yaw = clamp(gamma / 45, -1, 1) * TILT_YAW_MAX
    this.tilt.pitch = clamp((beta - 40) / 45, -1, 1) * -TILT_PITCH_MAX
  }

  /** Public look API (head tracking / WebXR later plugs in here). Radians, right/up positive. */
  lookAt(yawRight: number, pitchUp: number): void {
    this.target.yaw = yawRight
    this.target.pitch = pitchUp
  }

  get state(): { yaw: number; pitch: number } {
    return { yaw: this.look.yaw, pitch: this.look.pitch }
  }

  dispose(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }
}
