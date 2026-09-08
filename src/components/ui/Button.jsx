import { forwardRef } from 'react'

const VARIANTS = {
  primary:
    'bg-brand text-brand-ink hover:bg-brand-bright shadow-[0_1px_0_rgba(255,255,255,.15)_inset]',
  secondary: 'bg-surface-hi text-fg hover:bg-line border border-line',
  ghost: 'bg-transparent text-fg-dim hover:text-fg hover:bg-surface-hi',
  danger: 'bg-danger/15 text-danger-bright hover:bg-danger/25 border border-danger/30',
  'danger-solid': 'bg-danger text-white hover:bg-danger-bright',
}

const SIZES = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
}

const Button = forwardRef(function Button(
  { as: As = 'button', variant = 'primary', size = 'md', className = '', icon: Icon, children, ...rest },
  ref,
) {
  return (
    <As
      ref={ref}
      className={`ring-focus inline-flex select-none items-center justify-center font-medium transition-colors duration-100 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} aria-hidden />}
      {children}
    </As>
  )
})

export default Button
