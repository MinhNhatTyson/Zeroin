import { useState } from 'react'
import { cm360, edpi, inches360, convertSens } from '../core/sensitivity'
import { loadProfile, saveProfile } from '../storage/profile'

export default function Sensitivity() {
  const [initial] = useState(loadProfile)
  const [dpiText, setDpiText] = useState(String(initial.dpi))
  const [sensText, setSensText] = useState(String(initial.valorantSens))
  const dpi = Number(dpiText)
  const sens = Number(sensText)
  const valid = dpi > 0 && sens > 0

  const update = (nextDpi: string, nextSens: string) => {
    setDpiText(nextDpi)
    setSensText(nextSens)
    const d = Number(nextDpi)
    const s = Number(nextSens)
    if (d > 0 && s > 0) saveProfile({ dpi: d, valorantSens: s })
  }

  return (
    <div className="page">
      <h1>Sensitivity</h1>
      <div className="card row">
        <label>Mouse DPI
          <input type="number" value={dpiText} onChange={(e) => update(e.target.value, sensText)} />
        </label>
        <label>Valorant sensitivity
          <input type="number" step="0.01" value={sensText} onChange={(e) => update(dpiText, e.target.value)} />
        </label>
      </div>
      {valid && (
        <div className="card row" style={{ gap: 48 }}>
          <div className="stat">{edpi(dpi, sens).toFixed(0)}<small>eDPI</small></div>
          <div className="stat">{cm360(dpi, sens).toFixed(2)}<small>cm / 360°</small></div>
          <div className="stat">{inches360(dpi, sens).toFixed(2)}<small>inches / 360°</small></div>
          <div className="stat">{convertSens(sens, 'valorant', 'cs2').toFixed(3)}<small>CS2 sens (same cm/360)</small></div>
        </div>
      )}
    </div>
  )
}