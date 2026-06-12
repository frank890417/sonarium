/**
 * L2 — scroll & resize: cached rects go stale (I8), the room follows the viewport (S7/S8).
 */
import type { Engine } from '../core/engine'

export function attachScroll(engine: Engine): () => void {
  let scrollQueued = false
  const onScroll = () => {
    if (scrollQueued) return
    scrollQueued = true
    requestAnimationFrame(() => {
      scrollQueued = false
      engine.geometryChanged()
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
