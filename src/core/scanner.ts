/**
 * L1 Page Reading — eligibility, registry, observers, visible set (ARCHITECTURE.md §5).
 * Imports DOM only; produces data + callbacks, triggers nothing audible itself.
 */
import type { SonicProfile } from '../types'
import { profileOf, roleOf, type ProfileEnv } from './profile'

export const ELIGIBLE_SELECTOR = [
  'button', '[role=button]', 'input', 'textarea', 'select', '[contenteditable]',
  'a[href]', '[role=link]', 'summary', '[role=switch]', '[role=checkbox]',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role=heading]',
  'img', 'video', 'canvas', 'svg', 'picture',
  'li', 'tr', '[role=listitem]', '[role=option]', '[role=menuitem]', '[role=tab]',
  'nav', 'section', 'article', 'aside', 'form', 'fieldset', 'dialog',
  '[data-sonic-role]', '[data-sonic-note]',
].join(',')

const MAX_TRACKED = 400

interface Entry {
  profile: SonicProfile | null
  visible: boolean
}

export interface ScannerCallbacks {
  /** Fired when an element scrolls/loads into view after the initial scan (I7 whisper). */
  onAppear: (el: Element) => void
}

export class Scanner {
  readonly registry = new Map<Element, Entry>()
  private io: IntersectionObserver | null = null
  private mo: MutationObserver | null = null
  private capWarned = false
  private initialScanDone = false
  private mutationTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private env: ProfileEnv,
    private cb: ScannerCallbacks,
  ) {}

  scan(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const entry = this.registry.get(e.target)
          if (!entry) continue
          const was = entry.visible
          entry.visible = e.isIntersecting
          if (e.isIntersecting) entry.profile = null // rect changed while away; recompute lazily
          if (e.isIntersecting && !was && this.initialScanDone) this.cb.onAppear(e.target)
        }
      }, { threshold: 0.15 })
    }

    this.register(this.env.root)
    for (const el of Array.from(this.env.root.querySelectorAll(ELIGIBLE_SELECTOR))) this.register(el)

    if (typeof MutationObserver !== 'undefined') {
      this.mo = new MutationObserver((muts) => this.queueMutations(muts))
      this.mo.observe(this.env.root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-sonic', 'data-sonic-note', 'data-sonic-wave', 'data-sonic-role'] })
    }

    // Let the initial IntersectionObserver flood settle before treating entries as "appearances".
    setTimeout(() => { this.initialScanDone = true }, 300)
  }

  private register(el: Element): void {
    if (this.registry.has(el) || this.isOff(el)) return
    if (this.registry.size >= MAX_TRACKED) {
      if (!this.capWarned) {
        this.capWarned = true
        console.warn(`[sonarium] page exceeds ${MAX_TRACKED} tracked elements; extra elements stay silent`)
      }
      return
    }
    this.registry.set(el, { profile: null, visible: false })
    this.io?.observe(el)
  }

  private unregister(el: Element): void {
    if (!this.registry.has(el)) return
    this.registry.delete(el)
    this.io?.unobserve(el)
  }

  isOff(el: Element): boolean {
    let n: Element | null = el
    while (n) {
      if ((n as HTMLElement).dataset?.sonic === 'off') return true
      n = n.parentElement
    }
    return false
  }

  private queueMutations(muts: MutationRecord[]): void {
    if (this.mutationTimer) clearTimeout(this.mutationTimer)
    const records = muts
    this.mutationTimer = setTimeout(() => {
      for (const m of records) {
        if (m.type === 'attributes' && m.target instanceof Element) {
          const entry = this.registry.get(m.target)
          if (entry) entry.profile = null
          continue
        }
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof Element)) continue
          if (node.matches?.(ELIGIBLE_SELECTOR)) this.register(node)
          for (const el of Array.from(node.querySelectorAll?.(ELIGIBLE_SELECTOR) ?? [])) this.register(el)
        }
        for (const node of Array.from(m.removedNodes)) {
          if (!(node instanceof Element)) continue
          this.unregister(node)
          for (const el of Array.from(node.querySelectorAll?.(ELIGIBLE_SELECTOR) ?? [])) this.unregister(el)
        }
      }
    }, 150)
  }

  /** Profile with lazy compute + cache (cheap path: geometry invalidation only nulls it). */
  profileFor(el: Element): SonicProfile | null {
    if (this.isOff(el)) return null
    let entry = this.registry.get(el)
    if (!entry) {
      // Untracked but asked for (e.g. describe() on an arbitrary element): compute one-off.
      return safeProfile(el, this.env)
    }
    if (!entry.profile) entry.profile = safeProfile(el, this.env)
    return entry.profile
  }

  /** Geometry changed globally (scroll/resize): rects are stale, voices params survive. */
  invalidateRects(): void {
    for (const entry of this.registry.values()) entry.profile = null
  }

  visibleElements(): Element[] {
    const out: Element[] = []
    for (const [el, entry] of this.registry) if (entry.visible) out.push(el)
    return out
  }

  /** The element (or nearest registered ancestor) the scanner knows about. */
  resolve(target: Element | null): Element | null {
    let n: Element | null = target
    while (n) {
      if (this.registry.has(n)) return n
      n = n.parentElement
    }
    return null
  }

  updateEnv(vw: number, vh: number): void {
    this.env.vw = vw
    this.env.vh = vh
  }

  dispose(): void {
    if (this.mutationTimer) clearTimeout(this.mutationTimer)
    this.io?.disconnect()
    this.mo?.disconnect()
    this.registry.clear()
  }
}

function safeProfile(el: Element, env: ProfileEnv): SonicProfile | null {
  try {
    return profileOf(el, env)
  } catch (err) {
    console.warn('[sonarium] profile failed', err)
    return null
  }
}

export { roleOf }
