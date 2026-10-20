import { anglesTo, wrap180, type Vec3 } from './flick'
import type { Look } from './sensitivity'

export interface TrackingConfig {
  durationMs: number
  countdownMs: number
  targetRadius: number // meters
  wallDistance: number // meters in front of the eye
  halfWidth: number    // target x stays in [-halfWidth, halfWidth]
  yMin: number
  yMax: number
  speed: number        // m/s along the wall (6 m/s at 15 m is about 22 deg/s)
  turnMinMs: number    // the target picks a new velocity every turnMinMs..turnMaxMs
  turnMaxMs: number
}

export const DEFAULT_TRACKING: TrackingConfig = {
  durationMs: 30_000,
  countdownMs: 3_000,
  targetRadius: 0.5,
  wallDistance: 15,
  halfWidth: 8,
  yMin: 1.0,
  yMax: 4.0,
  speed: 6,
  turnMinMs: 350,
  turnMaxMs: 1100,
}

export const SAMPLE_MS = 50

/** One sample every SAMPLE_MS: [onTarget, aimErrorX, aimErrorY] in degrees. Time is index * SAMPLE_MS. Tuples keep localStorage small. */
export type TrackSample = [on: 0 | 1, errX: number, errY: number]

export interface Mover { x: number; y: number; vx: number; vy: number; turnAt: number }

export function newMover(cfg: TrackingConfig, rng: () => number, nowMs: number): Mover {
  return {
    x: (rng() * 2 - 1) * cfg.halfWidth * 0.5,
    y: (cfg.yMin + cfg.yMax) / 2,
    vx: (rng() < 0.5 ? -1 : 1) * cfg.speed * 0.8,
    vy: 0,
    turnAt: nowMs + cfg.turnMinMs + rng() * (cfg.turnMaxMs - cfg.turnMinMs),
  }
}

/** Advance the target by dtMs. Mutates `m` (called every frame, so no allocation). */
export function stepMover(cfg: TrackingConfig, rng: () => number, m: Mover, dtMs: number, nowMs: number) {
  const dt = Math.min(dtMs, 50) / 1000 // a long stall (tab switch) must not teleport the target

  if (nowMs >= m.turnAt) {
    const sign = Math.sign(m.vx) || 1
    const dir = rng() < 0.7 ? -sign : sign // usually reverse, like a counter-strafe
    m.vx = dir * cfg.speed * (0.6 + 0.4 * rng())
    m.vy = (rng() * 2 - 1) * cfg.speed * 0.25
    m.turnAt = nowMs + cfg.turnMinMs + rng() * (cfg.turnMaxMs - cfg.turnMinMs)
  }

  m.x += m.vx * dt
  m.y += m.vy * dt

  if (m.x > cfg.halfWidth) { m.x = cfg.halfWidth; m.vx = -Math.abs(m.vx) }
  else if (m.x < -cfg.halfWidth) { m.x = -cfg.halfWidth; m.vx = Math.abs(m.vx) }
  if (m.y > cfg.yMax) { m.y = cfg.yMax; m.vy = -Math.abs(m.vy) }
  else if (m.y < cfg.yMin) { m.y = cfg.yMin; m.vy = Math.abs(m.vy) }
}

/** Same sign convention as Shot: +x = target right of the crosshair, +y = above. */
export function aimError(look: Look, eye: Vec3, target: Vec3) {
  const need = anglesTo(eye, target)
  return { x: wrap180(look.yaw - need.yaw), y: need.pitch - look.pitch }
}

export interface TrackingSummary {
  score: number          // accuracy * 1000
  accuracy: number       // 0..1, fraction of time on target (named like FlickSummary so History can read both)
  onTargetMs: number
  longestStreakMs: number
  avgErrorDeg: number    // mean angular distance from the target center
}

export function summarizeTracking(samples: TrackSample[]): TrackingSummary {
  let on = 0, run = 0, longest = 0, errSum = 0
  for (const [hit, ex, ey] of samples) {
    errSum += Math.hypot(ex, ey)
    if (hit) {
      on++
      run++
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }
  const n = samples.length
  const accuracy = n ? on / n : 0
  return {
    score: Math.round(accuracy * 1000),
    accuracy,
    onTargetMs: on * SAMPLE_MS,
    longestStreakMs: longest * SAMPLE_MS,
    avgErrorDeg: n ? errSum / n : 0,
  }
}