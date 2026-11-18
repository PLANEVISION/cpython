import { clamp, smoother } from './math'

export const SECTION_WEIGHTS = [1, 1, 1.3, 1, 1, 1.15, 1.25, 2.2]
export const TOTAL_WEIGHT = SECTION_WEIGHTS.reduce((sum, weight) => sum + weight, 0)
export const SCROLL_VH = TOTAL_WEIGHT * 100

export type ScrollPose = {
  stage: number
  localT: number
  galleryT: number
}

export function mapScroll(progress: number): ScrollPose {
  let cursor = clamp(progress, 0, 1) * TOTAL_WEIGHT
  for (let index = 0; index < SECTION_WEIGHTS.length; index += 1) {
    const weight = SECTION_WEIGHTS[index]
    if (cursor < weight - 1e-4 || index === SECTION_WEIGHTS.length - 1) {
      const localT = clamp(cursor / weight, 0, 1)
      const galleryT = index === 7 ? smoother(clamp((localT - 0.46) / 0.34, 0, 1)) : 0
      return { stage: index, localT, galleryT }
    }
    cursor -= weight
  }
  return { stage: 7, localT: 1, galleryT: 1 }
}

export function startOfStage(index: number) {
  let cursor = 0
  const safe = clamp(Math.round(index), 0, SECTION_WEIGHTS.length - 1)
  for (let i = 0; i < safe; i += 1) cursor += SECTION_WEIGHTS[i]
  return cursor / TOTAL_WEIGHT
}
