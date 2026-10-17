import { NavLink, Link } from 'react-router-dom'

export const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/drills', label: 'Drills' },
  { to: '/routine', label: 'Routine' },
  { to: '/history', label: 'History' },
  { to: '/sensitivity', label: 'Sensitivity' },
]

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="logo">ZEROIN</Link>
      <nav>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}