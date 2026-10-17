export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <p style={{ color: 'var(--muted)' }}>Coming soon.</p>
    </div>
  )
}