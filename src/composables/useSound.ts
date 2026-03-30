import { ref, watch } from 'vue'

const STORAGE_KEY = 'watch:soundEnabled'

function loadSoundPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const soundEnabled = ref(loadSoundPref())

watch(soundEnabled, (v) => {
  localStorage.setItem(STORAGE_KEY, String(v))
})

let audioCtx: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  if (!soundEnabled.value) return
  const ctx = getContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration: number, volume = 0.1) {
  if (!soundEnabled.value) return
  const ctx = getContext()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(800, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

const sounds = {
  modalOpen() {
    playNoise(0.2, 0.08)
    playTone(220, 0.15, 'sine', 0.05)
  },
  modalClose() {
    playTone(800, 0.08, 'square', 0.08)
  },
  watchlistAdd() {
    playTone(600, 0.08, 'sine', 0.15)
    setTimeout(() => playTone(900, 0.1, 'sine', 0.12), 50)
  },
  watchlistRemove() {
    playTone(500, 0.1, 'sine', 0.1)
    setTimeout(() => playTone(300, 0.1, 'sine', 0.08), 60)
  },
  moodSelect() {
    playTone(440, 0.25, 'sine', 0.08)
    playTone(554, 0.25, 'sine', 0.06)
    playTone(659, 0.25, 'sine', 0.05)
  },
  gemFound() {
    playTone(1200, 0.15, 'sine', 0.1)
    setTimeout(() => playTone(1600, 0.12, 'sine', 0.08), 80)
  },
  markWatched() {
    playTone(500, 0.1, 'sine', 0.12)
    setTimeout(() => playTone(700, 0.1, 'sine', 0.1), 60)
    setTimeout(() => playTone(1000, 0.15, 'sine', 0.08), 120)
  },
  filterChange() {
    playTone(1000, 0.05, 'square', 0.06)
  },
}

function haptic(ms = 10) {
  if (soundEnabled.value && navigator.vibrate) {
    navigator.vibrate(ms)
  }
}

export function useSound() {
  return {
    soundEnabled,
    sounds,
    haptic,
  }
}
