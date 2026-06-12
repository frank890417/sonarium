/**
 * L2 — activation: full notes on press (I2), container strums (I3), toggle intervals (I6).
 */
import type { Engine } from '../core/engine'
import { ELIGIBLE_SELECTOR } from '../core/scanner'

const DEDUPE_MS = 80

export function attachActivate(engine: Engine): () => void {
  const lastHit = new WeakMap<Element, number>()

  const activate = (target: Element | null) => {
    const el = engine.scanner?.resolve(target)
    if (!el) return
    const now = performance.now()
    if (now - (lastHit.get(el) ?? -Infinity) < DEDUPE_MS) return
    lastHit.set(el, now)

    const profile = engine.scanner.profileFor(el)
    if (!profile) return
    if (profile.role === 'toggle') return // sounded by the change handler (I6)
    if (profile.role === 'container') {
      const children = Array.from(el.querySelectorAll(ELIGIBLE_SELECTOR))
        .filter((c) => c.parentElement && engine.scanner.resolve(c) === c)
        .filter((c) => {
          const r = c.getBoundingClientRect()
          return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
        })
      if (children.length >= 2) {
        engine.strum(children, 0.5)
        return
      }
    }
    engine.excite(el, 0.75, 'hit')
  }

  // pointerdown for latency (<30 ms budget); click catches keyboard activation (Enter/Space).
  const onPointerDown = (e: PointerEvent) => activate(e.target as Element | null)
  const onClick = (e: MouseEvent) => activate(e.target as Element | null)

  const onChange = (e: Event) => {
    const t = e.target
    if (!(t instanceof HTMLInputElement) || (t.type !== 'checkbox' && t.type !== 'radio')) return
    const on = t.checked
    engine.excite(t, 0.5, on ? 'toggle-on' : 'toggle-off')
  }

  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('click', onClick, { passive: true })
  window.addEventListener('change', onChange, { passive: true })
  return () => {
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('click', onClick)
    window.removeEventListener('change', onChange)
  }
}
