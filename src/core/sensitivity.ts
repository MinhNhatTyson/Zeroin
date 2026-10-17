export const GAME_YAW = {
  valorant: 0.07,
  cs2: 0.022,
  overwatch: 0.0066,
} as const

export type GameId = keyof typeof GAME_YAW

/** Degrees the view rotates per mouse count. */
export const degreesPerCount = (sens: number, yaw: number = GAME_YAW.valorant) => sens * yaw

export const edpi = (dpi: number, sens: number) => dpi * sens

export const inches360 = (dpi: number, sens: number, yaw: number = GAME_YAW.valorant) =>
  360 / (yaw * sens * dpi)

export const cm360 = (dpi: number, sens: number, yaw: number = GAME_YAW.valorant) =>
  inches360(dpi, sens, yaw) * 2.54

/** Convert a sensitivity from one game to another so cm/360 stays identical. */
export const convertSens = (sens: number, from: GameId, to: GameId) =>
  (sens * GAME_YAW[from]) / GAME_YAW[to]

export const PITCH_LIMIT = 89

export type Look = { yaw: number; pitch: number }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Apply a raw mouse delta (in counts) to a view direction, in degrees.
 * Right (+dx) turns right, which is negative yaw in Three.js.
 * Down (+dy) looks down, which is negative pitch.
 */
export const applyMouseDelta = (
  look: Look,
  dx: number,
  dy: number,
  sens: number,
  yaw: number = GAME_YAW.valorant,
): Look => {
  const d = degreesPerCount(sens, yaw)
  return {
    yaw: look.yaw - dx * d,
    pitch: clamp(look.pitch - dy * d, -PITCH_LIMIT, PITCH_LIMIT),
  }
}

/** Three.js wants a vertical FOV. Valorant's 103° is horizontal, so convert. */
export const vfovFromHfov = (hfovDeg: number, aspect: number) => {
  const h = (hfovDeg * Math.PI) / 180
  return ((2 * Math.atan(Math.tan(h / 2) / aspect)) * 180) / Math.PI
}