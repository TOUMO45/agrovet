import { Plus } from 'lucide-react'

/** Floating action button — mobile only, sits above the bottom nav. */
export default function Fab({ onClick, label = 'طلب جديد', icon: Icon = Plus, hidden = false }) {
  if (hidden) return null
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="ring-focus fixed left-4 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-brand-ink shadow-glow-brand transition-transform active:scale-95 md:hidden"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      <Icon className="h-7 w-7" strokeWidth={2.5} />
    </button>
  )
}
