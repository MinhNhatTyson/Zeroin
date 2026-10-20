import type { FlickSummary, Shot } from '../core/flick'
import type { TrackingSummary, TrackSample } from '../core/tracking'
import type { Profile } from './profile'

interface SessionBase {
  id: string
  date: string // ISO timestamp
  durationMs: number
  settings: { dpi: number; valorantSens: number; hfov: number }
}

export interface FlickSession extends SessionBase {
  scenarioId: 'flick'
  summary: FlickSummary
  shots: Shot[]
}

export interface TrackingSession extends SessionBase {
  scenarioId: 'tracking'
  summary: TrackingSummary
  samples: TrackSample[]
}

/** Discriminated union: checking `s.scenarioId` narrows `s.summary` and the raw data. */
export type Session = FlickSession | TrackingSession
export type ScenarioId = Session['scenarioId']

const KEY = 'zeroin.sessions.v1'
const MAX_SESSIONS = 300 // ~8 KB per run, so this stays well under the ~5 MB localStorage quota

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Session[]
    }
  } catch {
    // corrupted or unavailable storage: start empty
  }
  return []
}

function write(sessions: Session[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions))
    return true
  } catch {
    return false // quota exceeded or storage disabled
  }
}

const settingsOf = (p: Profile) => ({ dpi: p.dpi, valorantSens: p.valorantSens, hfov: 103 }) // 103 = arena.ts default

function append(session: Session): boolean {
  return write([...loadSessions(), session].slice(-MAX_SESSIONS))
}

export function recordFlick(durationMs: number, summary: FlickSummary, shots: Shot[], profile: Profile): boolean {
  return append({
    id: crypto.randomUUID(), date: new Date().toISOString(), scenarioId: 'flick',
    durationMs, summary, shots, settings: settingsOf(profile),
  })
}

export function recordTracking(durationMs: number, summary: TrackingSummary, samples: TrackSample[], profile: Profile): boolean {
  return append({
    id: crypto.randomUUID(), date: new Date().toISOString(), scenarioId: 'tracking',
    durationMs, summary, samples, settings: settingsOf(profile),
  })
}

export function deleteSession(id: string): Session[] {
  const next = loadSessions().filter((s) => s.id !== id)
  write(next)
  return next
}

export function clearSessions(): Session[] {
  write([])
  return []
}