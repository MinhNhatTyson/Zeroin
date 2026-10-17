import * as THREE from 'three'
import type { Arena } from './arena'
import {
  makeShot, mulberry32, nextTarget, scoreShot, summarize,
  type FlickConfig, type FlickSummary, type Shot, type Vec3,
} from '../core/flick'

export type Phase = 'idle' | 'countdown' | 'running' | 'finished'

export interface Hud {
  phase: Phase
  timeLeftMs: number
  countdownMs: number
  score: number
  hits: number
  shots: number
}

export interface FlickCallbacks {
  onPhase: (phase: Phase, summary?: FlickSummary) => void
  onHud: (hud: Hud) => void
}

export type FlickDrill = ReturnType<typeof createFlickDrill>

const HUD_INTERVAL_MS = 100

export function createFlickDrill(arena: Arena, cfg: FlickConfig, cb: FlickCallbacks) {
  const rng = mulberry32((Math.random() * 2 ** 32) >>> 0)

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.targetRadius, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xff4655 }),
  )
  mesh.visible = false
  arena.scene.add(mesh)

  const raycaster = new THREE.Raycaster()
  const center = new THREE.Vector2(0, 0) // crosshair = screen center

  let phase: Phase = 'idle'
  let shots: Shot[] = []
  let hits = 0
  let rawScore = 0
  let targetId = 0
  let spawnedAt = 0
  let phaseStart = 0
  let lastHud = 0
  let current: Vec3 | undefined

  const setPhase = (p: Phase, summary?: FlickSummary) => {
    phase = p
    cb.onPhase(p, summary)
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
      score: Math.max(0, Math.round(rawScore)),
      hits,
      shots: shots.length,
    })
  }

  const spawn = (t: number) => {
    const p = nextTarget(cfg, rng, current)
    current = p
    mesh.position.set(p.x, p.y, p.z)
    mesh.updateMatrixWorld() // so a very fast second click is tested against the new position
    mesh.visible = true
    targetId++
    spawnedAt = t
  }

  const start = () => {
    if (phase === 'countdown' || phase === 'running') return
    shots = []
    hits = 0
    rawScore = 0
    current = undefined
    mesh.visible = false
    phaseStart = performance.now()
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
    const summary = summarize(shots, cfg.durationMs)
    setPhase('finished', summary) // set before exiting lock so abort() ignores it
    emitHud(performance.now())
    arena.exitLock()
  }

  const offFire = arena.onFire((t) => {
    if (phase !== 'running' || !current) return
    if (t - phaseStart > cfg.durationMs) return

    raycaster.setFromCamera(center, arena.camera)
    const hit = raycaster.intersectObject(mesh).length > 0

    const shot = makeShot({
      t: t - phaseStart,
      hit,
      targetId,
      look: arena.getLook(),
      eye: arena.camera.position,
      target: current,
      reactionMs: t - spawnedAt,
    })
    shots.push(shot)
    rawScore += scoreShot(shot)
    if (hit) {
      hits++
      spawn(t)
    }
    emitHud(t)
  })

  const offFrame = arena.onFrame((now) => {
    if (phase === 'countdown' && now - phaseStart >= cfg.countdownMs) {
      phaseStart = now
      spawn(now)
      setPhase('running')
      emitHud(now)
      return
    }
    if (phase === 'running' && now - phaseStart >= cfg.durationMs) {
      finish()
      return
    }
    if ((phase === 'countdown' || phase === 'running') && now - lastHud >= HUD_INTERVAL_MS) {
      emitHud(now)
    }
  })

  const dispose = () => {
    offFire()
    offFrame()
    arena.scene.remove(mesh)
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
  }

  return { start, abort, dispose }
}