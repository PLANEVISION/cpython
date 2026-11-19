import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SKUS, BOXES } from '../src/agent/catalog.ts'
import { dominantHex } from '../src/agent/color.ts'
import { reviewCopy, translateListing } from '../src/agent/gate.ts'
import { matchBox, type BoxTemplate } from '../src/agent/packaging.ts'
import { automationSwitches, type Cost } from '../src/agent/policy.ts'
import { decidePrice } from '../src/agent/pricing.ts'
import { runCatalog, runSku } from '../src/agent/pipeline.ts'

const cost = (adsUsd: number | null): Cost => ({
  cogsUsd: 12,
  inboundUsd: 4,
  dutyUsd: 0,
  referralRate: 0.15,
  fulfillmentUsd: 6,
  adsUsd,
  refundUsd: 0,
})

describe('配盒', () => {
  it('US 9 跑鞋选中余量合格且得分最高的盒子', () => {
    const matched = matchBox('sneaker', 9, BOXES)
    assert.equal(matched.ok, true)
    if (!matched.ok) return
    assert.equal(matched.box.id, 'snk-9')
    assert.ok(matched.marginMm >= 8 && matched.marginMm <= 25)
  })

  it('缺尺码不猜测鞋长', () => {
    const matched = matchBox('sneaker', null, BOXES)
    assert.deepEqual(matched, { ok: false, reason: '缺尺码' })
  })

  it('靴不使用跑鞋盒', () => {
    const matched = matchBox('boot', 9, BOXES)
    assert.equal(matched.ok, true)
    if (!matched.ok) return
    assert.equal(matched.box.id, 'boot-9')
  })

  it('两个都合规时取得分更高的内径', () => {
    const boxes: BoxTemplate[] = [
      { ...BOXES[0], id: 'wide', innerLengthMm: 300 },
      { ...BOXES[0], id: 'ideal', innerLengthMm: 302 },
    ]
    const matched = matchBox('sneaker', 9, boxes)
    assert.equal(matched.ok, true)
    if (!matched.ok) return
    assert.equal(matched.box.id, 'ideal')
  })
})

describe('改价', () => {
  it('底线内且幅度不超过 8% 时改价', () => {
    const decision = decidePrice(34, cost(1))
    assert.equal(decision.applied, true)
    assert.equal(decision.reason, '底线内改价')
    assert.equal(decision.price, 35.38)
  })

  it('竞品价低于底线时保持在售价', () => {
    const decision = decidePrice(40, cost(1), 20)
    assert.equal(decision.applied, false)
    assert.equal(decision.price, 40)
    assert.equal(decision.reason, '低于利润底线')
  })

  it('单次幅度超过 8% 时保持在售价', () => {
    const decision = decidePrice(40, cost(1), 50)
    assert.equal(decision.applied, false)
    assert.equal(decision.price, 40)
    assert.equal(decision.reason, '超过单次调价幅度')
  })

  it('广告分摊为空时不改价', () => {
    const decision = decidePrice(34, cost(null))
    assert.equal(decision.applied, false)
    assert.equal(decision.reason, '广告分摊未知')
  })
})

describe('闸门与闭环', () => {
  it('禁词阻断发布', () => {
    const listing = translateListing('最好的鞋', ['鞋面'])
    const gate = reviewCopy(listing.title, listing.bullets)
    assert.equal(gate.pass, false)
    assert.equal(gate.reason, '文案含禁词')
    assert.ok(gate.hits.includes('best'))

    const result = runSku({
      ...SKUS[0],
      id: 'SKU-BANNED',
      titleZh: '最好的鞋',
    })
    assert.equal(result.status, 'exception')
    assert.equal(result.reason, '文案含禁词')
    assert.equal(result.images.length, 0)
  })

  it('目录里两双自动发布，缺尺码进入例外', () => {
    const results = runCatalog(SKUS)
    const published = results.filter((item) => item.status === 'published')
    const waiting = results.filter((item) => item.status === 'exception')
    assert.equal(published.length, 2)
    assert.equal(waiting.length, 1)
    assert.equal(waiting[0].reason, '缺尺码')
    assert.equal(waiting[0].skuId, 'SKU-CAMPUS')

    for (const item of published) {
      assert.deepEqual(
        item.images.filter((image) => image.publish).map((image) => image.role),
        ['main', 'package_secondary', 'package_secondary', 'package_secondary'],
      )
      assert.equal(item.images.some((image) => image.role === 'turntable' && image.publish), false)
      assert.equal(item.audit.every((entry) => entry.actor === 'agent'), true)
      assert.ok(item.price !== item.livePrice)
    }
  })

  it('补上尺码后同一件可以发布', () => {
    const result = runSku({ ...SKUS[2], usSize: 9 })
    assert.equal(result.status, 'published')
    assert.equal(result.boxId, 'snk-9')
  })

  it('主图拒收达到 3 次关闭发布，账户指标越线关闭改价', () => {
    const rejected = automationSwitches({
      imageRejects: 3,
      priceChanges: 1,
      odr: 0,
      lateShipmentRate: 0,
      cancelRate: 0,
    })
    assert.equal(rejected.publish, false)
    assert.equal(rejected.price, true)

    const paused = runSku(SKUS[0], BOXES, rejected)
    assert.equal(paused.status, 'exception')
    assert.equal(paused.reason, '发布已熔断')

    const account = automationSwitches({
      imageRejects: 0,
      priceChanges: 51,
      odr: 0.008,
      lateShipmentRate: 0,
      cancelRate: 0,
    })
    assert.equal(account.publish, true)
    assert.equal(account.price, false)
    assert.equal(account.ads, false)
    assert.equal(account.purchase, false)

    const held = runSku(SKUS[0], BOXES, account)
    assert.equal(held.status, 'published')
    assert.equal(held.price, held.livePrice)
  })
})

describe('主色', () => {
  it('取商品图像素的平均色', () => {
    const color = dominantHex(new Uint8ClampedArray([196, 148, 106, 255, 200, 152, 110, 255, 0, 0, 0, 0]))
    assert.equal(color, '#c6966c')
  })
})
