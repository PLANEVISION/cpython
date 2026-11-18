import type Lenis from 'lenis'
import type { GlazeId } from '../data/stages'
import { clearGlaze } from './glazePaint'
import { mapScroll, startOfStage, type ScrollPose } from './scroll'

export const PITCH_MIN = (-20 * Math.PI) / 180
export const PITCH_MAX = (45 * Math.PI) / 180

export const drag = { active: false, x: 0, y: 0 }

export const studio = {
  stage: 0,
  localT: 0,
  galleryT: 0,
  reduced: false,
  glazeId: 'celadon' as GlazeId,
  soundOn: false,
  wheelHeld: false,
  glazeBoost: 0,
  hotspotOpen: false,
  yaw: 0.42,
  pitch: 0.08,
  autoSpin: true,
  wheelSpeed: 0,
  wheelAngle: 0,
}

let version = 0
const listeners = new Set<() => void>()
let lenis: Lenis | null = null

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getVersion() {
  return version
}

export function touch() {
  version += 1
  listeners.forEach((listener) => listener())
}

export function bindLenis(instance: Lenis | null) {
  lenis = instance
}

export function setStageFromScroll(next: ScrollPose) {
  const gallery = next.galleryT > 0.55
  const prevGallery = studio.galleryT > 0.55
  if (studio.stage >= 6 && next.stage < 6) {
    studio.glazeBoost = 0
    clearGlaze()
  }
  if (next.stage === 7 && studio.stage < 7) studio.autoSpin = !studio.reduced
  if (next.stage !== 2) studio.wheelHeld = false
  const changed = next.stage !== studio.stage || gallery !== prevGallery
  studio.stage = next.stage
  studio.localT = next.localT
  studio.galleryT = next.galleryT
  if (changed) {
    studio.hotspotOpen = false
    touch()
  }
}

export function readProgress() {
  if (lenis) return lenis.progress
  const limit = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
  return window.scrollY / limit
}

export function syncFromWindow() {
  setStageFromScroll(mapScroll(readProgress()))
}

export function scrollToStage(index: number) {
  const limit = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
  const top = Math.min(0.999, startOfStage(index) + 0.012) * limit
  if (!lenis || studio.reduced) window.scrollTo({ top, behavior: 'auto' })
  else lenis.scrollTo(top, { duration: 1.05 })
}
