import { Link } from 'react-router-dom'

const DRILLS: { name: string; blurb: string; to?: string }[] = [
  { name: 'Flick', blurb: 'One target at a time. Snap to it and click. Trains flick speed and accuracy.', to: '/drills/flick' },
  { name: 'Tracking', blurb: 'Follow a strafing target. Trains smooth crosshair control.', to: '/drills/tracking' },
  { name: 'Target Switching', blurb: 'Several targets alive at once. Trains clean transitions.' },
]

export default function Drills() {
  return (
    <div className="page">
      <h1>Drills</h1>
      <div className="drill-grid">
        {DRILLS.map((d) =>
          d.to ? (
            <Link key={d.name} to={d.to} className="drill-card">
              <h3>{d.name}</h3>
              <p>{d.blurb}</p>
            </Link>
          ) : (
            <div key={d.name} className="drill-card soon">
              <h3>{d.name} <span className="badge">Soon</span></h3>
              <p>{d.blurb}</p>
            </div>
          ),
        )}
      </div>
    </div>
  )
}