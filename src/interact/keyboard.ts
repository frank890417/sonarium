/**
 * L2 — keyboard: focus previews for Tab navigation (I4, accessibility parity) and
 * typing ticks that rise as the field fills (I5).
 */
import type { Engine } from '../core/engine'

const TICK_THROTTLE_MS = 30
// Pentatonic-safe intervals: ticks climb without ever clashing with the site key.
const FILL_INTERVALS = [0, 2, 4, 7, 9, 12, 14, 16] as const

export function attachKeyboard(engine: Engine): () => void {
  let lastTick = 0
  let lastPointerDownT = -Infinity

  // Clicking focuses too — that focus must stay silent or every click sounds twice
  // (ghost-trigger fix, v0.5). Only keyboard-driven focus (Tab) previews.
  const onPointerDown = () => {
    lastPointerDownT = performance.now()
  }

  const onFocus = (e: FocusEvent) => {
    if (performance.now() - lastPointerDownT < 500) return
    const el = engine.scanner?.resolve(e.target as Element | null)
    if (el) engine.excite(el, 0.35, 'preview')
  }

  const onKeydown = (e: KeyboardEvent) => {
    const t = e.target
    const editable = t instanceof HTMLElement
      && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)
    if (!editable) return
    const now = performance.now()
    if (now - lastTick < TICK_THROTTLE_MS) return
    lastTick = now
    const len = (t as HTMLInputElement).value?.length ?? t.textContent?.length ?? 0
    const interval = FILL_INTERVALS[Math.min(FILL_INTERVALS.length - 1, Math.floor(len / 4))] as number
    engine.excite(t, 0.15, 'tick', undefined, interval)
  }

  window.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true })
  window.addEventListener('focusin', onFocus, { passive: true })
  window.addEventListener('keydown', onKeydown, { passive: true })
  return () => {
    window.removeEventListener('pointerdown', onPointerDown, { capture: true })
    window.removeEventListener('focusin', onFocus)
    window.removeEventListener('keydown', onKeydown)
  }
}
