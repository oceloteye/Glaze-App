import { useState } from 'react'
import { NavLink } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/generator', label: 'Recipe Generator' },
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <NavLink to="/" className="site-brand" end>
        <span className="site-brand__mark" aria-hidden="true" />
        Glaze Lab
      </NavLink>

      <button
        type="button"
        className="site-nav-toggle"
        aria-expanded={menuOpen}
        aria-controls="site-nav"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        <span className="site-nav-toggle__bar" aria-hidden="true" />
        <span className="site-nav-toggle__bar" aria-hidden="true" />
        <span className="site-nav-toggle__bar" aria-hidden="true" />
      </button>

      <nav id="site-nav" className={`site-nav${menuOpen ? ' site-nav--open' : ''}`} aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `site-nav__link${isActive ? ' site-nav__link--active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
