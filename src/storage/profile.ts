export interface Profile {
  dpi: number
  valorantSens: number
}

export const DEFAULT_PROFILE: Profile = { dpi: 1600, valorantSens: 0.3 }

const KEY = 'zeroin.profile.v1'

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p: Partial<Profile> = JSON.parse(raw)
      if (typeof p.dpi === 'number' && p.dpi > 0 && typeof p.valorantSens === 'number' && p.valorantSens > 0) {
        return { dpi: p.dpi, valorantSens: p.valorantSens }
      }
    }
  } catch {
    // corrupted or unavailable storage: fall back to defaults
  }
  return DEFAULT_PROFILE
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p))
}