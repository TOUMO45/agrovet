import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, Boxes, ClipboardList, Archive } from 'lucide-react'

const TABS = [
  { to: '/dashboard', label: 'الرئيسية', icon: Home },
  { to: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { to: '/stock', label: 'المخزون', icon: Boxes },
  { to: '/lists', label: 'القوائم', icon: ClipboardList },
  { to: '/archive', label: 'الأرشيف', icon: Archive },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night/90 backdrop-blur md:hidden">
      <div
        className="mx-auto flex max-w-md items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `ring-focus flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand-bright' : 'text-fg-mute hover:text-fg-dim'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                    isActive ? 'bg-brand/15' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
