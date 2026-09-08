import { forwardRef } from 'react'

const TONES = {
  default: 'text-fg-dim hover:text-fg hover:bg-surface-hi',
  brand: 'text-brand-bright hover:bg-brand/15',
  info: 'text-info hover:bg-info/15',
  danger: 'text-danger-bright hover:bg-danger/15',
}

const IconButton = forwardRef(function IconButton(
  { icon: Icon, tone = 'default', label, className = '', size = 'md', ...rest },
  ref,
) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const glyph = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`ring-focus inline-flex ${box} items-center justify-center rounded-lg transition-colors duration-100 active:scale-95 ${TONES[tone]} ${className}`}
      {...rest}
    >
      <Icon className={glyph} aria-hidden />
    </button>
  )
})

export default IconButton
