import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clearSessions, deleteSession, loadSessions, type ScenarioId, type Session } from '../storage/sessions'
import ScoreChart from '../components/ScoreChart'

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA') // local YYYY-MM-DD
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Consecutive days with at least one run, ending today (or yesterday, so the streak isn't lost before you play). */
function dayStreak(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => dayKey(s.date)))
  const d = new Date()
  if (!days.has(dayKey(d.toISOString()))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(dayKey(d.toISOString()))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export default function History() {
  const [sessions, setSessions] = useState(loadSessions)
  const [drill, setDrill] = useState<ScenarioId>('flick')

  const shown = sessions.filter((s) => s.scenarioId === drill)
  const best = shown.reduce((m, s) => Math.max(m, s.summary.score), 0)
  const avgAcc = shown.length ? shown.reduce((sum, s) => sum + s.summary.accuracy, 0) / shown.length : 0
  const recent = shown.slice(-30).map((s) => s.summary.score)
  const newestFirst = [...shown].reverse()

  if (sessions.length === 0) {
    return (
      <div className="page">
        <h1>History</h1>
        <div className="tabs">
          {(['flick', 'tracking'] as const).map((id) => (
            <button key={id} className={drill === id ? 'tab active' : 'tab'} onClick={() => setDrill(id)}>
              {id}
            </button>
          ))}
        </div>
        <div className="card">
          <p style={{ marginTop: 0, color: 'var(--muted)' }}>No runs yet. Finish a drill and it will show up here.</p>
          <Link className="btn primary" to="/drills">Go to drills</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>History</h1>

      <div className="card row" style={{ gap: 48 }}>
        <div className="stat">{shown.length}<small>Runs</small></div>
        <div className="stat">{best}<small>Best score</small></div>
        <div className="stat">{Math.round(avgAcc * 100)}%<small>Avg accuracy</small></div>
        <div className="stat">{dayStreak(sessions)}<small>Day streak</small></div>
      </div>

      <div className="card">
        <small style={{ color: 'var(--muted)' }}>SCORE · LAST {recent.length} RUNS</small>
        <ScoreChart values={recent} />
      </div>

      <div className="card session-list">
        <div className="session-row session-head">
          <span>{drill === 'flick' ? 'Avg hit' : 'Avg error'}</span>
        </div>
        {newestFirst.map((s) => (
          <div key={s.id} className="session-row">
            <span>{fmtDate(s.date)}</span>
            <span style={{ textTransform: 'capitalize' }}>{s.scenarioId}</span>
            <span className="session-score">{s.summary.score}</span>
            <span>{Math.round(s.summary.accuracy * 100)}%</span>
            <span>
              {s.scenarioId === 'flick'
                ? `${Math.round(s.summary.avgMs)} ms`
                : `${s.summary.avgErrorDeg.toFixed(1)}°`}
            </span>
            <button className="icon-btn" title="Delete run" onClick={() => setSessions(deleteSession(s.id))}>✕</button>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button
          className="btn"
          onClick={() => { if (window.confirm('Delete all runs?')) setSessions(clearSessions()) }}
        >
          Clear history
        </button>
      </div>
    </div>
  )
}