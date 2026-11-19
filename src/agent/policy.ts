export const PROFIT_FLOOR = 0.15
export const TARGET_MARGIN = 0.2
export const MAX_PRICE_STEP = 0.08
export const PACK_MARGIN_MIN_MM = 8
export const PACK_MARGIN_MAX_MM = 25
export const PACK_MARGIN_IDEAL_MM = 16
export const PACK_SCORE_MIN = 90
export const IMAGE_REJECT_PAUSE = 3
export const PRICE_CHANGE_PAUSE = 50
export const ODR_PAUSE = 0.008
export const LSR_PAUSE = 0.032
export const CANCEL_PAUSE = 0.02

export type Cost = {
  cogsUsd: number
  inboundUsd: number
  dutyUsd: number
  referralRate: number
  fulfillmentUsd: number
  adsUsd: number | null
  refundUsd: number
}

export type Signals = {
  imageRejects: number
  priceChanges: number
  odr: number
  lateShipmentRate: number
  cancelRate: number
}

export type Switches = {
  publish: boolean
  price: boolean
  ads: boolean
  purchase: boolean
}

export function fixedCost(cost: Cost) {
  if (cost.adsUsd === null) return null
  return (
    cost.cogsUsd +
    cost.inboundUsd +
    cost.dutyUsd +
    cost.fulfillmentUsd +
    cost.adsUsd +
    cost.refundUsd
  )
}

export function priceForMargin(cost: Cost, margin: number) {
  const fixed = fixedCost(cost)
  if (fixed === null) return null
  const denom = 1 - cost.referralRate - margin
  if (denom <= 0) return null
  return fixed / denom
}

export function automationSwitches(signals: Signals): Switches {
  const account =
    signals.odr >= ODR_PAUSE ||
    signals.lateShipmentRate >= LSR_PAUSE ||
    signals.cancelRate >= CANCEL_PAUSE
  return {
    publish: signals.imageRejects < IMAGE_REJECT_PAUSE,
    price: signals.priceChanges <= PRICE_CHANGE_PAUSE && !account,
    ads: !account,
    purchase: !account,
  }
}

export const switchesOpen: Switches = {
  publish: true,
  price: true,
  ads: true,
  purchase: true,
}
