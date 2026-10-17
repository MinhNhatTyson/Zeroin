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