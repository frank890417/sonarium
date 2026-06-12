/**
 * L2 — scroll & resize: cached rects go stale (I8), the room follows the viewport (S7/S8),
 * and scroll velocity becomes air rushing past (MATTER.md §2.2).
 */
import { airRushGain } from '../math/matter'
import type { Engine } from '../core/engine'

export function attachScroll(engine: Engine): () => void {
  let scrollQueued = false
  let lastY = window.scrollY
  let lastT = performance.now()
  const onScroll = () => {
    if (scrollQueued) return
    scrollQueued = true
    requestAnimationFrame(() => {
      scrollQueued = false
      engine.geometryChanged()
      const now = performance.now()
      const dt = Math.max(1, now - lastT)
      const v = Math.abs(window.scrollY - lastY) / dt // px per ms
      lastY = window.scrollY
      lastT = now
      engine.airRush(airRushGain(v))
    })
  }

  let resizeQueued = false
  const onResize = () => {
    if (resizeQueued) return
    resizeQueued = true
    requestAnimationFrame(() => {
      resizeQueued = false
      engine.roomResized()
    })
  }

  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('resize', onResize, { passive: true })
  return () => {
    window.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', onResize)
  }
}
