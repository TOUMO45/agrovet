import Logo from './Logo'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo markClassName="h-11 w-11" textClassName="text-xl" />
          <div>
            <h1 className="text-lg font-bold text-fg">{title}</h1>
            {subtitle && <p className="mt-1 text-[13px] text-fg-mute">{subtitle}</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">{children}</div>
        {footer && <p className="mt-4 text-center text-[13px] text-fg-mute">{footer}</p>}
      </div>
    </div>
  )
}
