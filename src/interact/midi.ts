/**
 * L2-out — Web MIDI bridge (option `midi: true`): every trigger mirrors to the first MIDI
 * output as note events, channel per role. The page becomes a MIDI controller — record your
 * browsing into a DAW, or drive hardware from the DOM. Feature-detected; silent elsewhere.
 */
import type { Engine } from '../core/engine'
import type { Role, TriggerDetail } from '../types'

const ROLE_CHANNEL: Partial<Record<Role, number>> = {
  button: 0, link: 1, toggle: 2, input: 3, heading: 4, media: 5, item: 6, text: 7, container: 8,
}

export function attachMidi(engine: Engine): () => void {
  const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<unknown> }
  if (typeof nav.requestMIDIAccess !== 'function') return () => {}
  let out: { send(data: number[]): void } | null = null
  let off: (() => void) | null = null

  nav.requestMIDIAccess()
    .then((access) => {
      const a = access as unknown as { outputs: Map<string, { send(data: number[]): void }> }
      out = a.outputs.values().next().value ?? null
      if (!out) return
      off = engine.on('trigger', (detail) => {
        const d = detail as TriggerDetail
        const note = Math.max(0, Math.min(127, Math.round(d.profile.midi)))
        const vel = Math.max(1, Math.min(127, Math.round(d.velocity * d.profile.velocityScale * 127)))
        const ch = ROLE_CHANNEL[d.profile.role] ?? 9
        try {
          out!.send([0x90 | ch, note, vel])
          setTimeout(() => {
            try { out?.send([0x80 | ch, note, 0]) } catch { /* device gone */ }
          }, Math.min(4000, d.profile.durationS * 1000 + 60))
        } catch { /* device gone */ }
      })
    })
    .catch(() => { /* permission denied — stay silent */ })

  return () => off?.()
}
