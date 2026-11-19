import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Lenis from 'lenis'
import * as THREE from 'three'
import { galleryCopy, stages } from './data/stages'
import { Overlay } from './components/Overlay'
import { Scene } from './components/Scene'
import { SCROLL_VH } from './studio/scroll'
import { bindLenis, scrollToStage, studio, syncFromWindow, touch } from './studio/store'

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function StudioApp() {
  const [webgl] = useState(detectWebGL)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      studio.reduced = query.matches
      if (query.matches) studio.autoSpin = false
      setReduced(query.matches)
      touch()
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    const lenis = new Lenis({
      duration: reduced ? 0 : 1.08,
      smoothWheel: !reduced,
      syncTouch: false,
      autoRaf: false,
      respectReducedMotion: true,
    })
    bindLenis(lenis)
    const onScroll = () => syncFromWindow()
    const unsubscribe = lenis.on('scroll', onScroll)
    let frame = 0
    const loop = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        studio.hotspotOpen = false
        touch()
        return
      }
      const next = event.key === 'ArrowDown' || event.key === 'PageDown'
      const prev = event.key === 'ArrowUp' || event.key === 'PageUp'
      if (!next && !prev) return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      event.preventDefault()
      scrollToStage(Math.min(7, Math.max(0, studio.stage + (next ? 1 : -1))))
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('keydown', onKey)
      lenis.destroy()
      bindLenis(null)
    }
  }, [reduced])

  if (!webgl) {
    return (
      <main className="fallback">
        <p className="brand">从土到器</p>
        <p className="sub">手拉坯 · 敞口碗</p>
        {stages.map((stage) => (
          <article key={stage.index}>
            <p className="index-no">{stage.index}</p>
            <h1>{stage.title}</h1>
            <p className="body">{stage.body}</p>
            <p className="note">{stage.note}</p>
          </article>
        ))}
        <article>
          <h1>{galleryCopy.title}</h1>
          <p className="body">{galleryCopy.body}</p>
        </article>
      </main>
    )
  }

  return (
    <>
      <a className="studio-back" href="./">自动闭环</a>
      <div className="canvas-root">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0.04, 1.2, 3.7], fov: 32, near: 0.1, far: 40 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          role="img"
          aria-label="一件陶器从湿土到成器的三维过程"
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.04
            gl.shadowMap.type = THREE.PCFSoftShadowMap
            gl.setClearColor('#F3EFE8')
          }}
        >
          <Scene />
        </Canvas>
      </div>
      <Overlay />
      <div className="scroll-space" style={{ height: `${SCROLL_VH}vh` }} aria-hidden="true" />
    </>
  )
}
