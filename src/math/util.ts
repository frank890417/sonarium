export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Normalized position of v in [a, b], clamped to [0, 1]. */
export const norm = (v: number, a: number, b: number): number => clamp((v - a) / (b - a), 0, 1)

/** FNV-1a 32-bit — stable, dependency-free hash for site identity (MAPPING.md §0). */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
