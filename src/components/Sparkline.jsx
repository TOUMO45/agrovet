/**
 * Minimal inline sparkline. `data` is an array of numbers, oldest -> newest.
 * Renders nothing meaningful below 2 points (shows a flat baseline).
 */
export default function Sparkline({ data = [], width = 96, height = 28, className = '' }) {
  const points = data.filter((n) => Number.isFinite(n))
  if (points.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line x1="0" y1={height - 2} x2={width} y2={height - 2} stroke="#27324B" strokeWidth="2" />
      </svg>
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = width / (points.length - 1)
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6)
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const up = points[points.length - 1] >= points[0]
  const stroke = up ? '#34D399' : '#F5B841'

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={stroke} fillOpacity="0.12" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={y(points[points.length - 1])} r="2.5" fill={stroke} />
    </svg>
  )
}
