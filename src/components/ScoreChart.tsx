export default function ScoreChart({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p style={{ color: 'var(--muted)', margin: 0 }}>Play at least 2 runs to see a trend.</p>
  }
  const W = 600, H = 160, PAD = 14
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(1, max - min)
  const pts = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - 2 * PAD),
    y: H - PAD - ((v - min) / span) * (H - 2 * PAD),
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Score over recent runs">
      <polyline className="chart-line" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
      {pts.map((p, i) => (
        <circle key={i} className="chart-dot" cx={p.x} cy={p.y} r={3} />
      ))}
      <text className="chart-label" x={PAD} y={12}>{max}</text>
      <text className="chart-label" x={PAD} y={H - 2}>{min}</text>
    </svg>
  )
}