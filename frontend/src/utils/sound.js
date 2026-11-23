const SOUND_STORAGE_KEY = 'qrsmart.sound_enabled'

let audioCtx = null
const listeners = new Set()

export function getSoundEnabled() {
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(Boolean(enabled)))
  } catch {
    // Ignorar en modos privados restrictivos
  }
  for (const listener of listeners) {
    listener(Boolean(enabled))
  }
}

export function subscribeSoundPreference(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) {
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playTone({
  freq,
  endFreq = null,
  type = 'sine',
  duration = 0.12,
  gain = 0.07,
  delay = 0,
  filterFreq = 3200,
}) {
  if (!getSoundEnabled()) return
  const ctx = getContext()
  if (!ctx) return

  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const filter = ctx.createBiquadFilter()
  const amp = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (endFreq && endFreq > 0) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration)
  }

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(filterFreq, start)

  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.015, duration * 0.25))
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(filter)
  filter.connect(amp)
  amp.connect(ctx.destination)

  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function triggerHaptic(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Algunos navegadores móviles bloquean vibración sin foco
    }
  }
}

export const soundFx = {
  /** Micro-clic táctil sutil para tabs, copias y botones */
  tap() {
    playTone({ freq: 760, endFreq: 420, type: 'triangle', duration: 0.035, gain: 0.032, filterFreq: 2400 })
  },

  /** Transición suave al abrir pase QR o copiar código */
  transition() {
    playTone({ freq: 523.25, type: 'sine', duration: 0.09, gain: 0.04, delay: 0 })
    playTone({ freq: 783.99, type: 'sine', duration: 0.13, gain: 0.04, delay: 0.045 })
  },

  /** Confirmación cálida para compra de ticket, transferencia o evento creado */
  success() {
    playTone({ freq: 523.25, type: 'triangle', duration: 0.11, gain: 0.055, delay: 0 })
    playTone({ freq: 659.25, type: 'sine', duration: 0.12, gain: 0.055, delay: 0.065 })
    playTone({ freq: 783.99, type: 'sine', duration: 0.15, gain: 0.055, delay: 0.13 })
    playTone({ freq: 1046.5, type: 'sine', duration: 0.24, gain: 0.05, delay: 0.195 })
    triggerHaptic([20, 30, 40])
  },

  /** Acceso permitido en puerta (HTTP 200) — tono limpio y claro */
  scanAllowed() {
    playTone({ freq: 659.25, type: 'triangle', duration: 0.11, gain: 0.08, delay: 0, filterFreq: 4200 })
    playTone({ freq: 987.77, type: 'sine', duration: 0.13, gain: 0.085, delay: 0.07, filterFreq: 4200 })
    playTone({ freq: 1318.51, type: 'sine', duration: 0.26, gain: 0.075, delay: 0.14, filterFreq: 4500 })
    triggerHaptic([30, 25, 60])
  },

  /** Ticket ya usado (HTTP 409) — doble pulso descendente de alerta */
  scanUsed() {
    playTone({ freq: 370, endFreq: 290, type: 'triangle', duration: 0.13, gain: 0.085, delay: 0, filterFreq: 1800 })
    playTone({ freq: 311.13, endFreq: 220, type: 'triangle', duration: 0.18, gain: 0.085, delay: 0.14, filterFreq: 1600 })
    triggerHaptic([110, 50, 110])
  },

  /** Ticket inválido / no encontrado (HTTP 404/400) — tono ámbar corto */
  scanInvalid() {
    playTone({ freq: 246.94, endFreq: 185, type: 'sine', duration: 0.22, gain: 0.08, delay: 0, filterFreq: 1400 })
    triggerHaptic([170])
  },

  /** Error sutil de validación o formulario */
  error() {
    playTone({ freq: 240, endFreq: 160, type: 'triangle', duration: 0.14, gain: 0.05, delay: 0, filterFreq: 1400 })
  },
}
