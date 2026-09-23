import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { Home, ShoppingCart, Boxes, ClipboardList, Archive, Settings, LogOut, UserRound } from 'lucide-react'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const NAV = [
  { to: '/dashboard', label: 'الرئيسية', icon: Home },
  { to: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { to: '/stock', label: 'المخزون', icon: Boxes },
  { to: '/lists', label: 'القوائم', icon: ClipboardList },
  { to: '/archive', label: 'الأرشيف', icon: Archive },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
]

function initials(nameOrEmail = '') {
  const s = nameOrEmail.trim()
  if (!s) return '؟'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  const name = user?.name || user?.email || ''

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-night/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="ring-focus rounded-lg">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `ring-focus inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-surface-hi text-fg'
                      : 'text-fg-dim hover:bg-surface-hi hover:text-fg'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="ring-focus flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5 transition-colors hover:bg-surface-hi"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-[12px] font-bold text-brand-bright">
              {initials(name)}
            </span>
            <span className="hidden max-w-[9rem] truncate text-[13px] font-medium text-fg sm:block">
              {name}
            </span>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute left-0 mt-2 w-52 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
            >
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-fg-dim transition-colors hover:bg-surface-hi hover:text-fg"
                role="menuitem"
              >
                <UserRound className="h-4 w-4" />
                الملف الشخصي
              </Link>
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-fg-dim transition-colors hover:bg-surface-hi hover:text-fg md:hidden"
                role="menuitem"
              >
                <Settings className="h-4 w-4" />
                الإعدادات
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 border-t border-line px-3.5 py-2.5 text-[13px] text-danger-bright transition-colors hover:bg-danger/10"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
