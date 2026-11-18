import * as THREE from 'three'
import { clamp, lerp, smoother } from './math'
import {
  type FormParams,
  columnForm,
  createForm,
  digForm,
  finishedForm,
  holdForms,
  lerpForm,
  openedForm,
  trimmedForm,
} from './form'

export type Look = {
  form: FormParams
  body: THREE.Color
  roughness: number
  clearcoat: number
  sheen: number
  env: number
  glaze: number
  rimBare: number
  fire: number
  wheel: number
  knead: number
}

type Surface = {
  body: string
  roughness: number
  clearcoat: number
  sheen: number
  env: number
  fire: number
  wheel: number
  knead: number
}

const surfaces: Surface[] = [
  { body: '#3E2C24', roughness: 0.96, clearcoat: 0, sheen: 0.08, env: 0.2, fire: 0, wheel: 0, knead: 0.2 },
  { body: '#463028', roughness: 0.9, clearcoat: 0.03, sheen: 0.14, env: 0.24, fire: 0, wheel: 0, knead: 1 },
  { body: '#5C4032', roughness: 0.7, clearcoat: 0.14, sheen: 0.24, env: 0.32, fire: 0, wheel: 1, knead: 0 },
  { body: '#6B4A38', roughness: 0.88, clearcoat: 0.02, sheen: 0.06, env: 0.22, fire: 0, wheel: 0, knead: 0 },
  { body: '#C4B5A6', roughness: 0.98, clearcoat: 0, sheen: 0.02, env: 0.16, fire: 0, wheel: 0, knead: 0 },
  { body: '#D8D1C7', roughness: 1, clearcoat: 0, sheen: 0, env: 0.14, fire: 1, wheel: 0, knead: 0 },
  { body: '#D8D1C7', roughness: 0.58, clearcoat: 0.2, sheen: 0.3, env: 0.36, fire: 0, wheel: 0, knead: 0 },
  { body: '#C4A484', roughness: 0.84, clearcoat: 0.2, sheen: 0.08, env: 0.28, fire: 0, wheel: 0, knead: 0 },
]

const bodyColors = surfaces.map((surface) => new THREE.Color(surface.body))
const tempForm = createForm()

export function createLook(): Look {
  return {
    form: createForm(digForm),
    body: new THREE.Color('#3E2C24'),
    roughness: 0.96,
    clearcoat: 0,
    sheen: 0.08,
    env: 0.2,
    glaze: 0,
    rimBare: 0,
    fire: 0,
    wheel: 0,
    knead: 0.2,
  }
}

function mixSurface(from: number, to: number, t: number, out: Look) {
  const a = surfaces[from]
  const b = surfaces[to]
  out.body.copy(bodyColors[from]).lerp(bodyColors[to], t)
  out.roughness = lerp(a.roughness, b.roughness, t)
  out.clearcoat = lerp(a.clearcoat, b.clearcoat, t)
  out.sheen = lerp(a.sheen, b.sheen, t)
  out.env = lerp(a.env, b.env, t)
  out.fire = lerp(a.fire, b.fire, t)
  out.wheel = lerp(a.wheel, b.wheel, t)
  out.knead = lerp(a.knead, b.knead, t)
}

export function resolveLook(stage: number, localT: number, reduced: boolean, out: Look) {
  const from = clamp(Math.round(stage), 0, 7)
  const hold = smoother

  if (from === 2 && !reduced) {
    const openT = hold(Math.min(localT / 0.72, 1))
    lerpForm(columnForm, openedForm, openT, tempForm)
    const toTrim = localT < 0.8 ? 0 : hold((localT - 0.8) / 0.2)
    lerpForm(tempForm, trimmedForm, toTrim, out.form)
    mixSurface(2, 3, toTrim, out)
    out.glaze = 0
    out.rimBare = 0
    return out
  }

  let morph = 0
  if (!reduced && from < 7) {
    if (from === 6) morph = localT < 0.82 ? 0 : hold((localT - 0.82) / 0.18)
    else morph = localT < 0.68 ? 0 : hold((localT - 0.68) / 0.32)
  }

  const formTo = from === 1 ? columnForm : holdForms[Math.min(from + 1, 7)]
  lerpForm(holdForms[from], from === 7 ? finishedForm : formTo, from === 7 ? 0 : morph, out.form)

  const surfaceTo = Math.min(from + 1, 7)
  mixSurface(from, from === 7 ? from : surfaceTo, from === 7 ? 0 : morph, out)

  if (from < 6) out.glaze = 0
  else if (from === 6) out.glaze = reduced ? 1 : hold(localT)
  else out.glaze = 1

  out.rimBare = from === 7 ? 1 : 0

  if (from === 6 && !reduced) {
    const preheat = localT < 0.78 ? 0 : hold((localT - 0.78) / 0.22)
    out.fire = preheat * 0.7
  } else if (from === 7) {
    out.fire = reduced ? 0 : (1 - hold(Math.min(localT / 0.48, 1))) * 0.7
  }

  return out
}
