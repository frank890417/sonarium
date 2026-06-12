/**
 * L2 — pointer: hover previews (I1) + look-around (I9).
 * Ghost-trigger guards (v0.5, user-reported): a "hover" only counts when the POINTER moved onto
 * the element. Scrolling moves elements under a stationary cursor and DOM mutations appear under
 * it — both fire pointerover without any user hover intent, and both are suppressed here.
 */
import type { Engine } from '../core/engine'
import type { Role } from '../types'

const PREVIEW_ROLES: ReadonlySet<Role> = new Set(['button', 'link', 'toggle', 'input', 'item', 'heading', 'media', 'text'])
const HOVER_THROTTLE_MS = 80
/** pointerover within this window after a scroll = the page moved, not the hand. */
const SCROLL_SUPPRESS_MS = 250
/** pointerover needs pointer movement at most this long ago to count as intentional. */
const MOVE_FRESHNESS_MS = 400
/** The resolved element must be within this many ancestors of the actual target —
 *  hovering a blank region must not preview some distant registered container. */
const MAX_RESOLVE_HOPS = 4

export function attachPointer(engine: Engine): () => void {
  const lastHover = new WeakMap<Element, number>()
  let lastScrollT = -Infinity
  let lastMoveT = -Infinity

  const onMove = (e: PointerEvent) => {
    lastMoveT = performance.now()
    engine.rig?.pointTo(e.clientX / window.innerWidth, e.clientY / window.innerHeight)
  }

  const onScroll = () => {
    lastScrollT = performance.now()
  }

  const withinHops = (target: Element, resolved: Element): boolean => {
    let n: Element | null = target
    for (let d = 0; n && d <= MAX_RESOLVE_HOPS; d++) {
      if (n === resolved) return true
      n = n.parentElement
    }
    return false
  }

  const onOver = (e: PointerEvent) => {
    const now = performance.now()
    if (now - lastScrollT < SCROLL_SUPPRESS_MS) return // page slid under the cursor
    if (now - lastMoveT > MOVE_FRESHNESS_MS) return //   nothing moved the pointer here
    const target = e.target as Element | null
    const el = engine.scanner?.resolve(target)
    if (!el || !target || !withinHops(target, el)) return
    const profile = engine.scanner.profileFor(el)
    if (!profile || !PREVIEW_ROLES.has(profile.role)) return
    if (now - (lastHover.get(el) ?? -Infinity) < HOVER_THROTTLE_MS) return
    lastHover.set(el, now)
    engine.excite(el, 0.25, 'preview')
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerover', onOver, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerover', onOver)
    window.removeEventListener('scroll', onScroll, { capture: true })
  }
}
