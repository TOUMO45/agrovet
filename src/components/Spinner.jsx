import { LogoMark } from './Logo'

export default function Spinner({ className = '' }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-bright ${className}`}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <LogoMark className="h-12 w-12 animate-pulse" />
      <Spinner />
    </div>
  )
}
