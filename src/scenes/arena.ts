import * as THREE from 'three'
import { applyMouseDelta, vfovFromHfov, type Look } from '../core/sensitivity'

export interface ArenaOptions {
  sens: number
  hfov?: number
  onLockChange?: (locked: boolean) => void
  debugEl?: HTMLElement | null
}

export type Arena = ReturnType<typeof createArena>

const ROOM = 40
const EYE_HEIGHT = 1.7
const MAX_DELTA = 500 
type FireFn = (timeStamp: number) => void
type FrameFn = (now: number) => void

export function createArena(canvas: HTMLCanvasElement, opts: ArenaOptions) {
  const hfov = opts.hfov ?? 103

  // --- renderer / scene / camera -------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f1923)

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200)
  camera.rotation.order = 'YXZ' // yaw first, then pitch: no roll, like an FPS
  camera.position.set(0, EYE_HEIGHT, 0)

  // --- room: floor + 4 wall grids ------------------------------------------
  const addGrid = (rx: number, rz: number, x: number, y: number, z: number) => {
    const g = new THREE.GridHelper(ROOM, 20, 0x3a4f63, 0x24323f)
    g.rotation.set(rx, 0, rz)
    g.position.set(x, y, z)
    scene.add(g)
  }
  const h = ROOM / 2
  addGrid(0, 0, 0, 0, 0)                  // floor
  addGrid(Math.PI / 2, 0, 0, h, -h)       // back wall
  addGrid(Math.PI / 2, 0, 0, h, h)        // front wall
  addGrid(0, Math.PI / 2, -h, h, 0)       // left wall
  addGrid(0, Math.PI / 2, h, h, 0)        // right wall


  // --- resize ---------------------------------------------------------------
  const resize = () => {
    const w = canvas.clientWidth
    const hgt = canvas.clientHeight
    renderer.setSize(w, hgt, false)
    camera.aspect = w / hgt
    camera.fov = vfovFromHfov(hfov, camera.aspect)
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // --- input ----------------------------------------------------------------
  let look: Look = { yaw: 0, pitch: 0 }
  let countsX = 0
  let rawInput = false
  const fireListeners = new Set<FireFn>()
  const frameListeners = new Set<FrameFn>()

  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return
    const dx = e.movementX
    const dy = e.movementY
    if (Math.abs(dx) > MAX_DELTA || Math.abs(dy) > MAX_DELTA) return

    look = applyMouseDelta(look, dx, dy, opts.sens)
    camera.rotation.set(
      THREE.MathUtils.degToRad(look.pitch),
      THREE.MathUtils.degToRad(look.yaw),
      0,
    )
    countsX += dx
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || document.pointerLockElement !== canvas) return
    // Raycasts read camera.matrixWorld, which is otherwise only refreshed at render time.
    // Without this, a click could be tested against the view from the previous frame.
    camera.updateMatrixWorld()
    fireListeners.forEach((fn) => fn(e.timeStamp))
  }

  const onLockChange = () => opts.onLockChange?.(document.pointerLockElement === canvas)

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('pointerlockchange', onLockChange)
  document.addEventListener('mousedown', onMouseDown)

  const requestLock = async () => {
    try {
      await canvas.requestPointerLock({ unadjustedMovement: true })
      rawInput = true
    } catch (err) {
      // Only fall back if raw input is truly unsupported. Chrome also rejects
      // briefly after Esc, and we don't want a silent non-raw fallback then.
      if (err instanceof DOMException && err.name === 'NotSupportedError') {
        rawInput = false
        try { await canvas.requestPointerLock() } catch { /* ignore */ }
      }
    }
  }

  // --- render loop (outside React) -----------------------------------------
  let raf = 0
  const loop = (now: number) => {
    frameListeners.forEach((fn) => fn(now))
    renderer.render(scene, camera)
    if (opts.debugEl) {
      opts.debugEl.textContent =
        `raw input: ${rawInput ? 'yes' : 'NO (check Windows pointer settings)'}\n` +
        `counts X:  ${countsX}\n` +
        `heading:   ${(-look.yaw).toFixed(1)}°\n` +
        `pitch:     ${look.pitch.toFixed(1)}°`
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  // --- cleanup --------------------------------------------------------------
  const dispose = () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('pointerlockchange', onLockChange)
    if (document.pointerLockElement === canvas) document.exitPointerLock()
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose()
        const m = o.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
    renderer.dispose()
  }

  const exitLock = () => {
    if (document.pointerLockElement === canvas) document.exitPointerLock()
  }
  const getLook = (): Look => look
  const onFire = (fn: FireFn) => {
    fireListeners.add(fn)
    return () => { fireListeners.delete(fn) }
  }
  const onFrame = (fn: FrameFn) => {
    frameListeners.add(fn)
    return () => { frameListeners.delete(fn) }
  }

  return { scene, camera, requestLock, exitLock, getLook, onFire, onFrame, dispose }
}