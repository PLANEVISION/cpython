import { dominantHex } from './color.ts'
import type { BoxTemplate, ShoeType } from './packaging.ts'
import type { Cost } from './policy.ts'

export type Sku = {
  id: string
  titleZh: string
  bulletsZh: string[]
  shoeType: ShoeType
  usSize: number | null
  color: string
  livePrice: number
  cost: Cost
}

const sample = (pixels: number[]) => dominantHex(new Uint8ClampedArray(pixels))

export const SNEAKER_COLOR = sample([196, 148, 106, 255, 200, 152, 110, 255])
export const BOOT_COLOR = sample([92, 64, 52, 255, 100, 70, 56, 255])

const shoeCost = (
  cogsUsd: number,
  inboundUsd: number,
  dutyUsd: number,
  fulfillmentUsd: number,
  adsUsd: number | null,
): Cost => ({
  cogsUsd,
  inboundUsd,
  dutyUsd,
  referralRate: 0.15,
  fulfillmentUsd,
  adsUsd,
  refundUsd: 0,
})

export const BOXES: BoxTemplate[] = [
  {
    id: 'snk-9',
    shoeType: 'sneaker',
    sizeMin: 8,
    sizeMax: 10,
    innerLengthMm: 300,
    innerWidthMm: 180,
    innerHeightMm: 110,
    color: '#efe6d6',
    materialCode: 'BOX-SNK-9',
  },
  {
    id: 'snk-tight',
    shoeType: 'sneaker',
    sizeMin: 8,
    sizeMax: 10,
    innerLengthMm: 280,
    innerWidthMm: 170,
    innerHeightMm: 100,
    color: '#e7dcc8',
    materialCode: 'BOX-SNK-TIGHT',
  },
  {
    id: 'snk-loose',
    shoeType: 'sneaker',
    sizeMin: 8,
    sizeMax: 10,
    innerLengthMm: 340,
    innerWidthMm: 200,
    innerHeightMm: 120,
    color: '#e4d5bc',
    materialCode: 'BOX-SNK-LOOSE',
  },
  {
    id: 'boot-9',
    shoeType: 'boot',
    sizeMin: 8,
    sizeMax: 11,
    innerLengthMm: 302,
    innerWidthMm: 200,
    innerHeightMm: 160,
    color: '#d7c4a3',
    materialCode: 'BOX-BOOT-9',
  },
]

const bullets = ['鞋面', '中底', '鞋口', '大底', '尺码']

export const SKUS: Sku[] = [
  {
    id: 'SKU-RUN-9',
    titleZh: '轻便跑鞋',
    bulletsZh: bullets,
    shoeType: 'sneaker',
    usSize: 9,
    color: SNEAKER_COLOR,
    livePrice: 34,
    cost: shoeCost(12, 4, 0, 6, 1),
  },
  {
    id: 'SKU-BOOT-9',
    titleZh: '短筒靴',
    bulletsZh: bullets,
    shoeType: 'boot',
    usSize: 9,
    color: BOOT_COLOR,
    livePrice: 49,
    cost: shoeCost(18, 5, 1, 7, 2),
  },
  {
    id: 'SKU-CAMPUS',
    titleZh: '校园跑鞋',
    bulletsZh: bullets,
    shoeType: 'sneaker',
    usSize: null,
    color: SNEAKER_COLOR,
    livePrice: 34,
    cost: shoeCost(12, 4, 0, 6, 1),
  },
]
