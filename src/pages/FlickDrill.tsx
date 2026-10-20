import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createArena, type Arena } from '../scenes/arena'
import { createFlickDrill, type FlickDrill, type Phase } from '../scenes/flickDrill'
import { DEFAULT_FLICK, type FlickSummary } from '../core/flick'
import { loadProfile } from '../storage/profile'
import { recordFlick } from '../storage/sessions'

const fmtMs = (v: number) => `${Math.round(v)} ms`
const profile = loadProfile()

export default function FlickDrillPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<Arena | null>(null)
  const drillRef = useRef<FlickDrill | null>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const accRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [summary, setSummary] = useState<FlickSummary | null>(null)

  useEffect(() => {
    const arena = createArena(canvasRef.current!, {
      sens: profile.valorantSens,
      onLockChange: (locked) => {
        if (locked) drillRef.current?.start()
        else drillRef.current?.abort()
      },
    })

    const drill = createFlickDrill(arena, DEFAULT_FLICK, {
      onPhase: (p, s, runShots) => {
        if (s && runShots) {
          setSummary(s)
          recordFlick(DEFAULT_FLICK.durationMs, s, runShots, profile)
        }
        setPhase(p)
      },
      // HUD is written straight to the DOM: no React re-render while playing.
      onHud: (h) => {
        if (timeRef.current) timeRef.current.textContent = (h.timeLeftMs / 1000).toFixed(1)
        if (scoreRef.current) scoreRef.current.textContent = String(h.score)
        if (accRef.current)
          accRef.current.textContent = h.shots ? `${Math.round((100 * h.hits) / h.shots)}%` : '—'
        if (countRef.current)
          countRef.current.textContent = h.phase === 'countdown' ? String(Math.ceil(h.countdownMs / 1000)) : ''
      },
    })

    arenaRef.current = arena
    drillRef.current = drill
    return () => {
      drill.dispose()
      arena.dispose()
      drillRef.current = null
      arenaRef.current = null
    }
  }, [])

  const seconds = DEFAULT_FLICK.durationMs / 1000

  return (
    <div className="arena">
      <canvas ref={canvasRef} className="arena-canvas" />
      <div className="crosshair">
        <i className="dot" /><i className="l" /><i className="r" /><i className="t" /><i className="b" />
      </div>

      <div className="hud">
        <div className="hud-cell"><span ref={timeRef}>{seconds.toFixed(1)}</span><small>TIME</small></div>
        <div className="hud-cell hud-score"><span ref={scoreRef}>0</span><small>SCORE</small></div>
        <div className="hud-cell"><span ref={accRef}>—</span><small>ACCURACY</small></div>
      </div>
      <div ref={countRef} className="arena-countdown" />

      {phase === 'idle' && (
        <div className="arena-overlay" onClick={() => arenaRef.current?.requestLock()}>
          <h2>Flick</h2>
          <p>{seconds} seconds. Click each target as fast and as accurately as you can.</p>
          <p>Click anywhere to start · Esc to quit</p>
        </div>
      )}

      {phase === 'finished' && summary && (
        <div className="arena-overlay static">
          <div className="card results">
            <div className="stat">{summary.score}<small>SCORE</small></div>
            <div className="results-grid">
              <div className="stat">{Math.round(summary.accuracy * 100)}%<small>Accuracy</small></div>
              <div className="stat">{summary.hits}<small>Hits</small></div>
              <div className="stat">{summary.misses}<small>Misses</small></div>
              <div className="stat">{fmtMs(summary.avgMs)}<small>Avg time to hit</small></div>
              <div className="stat">{fmtMs(summary.medianMs)}<small>Median</small></div>
              <div className="stat">{fmtMs(summary.bestMs)}<small>Best</small></div>
              <div className="stat">{summary.hitsPerSec.toFixed(2)}<small>Targets / sec</small></div>
            </div>
            <div className="row" style={{ marginTop: 24 }}>
              <button className="btn primary" onClick={() => arenaRef.current?.requestLock()}>Play again</button>
              <Link className="btn" to="/drills">Back to drills</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}