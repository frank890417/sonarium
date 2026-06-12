/**
 * L2 — drag glissando (MODULAR.md §3): press an interactive element and drag — the pointer
 * becomes a ribbon controller sweeping scale degrees. The initial hit stays immediate (the
 * ribbon only gates after 14 px of travel; latency invariant untouched).
 */
import type { Engine } from '../core/engine'

const START_PX = 14

export function attachDrag(engine: Engine): () => void {
  let session: { x0: number; el: Element; handle: ReturnType<Engine['ribbon']> } | null = null

  const onDown = (e: PointerEvent) => {
    if (!e.isPrimary) return
    const el = engine.scanner?.resolve(e.target as Element | null)
    if (!el) return
    const p = engine.scanner.profileFor(el)
    if (!p || p.role === 'container' || p.role === 'text') return
    session = { x0: e.clientX, el, handle: null }
  }

  const onMove = (e: PointerEvent) => {
    if (!session) return
    const dx = e.clientX - session.x0
    if (!session.handle) {
      if (Math.abs(dx) < START_PX) return
      session.handle = engine.ribbon(session.el)
      if (!session.handle) {
        session = null
        return
      }
    }
    session.handle.move(dx)
  }

  const end = () => {
    session?.handle?.release()
    session = null
  }

  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerup', end, { passive: true })
  window.addEventListener('pointercancel', end, { passive: true })
  return () => {
    end()
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
  }
}
