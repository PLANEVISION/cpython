import { BOXES, type Sku } from './catalog.ts'
import { reviewCopy, translateListing } from './gate.ts'
import { matchBox, type BoxTemplate } from './packaging.ts'
import { switchesOpen, type Switches } from './policy.ts'
import { decidePrice } from './pricing.ts'

export type ImageRole = 'main' | 'package_secondary' | 'turntable'

export type ListingImage = {
  role: ImageRole
  label: string
  publish: boolean
}

export type AuditEntry = {
  seq: number
  actor: 'agent'
  action: string
  skuId: string
  before: string
  after: string
}

export type RunResult = {
  skuId: string
  status: 'published' | 'exception'
  reason: string
  title: string
  bullets: string[]
  images: ListingImage[]
  boxId: string | null
  boxColor: string | null
  materialCode: string | null
  shoeColor: string
  shoeType: Sku['shoeType']
  usSize: number | null
  livePrice: number
  price: number
  audit: AuditEntry[]
}

const publishedImages = (usSize: number): ListingImage[] => [
  { role: 'main', label: '白底单鞋', publish: true },
  { role: 'package_secondary', label: '开盒', publish: true },
  { role: 'package_secondary', label: '闭盒', publish: true },
  { role: 'package_secondary', label: `盒侧 US ${usSize}`, publish: true },
  { role: 'turntable', label: '立体预览', publish: false },
]

export function runSku(
  sku: Sku,
  boxes: BoxTemplate[] = BOXES,
  switches: Switches = switchesOpen,
): RunResult {
  const audit: AuditEntry[] = []
  const note = (action: string, before: string, after: string) => {
    audit.push({ seq: audit.length + 1, actor: 'agent', action, skuId: sku.id, before, after })
  }

  const listing = translateListing(sku.titleZh, sku.bulletsZh)
  note('翻译', sku.titleZh, listing.title)

  const gate = reviewCopy(listing.title, listing.bullets)
  note('质检', listing.title, gate.pass ? gate.reason : `${gate.reason} ${gate.hits.join(' ')}`.trim())

  const base = {
    skuId: sku.id,
    title: listing.title,
    bullets: listing.bullets,
    shoeColor: sku.color,
    shoeType: sku.shoeType,
    usSize: sku.usSize,
    livePrice: sku.livePrice,
    price: sku.livePrice,
    audit,
  }

  if (!gate.pass) {
    return {
      ...base,
      status: 'exception',
      reason: gate.reason,
      images: [],
      boxId: null,
      boxColor: null,
      materialCode: null,
    }
  }

  if (!switches.publish) {
    note('发布', '待发布', '发布已熔断')
    return {
      ...base,
      status: 'exception',
      reason: '发布已熔断',
      images: [],
      boxId: null,
      boxColor: null,
      materialCode: null,
    }
  }

  const packed = matchBox(sku.shoeType, sku.usSize, boxes)
  note('配盒', sku.usSize === null ? '无尺码' : `US ${sku.usSize}`, packed.ok ? packed.box.id : packed.reason)
  if (!packed.ok || sku.usSize === null) {
    return {
      ...base,
      status: 'exception',
      reason: packed.ok ? '缺尺码' : packed.reason,
      images: [],
      boxId: null,
      boxColor: null,
      materialCode: null,
    }
  }

  const images = publishedImages(sku.usSize)
  if (!switches.price) {
    note('改价', String(sku.livePrice), '改价已暂停，保持在售价')
    note('发布', '草稿', `${sku.id} @ ${sku.livePrice}`)
    return {
      ...base,
      status: 'published',
      reason: '',
      images,
      boxId: packed.box.id,
      boxColor: packed.box.color,
      materialCode: packed.box.materialCode,
    }
  }

  const priced = decidePrice(sku.livePrice, sku.cost)
  note('改价', String(sku.livePrice), priced.applied ? String(priced.price) : priced.reason)
  if (!priced.applied) {
    return {
      ...base,
      status: 'exception',
      reason: priced.reason,
      images,
      boxId: packed.box.id,
      boxColor: packed.box.color,
      materialCode: packed.box.materialCode,
    }
  }

  note('发布', '草稿', `${sku.id} @ ${priced.price}`)
  return {
    ...base,
    status: 'published',
    reason: '',
    images,
    boxId: packed.box.id,
    boxColor: packed.box.color,
    materialCode: packed.box.materialCode,
    price: priced.price,
  }
}

export function runCatalog(skus: Sku[]) {
  return skus.map((sku) => runSku(sku))
}
