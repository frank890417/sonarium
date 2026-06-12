/**
 * L0/L2 bridge — the ListenerRig: where the ears are (ARCHITECTURE.md §2).
 * Pointer/center modes + device-tilt offset, lerped each frame to avoid zipper artifacts.
 */
import * as Tone from 'tone'
import { ROOM_HALF_H, ROOM_HALF_W } from '../math/mapping'
import { clamp, lerp } from '../math/util'

export class ListenerRig {
  private target = { x: 0, y: 0 }
  private tilt = { x: 0, y: 0 }
  private pos = { x: 0, y: 0 }
  private raf = 0
  private running = false

  constructor(private mode: 'pointer' | 'center') {}

  start(): void {
    if (this.running) return
    this.running = true
    const listener = Tone.getListener()
    // Listener faces -z (WebAudio default); voices live at negative z (MAPPING.md S1).
    listener.forwardX.value = 0
    listener.forwardY.value = 0
    listener.forwardZ.value = -1
    listener.upY.value = 1
    const step = () => {
      if (!this.running) return
      const gx = clamp(this.target.x + this.tilt.x, -ROOM_HALF_W, ROOM_HALF_W)
      const gy = clamp(this.target.y + this.tilt.y, -ROOM_HALF_H, ROOM_HALF_H)
      this.pos.x = lerp(this.pos.x, gx, 0.12)
      this.pos.y = lerp(this.pos.y, gy, 0.12)
      try {
        listener.positionX.value = this.pos.x
        listener.positionY.value = this.pos.y
        listener.positionZ.value = 0
      } catch { /* context may be closing */ }
      this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  /** I9 — pointer position (viewport-normalized 0..1) targets the ears. */
  pointTo(tx: number, ty: number): void {
    if (this.mode !== 'pointer') return
    // ×0.8: ears track the cursor but stay slightly behind it, keeping the field stable.
    this.target.x = (2 * clamp(tx, 0, 1) - 1) * ROOM_HALF_W * 0.8
    this.target.y = (1 - 2 * clamp(ty, 0, 1)) * ROOM_HALF_H * 0.8
  }

  /** I10 — device tilt offsets the ears (γ → x ±4 m, β → y ±2 m). */
  tiltTo(gamma: number, beta: number): void {
    this.tilt.x = clamp(gamma / 45, -1, 1) * 4
    this.tilt.y = clamp((beta - 40) / 45, -1, 1) * -2
  }

  dispose(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }
}
