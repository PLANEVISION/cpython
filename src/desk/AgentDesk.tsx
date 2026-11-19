import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { SKUS, type Sku } from '../agent/catalog.ts'
import { runCatalog, type RunResult } from '../agent/pipeline.ts'
import ShoeStage from '../pack/ShoeStage.tsx'

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function publishedCount(result: RunResult, role: RunResult['images'][number]['role']) {
  return result.images.filter((image) => image.publish && image.role === role).length
}

export default function AgentDesk() {
  const webgl = useMemo(detectWebGL, [])
  const [skus, setSkus] = useState<Sku[]>(SKUS)
  const [selectedId, setSelectedId] = useState(SKUS[0].id)
  const [sizeDraft, setSizeDraft] = useState('9')
  const results = useMemo(() => runCatalog(skus), [skus])
  const selected = results.find((item) => item.skuId === selectedId) ?? results[0]

  const refill = (skuId: string) => {
    const usSize = Number(sizeDraft)
    if (!Number.isInteger(usSize)) return
    setSkus((current) =>
      current.map((sku) => (sku.id === skuId ? { ...sku, usSize } : sku)),
    )
    setSelectedId(skuId)
  }

  return (
    <main className="desk">
      <section className="desk-panel">
        <p className="brand">自动闭环</p>
        <p className="sub">Amazon.com 美国站 · 打开后自行跑完</p>
        <p className="desk-note">
          发布记录在这台浏览器里。翻译、质检、配盒和底线内改价由 Agent 直接完成，人只补例外。
        </p>
        <ul className="desk-list">
          {results.map((result) => (
            <li key={result.skuId}>
              <button
                type="button"
                className={result.skuId === selected.skuId ? 'desk-item is-on' : 'desk-item'}
                onClick={() => setSelectedId(result.skuId)}
              >
                <span>{result.skuId}</span>
                <span>{result.status === 'published' ? '已发布' : '例外'}</span>
              </button>
            </li>
          ))}
        </ul>

        <article className="desk-detail">
          <h1>{selected.title}</h1>
          <p className="desk-status">
            {selected.status === 'published'
              ? `在售价 ${selected.livePrice.toFixed(2)} → ${selected.price.toFixed(2)} USD`
              : selected.reason}
          </p>
          <p className="desk-meta">
            主图 {publishedCount(selected, 'main')} · 附图 {publishedCount(selected, 'package_secondary')} · 立体预览不上传
            {selected.materialCode ? ` · ${selected.materialCode}` : ''}
          </p>
          <ol className="desk-bullets">
            {selected.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ol>
          {selected.status === 'exception' && selected.reason !== '文案含禁词' && selected.reason !== '发布已熔断' ? (
            <form
              className="desk-form"
              onSubmit={(event) => {
                event.preventDefault()
                refill(selected.skuId)
              }}
            >
              <label>
                US 码
                <input
                  value={sizeDraft}
                  inputMode="numeric"
                  onChange={(event) => setSizeDraft(event.target.value)}
                />
              </label>
              <button type="submit">交给 Agent</button>
            </form>
          ) : null}
          <ol className="desk-audit">
            {selected.audit.map((entry) => (
              <li key={entry.seq}>
                <span>{entry.action}</span>
                {entry.before} → {entry.after}
              </li>
            ))}
          </ol>
        </article>
        <a className="desk-link" href="?studio=1">
          陶器演示
        </a>
      </section>
      <section className="desk-stage" aria-label="鞋子与包装的立体预览">
        {webgl ? (
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [0.15, 1.85, 5.1], fov: 30, near: 0.1, far: 30 }}
            gl={{ antialias: true, alpha: false }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 1.05
              gl.shadowMap.type = THREE.PCFSoftShadowMap
            }}
          >
            <ShoeStage
              shoeColor={selected.shoeColor}
              boxColor={selected.boxColor}
              sizeLabel={selected.usSize ? `US ${selected.usSize}` : '待补尺码'}
            />
          </Canvas>
        ) : (
          <p className="desk-note">当前环境没有 WebGL，清单和审计仍然可用。</p>
        )}
      </section>
    </main>
  )
}
