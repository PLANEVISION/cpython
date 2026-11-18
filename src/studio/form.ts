import * as THREE from 'three'
import { clamp, lerp, smoother } from './math'

export type FormParams = {
  height: number
  footRadius: number
  belly: number
  rim: number
  wall: number
  cavity: number
  footHeight: number
  notch: number
  noise: number
  trim: number
  scale: number
}

const FORM_KEYS = [
  'height',
  'footRadius',
  'belly',
  'rim',
  'wall',
  'cavity',
  'footHeight',
  'notch',
  'noise',
  'trim',
  'scale',
] as const satisfies readonly (keyof FormParams)[]

export const PROFILE_HALF = 40
export const PROFILE_COUNT = PROFILE_HALF * 2 + 2
export const RADIAL = 64

export const digForm: FormParams = {
  height: 0.56,
  footRadius: 0.2,
  belly: 0.58,
  rim: 0.2,
  wall: 0.5,
  cavity: 0.01,
  footHeight: 0.01,
  notch: 0,
  noise: 0.095,
  trim: 0,
  scale: 1,
}

export const wedgeForm: FormParams = {
  height: 0.44,
  footRadius: 0.24,
  belly: 0.52,
  rim: 0.24,
  wall: 0.46,
  cavity: 0.012,
  footHeight: 0.01,
  notch: 0,
  noise: 0.04,
  trim: 0,
  scale: 1,
}

export const columnForm: FormParams = {
  height: 0.7,
  footRadius: 0.27,
  belly: 0.29,
  rim: 0.26,
  wall: 0.16,
  cavity: 0.03,
  footHeight: 0.02,
  notch: 0,
  noise: 0.016,
  trim: 0,
  scale: 1,
}

export const openedForm: FormParams = {
  height: 0.5,
  footRadius: 0.2,
  belly: 0.48,
  rim: 0.6,
  wall: 0.07,
  cavity: 0.46,
  footHeight: 0.04,
  notch: 0.006,
  noise: 0.008,
  trim: 0.04,
  scale: 1,
}

export const trimmedForm: FormParams = {
  height: 0.46,
  footRadius: 0.18,
  belly: 0.44,
  rim: 0.58,
  wall: 0.036,
  cavity: 0.5,
  footHeight: 0.058,
  notch: 0.026,
  noise: 0.002,
  trim: 0.75,
  scale: 1,
}

export const driedForm: FormParams = {
  height: 0.44,
  footRadius: 0.17,
  belly: 0.42,
  rim: 0.55,
  wall: 0.034,
  cavity: 0.48,
  footHeight: 0.054,
  notch: 0.024,
  noise: 0.0015,
  trim: 0.16,
  scale: 0.96,
}

export const bisqueForm: FormParams = {
  ...driedForm,
  scale: 0.94,
  trim: 0.08,
  noise: 0.0015,
}

export const finishedForm: FormParams = {
  ...bisqueForm,
  trim: 0,
  noise: 0.002,
}

export const holdForms = [
  digForm,
  wedgeForm,
  openedForm,
  trimmedForm,
  driedForm,
  bisqueForm,
  bisqueForm,
  finishedForm,
]

export function createForm(source: FormParams = digForm): FormParams {
  return { ...source }
}

export function lerpForm(a: FormParams, b: FormParams, t: number, out: FormParams) {
  for (const key of FORM_KEYS) out[key] = lerp(a[key], b[key], t)
  return out
}

const profilePool = Array.from({ length: PROFILE_COUNT }, () => new THREE.Vector2())

export function writeProfile(form: FormParams, pts: THREE.Vector2[] = profilePool) {
  const half = PROFILE_HALF
  const footH = Math.min(Math.max(form.footHeight, 0.001), form.height * 0.42)
  const solid = form.cavity < 0.08

  for (let i = 0; i <= half; i += 1) {
    const t = i / half
    const y = t * form.height
    let radius: number
    if (solid) {
      if (form.belly < 0.36) {
        radius = form.belly * (0.94 + 0.06 * Math.sin(t * Math.PI))
        if (t < 0.08) radius *= lerp(0.72, 1, t / 0.08)
        if (t > 0.9) radius *= lerp(1, 0.2, (t - 0.9) / 0.1)
      } else {
        const dome = Math.sin(t * Math.PI)
        radius = form.belly * Math.pow(Math.max(dome, 0), 0.58)
        if (t > 0.8) radius = lerp(radius, 0.008, smoother((t - 0.8) / 0.2) ** 2)
      }
    } else if (y <= footH) {
      const k = smoother(y / footH)
      radius = lerp(Math.max(form.footRadius * 0.55, 0.04), form.footRadius, k)
    } else {
      const k = (y - footH) / (form.height - footH)
      const eased = 1 - Math.pow(1 - clamp(k, 0, 1), 1.28)
      const base = lerp(form.footRadius, form.rim, eased)
      const mid = lerp(form.footRadius, form.rim, 0.45)
      radius = base + Math.sin(clamp(k, 0, 1) * Math.PI) * (form.belly - mid) * 0.45
      if (k > 0.9) radius = lerp(radius, form.rim * 1.015, smoother((k - 0.9) / 0.1))
      if (form.notch > 0 && y > footH && y < footH + 0.07) {
        const nk = (y - footH) / 0.07
        radius -= Math.sin(nk * Math.PI) * form.notch
      }
      if (form.trim > 0.45 && y > footH + 0.04) {
        radius -= Math.abs(Math.sin(y * 70)) * 0.0016 * form.trim
      }
    }
    const floor = solid && form.belly >= 0.36 && i === half ? 0.002 : 0.02
    pts[i].set(Math.max(radius, floor) * form.scale, y * form.scale)
  }

  const rim = pts[half]
  for (let i = half; i >= 0; i -= 1) {
    const slot = half + 1 + (half - i)
    if (solid && form.belly >= 0.36) {
      pts[slot].set(0.002 * form.scale, rim.y * (i / half) * 0.2)
      continue
    }
    if (i === half) {
      pts[slot].copy(rim)
      continue
    }
    const t = i / half
    const outer = pts[i]
    const floorY = (form.footHeight + 0.05) * form.scale
    const y = lerp(floorY, rim.y * 0.99, Math.pow(t, 0.7))
    const innerFloor = Math.max(0.02, form.cavity * 0.2) * form.scale
    const target = outer.x - form.wall * form.scale
    const cavityRadius = lerp(innerFloor, Math.max(target, innerFloor), Math.pow(t, 0.42))
    pts[slot].set(clamp(cavityRadius, 0.02, Math.max(0.025, outer.x - 0.01)), y)
  }
  return pts
}

export function createVesselGeometry(radial = RADIAL) {
  const geometry = new THREE.BufferGeometry()
  const vertices = (radial + 1) * PROFILE_COUNT
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertices * 2), 2))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3))
  const indices: number[] = []
  for (let i = 0; i < radial; i += 1) {
    for (let j = 0; j < PROFILE_COUNT - 1; j += 1) {
      const base = j + i * PROFILE_COUNT
      const a = base
      const b = base + PROFILE_COUNT
      const c = base + PROFILE_COUNT + 1
      const d = base + 1
      indices.push(a, b, d, c, d, b)
    }
  }
  geometry.setIndex(indices)
  return geometry
}

const meridianX = new Float32Array(PROFILE_COUNT)
const meridianY = new Float32Array(PROFILE_COUNT)

export function writeVessel(geometry: THREE.BufferGeometry, form: FormParams, radial = RADIAL) {
  const points = writeProfile(form)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute

  let prevX = 0
  let prevY = 0
  for (let j = 0; j < PROFILE_COUNT; j += 1) {
    if (j === PROFILE_COUNT - 1) {
      const length = Math.hypot(prevX, prevY) || 1
      meridianX[j] = prevX / length
      meridianY[j] = prevY / length
      break
    }
    const dx = points[j + 1].x - points[j].x
    const dy = points[j + 1].y - points[j].y
    const nx = dy
    const ny = -dx
    if (j === 0) {
      const length = Math.hypot(nx, ny) || 1
      meridianX[j] = nx / length
      meridianY[j] = ny / length
    } else {
      const length = Math.hypot(nx + prevX, ny + prevY) || 1
      meridianX[j] = (nx + prevX) / length
      meridianY[j] = (ny + prevY) / length
    }
    prevX = nx
    prevY = ny
  }

  let cursor = 0
  for (let i = 0; i <= radial; i += 1) {
    const phi = (i / radial) * Math.PI * 2
    const sin = Math.sin(phi)
    const cos = Math.cos(phi)
    for (let j = 0; j < PROFILE_COUNT; j += 1) {
      const radius = points[j].x
      position.setXYZ(cursor, radius * sin, points[j].y, radius * cos)
      uv.setXY(cursor, i / radial, j / (PROFILE_COUNT - 1))
      normal.setXYZ(cursor, meridianX[j] * sin, meridianY[j], meridianX[j] * cos)
      cursor += 1
    }
  }
  const seam = radial * PROFILE_COUNT
  for (let j = 0; j < PROFILE_COUNT; j += 1) {
    const a = j
    const b = seam + j
    const nx = (normal.getX(a) + normal.getX(b)) * 0.5
    const ny = (normal.getY(a) + normal.getY(b)) * 0.5
    const nz = (normal.getZ(a) + normal.getZ(b)) * 0.5
    normal.setXYZ(a, nx, ny, nz)
    normal.setXYZ(b, nx, ny, nz)
  }
  position.needsUpdate = true
  uv.needsUpdate = true
  normal.needsUpdate = true
  geometry.computeBoundingSphere()
}

export function sameForm(a: FormParams, b: FormParams) {
  return FORM_KEYS.every((key) => Math.abs(a[key] - b[key]) < 0.0006)
}
