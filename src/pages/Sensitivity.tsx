import { useState } from 'react'
import { cm360, edpi, inches360, convertSens } from '../core/sensitivity'

export default function Sensitivity() {
  const [dpi, setDpi] = useState(1600)
  const [sens, setSens] = useState(0.3)
  const valid = dpi > 0 && sens > 0

  return (
    <div className="page">
      <h1>Sensitivity</h1>
      <div className="card row">
        <label>Mouse DPI
          <input type="number" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} />
        </label>
        <label>Valorant sensitivity
          <input type="number" step="0.01" value={sens} onChange={(e) => setSens(Number(e.target.value))} />
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