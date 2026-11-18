import { useState, useSyncExternalStore } from 'react'
import { galleryCopy, glazeById, glazes, stages } from '../data/stages'
import { pourGlaze } from '../studio/glazePaint'
import { getVersion, scrollToStage, studio, subscribe, touch } from '../studio/store'
import { studioAudio } from '../studio/audio'

export function Overlay() {
  useSyncExternalStore(subscribe, getVersion, getVersion)
  const gallery = studio.galleryT > 0.55
  const stage = stages[studio.stage]
  const copy = gallery ? galleryCopy : stage
  const glaze = glazeById(studio.glazeId)
  const [held, setHeld] = useState(false)

  const holdWheel = (next: boolean) => {
    setHeld(next)
    studio.wheelHeld = next
  }

  const toggleSound = () => {
    const next = !studio.soundOn
    studio.soundOn = next
    touch()
    void studioAudio.setEnabled(next).catch(() => {
      studio.soundOn = false
      touch()
    })
  }

  const toggleHotspot = () => {
    studio.hotspotOpen = !studio.hotspotOpen
    touch()
  }

  return (
    <div className="overlay">
      <header className="mast">
        <p className="brand">从土到器</p>
        <p className="sub">手拉坯 · 敞口碗</p>
      </header>
      <button
        type="button"
        className="sound"
        aria-pressed={studio.soundOn}
        onClick={toggleSound}
      >
        {studio.soundOn ? '声音开' : '声音关'}
      </button>
      <nav className="rail" aria-label="工艺阶段">
        {stages.map((item, index) => (
          <button
            key={item.title}
            type="button"
            aria-current={studio.stage === index ? 'step' : undefined}
            onClick={() => scrollToStage(index)}
          >
            <i />
            <span>{item.title}</span>
          </button>
        ))}
      </nav>
      <section className="copy">
        <div key={gallery ? 'gallery' : stage.index} className="copy-block" aria-live="polite">
          <p className="index-no">{copy.index}</p>
          <h1>{copy.title}</h1>
          <p className="body">{copy.body}</p>
          {studio.stage === 0 && !gallery && <p className="hint">向下滚动。拖动器物，可以转身。</p>}
          {!gallery && stage.seal && (
            <div className="seal">
              {stage.seal.map((line) => (
                <div key={line.label}>
                  <span>{line.label}</span>
                  <strong>{line.value}</strong>
                </div>
              ))}
            </div>
          )}
          {studio.hotspotOpen && (
            <p id="craft-note" className="note">
              {gallery ? '三只碗出自同一只坯，分开的是釉，和火。' : stage.note}
            </p>
          )}
          {studio.stage === 7 && !gallery && <p className="glaze-line">{glaze.line}</p>}
          {gallery && (
            <div className="trio">
              {glazes.map((item) => (
                <span key={item.id}>
                  <i style={{ background: item.color }} />
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="controls">
          <button
            type="button"
            className="text-btn"
            aria-expanded={studio.hotspotOpen}
            aria-controls="craft-note"
            onClick={toggleHotspot}
          >
            {studio.hotspotOpen ? '收起' : '细节'}
          </button>
          {studio.stage === 2 && !gallery && (
            <button
              type="button"
              className="text-btn"
              aria-pressed={held}
              onPointerDown={() => holdWheel(true)}
              onPointerUp={() => holdWheel(false)}
              onPointerLeave={() => holdWheel(false)}
              onPointerCancel={() => holdWheel(false)}
              onBlur={() => holdWheel(false)}
              onKeyDown={(event) => {
                if (event.key !== ' ' && event.key !== 'Enter') return
                event.preventDefault()
                holdWheel(true)
              }}
              onKeyUp={(event) => {
                if (event.key === ' ' || event.key === 'Enter') holdWheel(false)
              }}
            >
              加速陶轮
            </button>
          )}
          {studio.stage === 6 && (
            <button
              type="button"
              className="text-btn"
              onClick={() => pourGlaze(studio.reduced, (amount) => {
                studio.glazeBoost = amount
              })}
            >
              施釉
            </button>
          )}
          {studio.stage === 7 && !gallery &&
            glazes.map((item) => (
              <button
                key={item.id}
                type="button"
                className="swatch"
                style={{ ['--c' as string]: item.color }}
                aria-pressed={studio.glazeId === item.id}
                onClick={() => {
                  studio.glazeId = item.id
                  touch()
                }}
              >
                <i />
                <span>{item.name}</span>
              </button>
            ))}
        </div>
      </section>
    </div>
  )
}
