/** Wordmark + mark for أغروفيت. The mark is a chick inside a rounded tile. */
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="أغروفيت">
      <defs>
        <linearGradient id="agv-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#0EA372" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#agv-g)" />
      <rect x="1" y="1" width="38" height="38" rx="11" fill="none" stroke="#ffffff" strokeOpacity="0.18" />
      {/* chick body */}
      <path
        d="M20 10.5c-5 0-8.6 3.4-8.6 8 0 2.5 1.1 4.6 3 6-.5.9-1.3 1.6-2.3 2 .3.6 1.7 1 3 1 1.6 0 3-.6 3.9-1.3.9.2 1.9.3 3 .3s2.1-.1 3-.3c.9.7 2.3 1.3 3.9 1.3 1.3 0 2.7-.4 3-1-1-.4-1.8-1.1-2.3-2 1.9-1.4 3-3.5 3-6 0-4.6-3.6-8-8.6-8Z"
        fill="#04231A"
      />
      {/* eye */}
      <circle cx="17.4" cy="17.6" r="1.5" fill="#34D399" />
      {/* beak */}
      <path d="M12.6 19.2l-3 1.2 3 1.2z" fill="#F5B841" />
      {/* tuft */}
      <path d="M20 10.5c-.3-1.6.4-3 1.6-3.6-.2 1 .1 2 .9 2.7-1 .1-1.9.4-2.5.9Z" fill="#04231A" />
    </svg>
  )
}

export default function Logo({ markClassName, textClassName = 'text-[17px]' }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={markClassName || 'h-9 w-9'} />
      <span className={`font-bold tracking-tight text-fg ${textClassName}`}>أغروفيت</span>
    </span>
  )
}
