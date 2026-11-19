import {
  PACK_MARGIN_IDEAL_MM,
  PACK_MARGIN_MAX_MM,
  PACK_MARGIN_MIN_MM,
  PACK_SCORE_MIN,
} from './policy.ts'

export type ShoeType = 'sneaker' | 'boot' | 'heel'

export const SHOE_LENGTH_MM: Record<number, number> = {
  6: 240,
  7: 250,
  8: 260,
  9: 270,
  10: 280,
  11: 290,
  12: 300,
}

export type BoxTemplate = {
  id: string
  shoeType: ShoeType
  sizeMin: number
  sizeMax: number
  innerLengthMm: number
  innerWidthMm: number
  innerHeightMm: number
  color: string
  materialCode: string
}

export type BoxMatch =
  | { ok: true; box: BoxTemplate; score: number; marginMm: number }
  | { ok: false; reason: string }

export function matchBox(shoeType: ShoeType, usSize: number | null, boxes: BoxTemplate[]): BoxMatch {
  if (usSize === null) return { ok: false, reason: '缺尺码' }
  const length = SHOE_LENGTH_MM[usSize]
  if (!length) return { ok: false, reason: '尺码没有内长对照' }

  const ranked = boxes.flatMap((box) => {
    if (box.shoeType !== shoeType) return []
    if (usSize < box.sizeMin || usSize > box.sizeMax) return []
    const marginMm = (box.innerLengthMm - length) / 2
    if (marginMm < PACK_MARGIN_MIN_MM || marginMm > PACK_MARGIN_MAX_MM) return []
    const score = 100 - Math.abs(marginMm - PACK_MARGIN_IDEAL_MM)
    if (score < PACK_SCORE_MIN) return []
    return [{ box, score, marginMm }]
  })

  ranked.sort((a, b) => b.score - a.score || a.box.id.localeCompare(b.box.id))
  const winner = ranked[0]
  if (!winner) return { ok: false, reason: '没有适配的盒型' }
  return { ok: true, box: winner.box, score: winner.score, marginMm: winner.marginMm }
}
