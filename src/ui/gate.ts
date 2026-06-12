/**
 * The unlock & mute chip — autoplay policy treated as a feature (PLAN.md R2).
 * Shadow DOM so host styles can't break it; ARIA so keyboard/SR users get the same control.
 */
const STORAGE_KEY = 'sonarium:muted'

export const isMutedPersisted = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

export const persistMuted = (muted: boolean): void => {
  try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0') } catch { /* private mode */ }
}

export interface GateHandle {
  setState: (state: 'armed' | 'on' | 'muted') => void
  dispose: () => void
}

export function mountGate(onToggle: () => void): GateHandle {
  const host = document.createElement('div')
  host.setAttribute('data-sonic', 'off') // the chip itself must never sound
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      button {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
        width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,.25);
        background: rgba(20, 22, 30, .82); color: #fff; font-size: 18px; line-height: 1;
        cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 4px 16px rgba(0,0,0,.35); transition: transform .15s ease, opacity .3s ease;
      }
      button:hover { transform: scale(1.08); }
      button:focus-visible { outline: 2px solid #7cd4fd; outline-offset: 2px; }
      button.armed { animation: pulse 1.6s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { box-shadow: 0 4px 16px rgba(0,0,0,.35); } 50% { box-shadow: 0 0 0 10px rgba(124,212,253,.18); } }
    </style>
    <button type="button" class="armed" aria-label="Enable sound" title="Sonarium — enable sound">🔇</button>
  `
  const btn = shadow.querySelector('button') as HTMLButtonElement
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    onToggle()
  })
  document.body.appendChild(host)

  return {
    setState(state) {
      btn.classList.toggle('armed', state === 'armed')
      if (state === 'on') {
        btn.textContent = '🔊'
        btn.setAttribute('aria-label', 'Mute Sonarium')
      } else if (state === 'muted') {
        btn.textContent = '🔇'
        btn.setAttribute('aria-label', 'Unmute Sonarium')
      } else {
        btn.textContent = '🔇'
        btn.setAttribute('aria-label', 'Enable sound')
      }
    },
    dispose() {
      host.remove()
    },
  }
}
