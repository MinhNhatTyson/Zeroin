import * as THREE from 'three'
import type { Arena } from './arena'
import type { Phase } from './flickDrill'
import { mulberry32 } from '../core/flick'
import {
  aimError, newMover, stepMover, summarizeTracking, SAMPLE_MS,
  type TrackingConfig, type TrackingSummary, type TrackSample,
} from '../core/tracking'

export interface TrackingHud {
  phase: Phase
  timeLeftMs: number
  countdownMs: number
  onTargetPct: number | null // 0..1, null until the first sample
  streakMs: number
}

export interface TrackingCallbacks {
  onPhase: (phase: Phase, summary?: TrackingSummary, samples?: TrackSample[]) => void
  onHud: (hud: TrackingHud) => void
}

export type TrackingDrill = ReturnType<typeof createTrackingDrill>

const HUD_INTERVAL_MS = 100

export function createTrackingDrill(arena: Arena, cfg: TrackingConfig, cb: TrackingCallbacks) {
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0)

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.targetRadius, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xff4655 }),
  )
  mesh.visible = false
  arena.scene.add(mesh)

  const raycaster = new THREE.Raycaster()
  const center = new THREE.Vector2(0, 0)

  let phase: Phase = 'idle'
  let samples: TrackSample[] = []
  let mover = newMover(cfg, rng, 0)
  let phaseStart = 0
  let lastFrame = 0
  let lastHud = 0
  let nextSampleAt = 0 // ms since the run started
  let onCount = 0
  let streakMs = 0

  const setPhase = (p: Phase, summary?: TrackingSummary, runSamples?: TrackSample[]) => {
    phase = p
    cb.onPhase(p, summary, runSamples)
  }

  const emitHud = (now: number) => {
    lastHud = now
    cb.onHud({
      phase,
      timeLeftMs:
        phase === 'running' ? Math.max(0, cfg.durationMs - (now - phaseStart))
        : phase === 'finished' ? 0
        : cfg.durationMs,
      countdownMs: phase === 'countdown' ? Math.max(0, cfg.countdownMs - (now - phaseStart)) : 0,
      onTargetPct: samples.length ? onCount / samples.length : null,
      streakMs,
    })
  }

  const placeMesh = () => {
    mesh.position.set(mover.x, mover.y, -cfg.wallDistance)
    mesh.updateMatrixWorld() // the raycast below reads matrixWorld, which is otherwise only refreshed at render
  }

  const takeSample = () => {
    arena.camera.updateMatrixWorld()
    raycaster.setFromCamera(center, arena.camera)
    const on = raycaster.intersectObject(mesh).length > 0
    const e = aimError(arena.getLook(), arena.camera.position, mesh.position)
    samples.push([on ? 1 : 0, Math.round(e.x * 10) / 10, Math.round(e.y * 10) / 10])
    if (on) { onCount++; streakMs += SAMPLE_MS } else { streakMs = 0 }
  }

  const start = () => {
    if (phase === 'countdown' || phase === 'running') return
    samples = []
    onCount = 0
    streakMs = 0
    mesh.visible = false
    phaseStart = performance.now()
    lastFrame = phaseStart
    setPhase('countdown')
    emitHud(phaseStart)
  }

  /** Pointer lock lost mid-run (Esc, alt-tab): discard the run. */
  const abort = () => {
    if (phase !== 'countdown' && phase !== 'running') return
    mesh.visible = false
    setPhase('idle')
    emitHud(performance.now())
  }

  const finish = () => {
    mesh.visible = false
    const summary = summarizeTracking(samples)
    setPhase('finished', summary, samples) // set before exiting lock so abort() ignores it
    emitHud(performance.now())
    arena.exitLock()
  }

  const offFrame = arena.onFrame((now) => {
    const dt = now - lastFrame
    lastFrame = now

    if (phase === 'countdown' && now - phaseStart >= cfg.countdownMs) {
      phaseStart = now
      nextSampleAt = SAMPLE_MS
      mover = newMover(cfg, rng, 0)
      placeMesh()
      mesh.visible = true
      setPhase('running')
      emitHud(now)
      return
    }

    if (phase === 'running') {
      const t = now - phaseStart
      if (t >= cfg.durationMs) {
        finish()
        return
      }
      stepMover(cfg, rng, mover, dt, t)
      placeMesh()
      while (t >= nextSampleAt) { // while, not if: a slow frame must not skip samples
        takeSample()
        nextSampleAt += SAMPLE_MS
      }
    }

    if ((phase === 'countdown' || phase === 'running') && now - lastHud >= HUD_INTERVAL_MS) {
      emitHud(now)
    }
  })

  const dispose = () => {
    offFrame()
    arena.scene.remove(mesh)
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
  }

  return { start, abort, dispose }
}