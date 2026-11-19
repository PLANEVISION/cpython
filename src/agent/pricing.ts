import {
  MAX_PRICE_STEP,
  PROFIT_FLOOR,
  TARGET_MARGIN,
  priceForMargin,
  type Cost,
} from './policy.ts'

export function roundUsd(value: number) {
  return Math.round(value * 100) / 100
}

export type PriceDecision = {
  applied: boolean
  price: number
  floor: number | null
  target: number | null
  reason: string
}

export function decidePrice(
  live: number,
  cost: Cost,
  competitor: number | null = null,
  maxStep = MAX_PRICE_STEP,
): PriceDecision {
  const floor = priceForMargin(cost, PROFIT_FLOOR)
  const costPlus = priceForMargin(cost, TARGET_MARGIN)
  if (floor === null || costPlus === null) {
    return { applied: false, price: live, floor, target: costPlus, reason: '广告分摊未知' }
  }
  const suggested = competitor ?? costPlus
  const floorCents = roundUsd(floor)
  const next = roundUsd(suggested)
  if (next < floorCents) {
    return { applied: false, price: live, floor: floorCents, target: next, reason: '低于利润底线' }
  }
  if (live <= 0) {
    return { applied: false, price: live, floor: floorCents, target: next, reason: '在售价无效' }
  }
  if (Math.abs(next - live) / live > maxStep) {
    return { applied: false, price: live, floor: floorCents, target: next, reason: '超过单次调价幅度' }
  }
  return { applied: true, price: next, floor: floorCents, target: next, reason: '底线内改价' }
}
