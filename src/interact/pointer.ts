/**
 * L2 — pointer: hover previews (I1) + the cursor as the listener's head (I9).
 * Talks to the engine only via excite()/rig (never Tone, never profiles directly).
 */
import type { Engine } from '../core/engine'
import type { Role } from '../types'

const PREVIEW_ROLES: ReadonlySet<Role> = new Set(['button', 'link', 'toggle', 'input', 'item', 'heading', 'media', 'text'])
const HOVER_THROTTLE_MS = 80

export function attachPointer(engine: Engine): () => void {
  const lastHover = new WeakMap<Element, number>()

  const onMove = (e: PointerEvent) => {
    engine.rig?.pointTo(e.clientX / window.innerWidth, e.clientY / window.innerHeight)
  }

  const onOver = (e: PointerEvent) => {
    const el = engine.scanner?.resolve(e.target as Element | null)
    if (!el) return
    const profile = engine.scanner.profileFor(el)
    if (!profile || !PREVIEW_ROLES.has(profile.role)) return
    const now = performance.now()
    if (now - (lastHover.get(el) ?? -Infinity) < HOVER_THROTTLE_MS) return
    lastHover.set(el, now)
    engine.excite(el, 0.25, 'preview')
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerover', onOver, { passive: true })
  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerover', onOver)
  }
}
