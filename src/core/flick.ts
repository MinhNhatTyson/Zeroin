import type { Look } from './sensitivity'

export interface Vec3 { x: number; y: number; z: number }

export interface FlickConfig {
  durationMs: number
  countdownMs: number
  targetRadius: number  // meters
  wallDistance: number  // meters in front of the eye; targets spawn on this plane
  halfWidth: number     // targets spawn with x in [-halfWidth, halfWidth]
  yMin: number          // world-space height range (eye height is 1.7)
  yMax: number
  minSeparation: number // meters between consecutive targets, measured on the wall
}

export const DEFAULT_FLICK: FlickConfig = {
  durationMs: 30_000,
  countdownMs: 3_000,
  targetRadius: 0.5,
  wallDistance: 15,
  halfWidth: 10,
  yMin: 0.8,
  yMax: 4.5,
  minSeparation: 5,
}

/** mulberry32: small public-domain seeded PRNG by Tommy Ettinger. Seedable so runs can be replayed later. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pick the next target position on the wall, at least minSeparation away from the previous one. */
export function nextTarget(cfg: FlickConfig, rng: () => number, prev?: Vec3): Vec3 {
  let p: Vec3 = { x: 0, y: cfg.yMin, z: -cfg.wallDistance }
  for (let i = 0; i < 20; i++) {
    p = {
      x: (rng() * 2 - 1) * cfg.halfWidth,
      y: cfg.yMin + rng() * (cfg.yMax - cfg.yMin),
      z: -cfg.wallDistance,
    }
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= cfg.minSeparation) break
  }
  return p
}

const RAD = 180 / Math.PI
export const wrap180 = (d: number) => ((d + 540) % 360) - 180

/** Yaw/pitch (degrees, same convention as Look) needed to point from `from` at `to`. */
export function anglesTo(from: Vec3, to: Vec3): Look {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  return { yaw: Math.atan2(-dx, -dz) * RAD, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * RAD }
}

export interface Shot {
  t: number          // ms since the run started
  hit: boolean
  targetId: number
  aimErrorX: number  // degrees; + = target was to the right of the crosshair
  aimErrorY: number  // degrees; + = target was above the crosshair
  reactionMs: number // ms from target spawn to this click (time-to-hit on hits)
}

export function makeShot(a: {
  t: number; hit: boolean; targetId: number
  look: Look; eye: Vec3; target: Vec3; reactionMs: number
}): Shot {
  const need = anglesTo(a.eye, a.target)
  return {
    t: a.t,
    hit: a.hit,
    targetId: a.targetId,
    aimErrorX: wrap180(a.look.yaw - need.yaw),
    aimErrorY: need.pitch - a.look.pitch,
    reactionMs: a.reactionMs,
  }
}

export const HIT_POINTS = 100
export const SPEED_BONUS_MAX = 100
export const SPEED_BONUS_WINDOW_MS = 1000
export const MISS_PENALTY = 50

/** Hit = 100 + up to 100 speed bonus (linear to 0 at 1 s). Miss = -50, so spraying doesn't pay. */
export const scoreShot = (s: Pick<Shot, 'hit' | 'reactionMs'>) =>
  s.hit
    ? HIT_POINTS + SPEED_BONUS_MAX * Math.max(0, 1 - s.reactionMs / SPEED_BONUS_WINDOW_MS)
    : -MISS_PENALTY

export interface FlickSummary {
  score: number
  hits: number
  misses: number
  accuracy: number // 0..1
  avgMs: number
  medianMs: number
  bestMs: number
  hitsPerSec: number
}

export function summarize(shots: Shot[], durationMs: number): FlickSummary {
  const times = shots.filter((s) => s.hit).map((s) => s.reactionMs).sort((a, b) => a - b)
  const hits = times.length
  const mid = Math.floor(hits / 2)
  const median = hits === 0 ? 0 : hits % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2
  const raw = shots.reduce((sum, s) => sum + scoreShot(s), 0)
  return {
    score: Math.max(0, Math.round(raw)),
    hits,
    misses: shots.length - hits,
    accuracy: shots.length ? hits / shots.length : 0,
    avgMs: hits ? times.reduce((a, b) => a + b, 0) / hits : 0,
    medianMs: median,
    bestMs: hits ? times[0] : 0,
    hitsPerSec: hits / (durationMs / 1000),
  }
}