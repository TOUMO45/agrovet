import { format, formatDistanceToNow } from 'date-fns'
import { arDZ } from 'date-fns/locale'

// Algerian Dinar. Grouped with a thin space (fr-DZ style): 12 345 د.ج
const numberFmt = new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 })

export function formatNumber(n) {
  const value = Number(n)
  return Number.isFinite(value) ? numberFmt.format(value) : '0'
}

export function formatDZD(n) {
  return `${formatNumber(n)} د.ج`
}

// No-break space (U+00A0). A regular ASCII space makes right-to-left SMS
// clients reorder the digit groups — "16 000" arrives as "000 16" — while a
// no-break space keeps the amount intact. It is also what `fr-DZ` uses for the
// on-screen numbers, so the SMS preview now matches the rest of the app.
const NBSP = ' '

/** Like formatDZD but plain digits joined with NBSP — safe inside an SMS. */
export function formatDZDPlain(n) {
  const value = Number(n)
  const grouped = Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
        .format(value)
        .replace(/,/g, NBSP)
    : '0'
  return `${grouped}${NBSP}د.ج`
}

export function formatDate(iso, fmt = 'dd MMM yyyy') {
  try {
    return format(new Date(iso), fmt, { locale: arDZ })
  } catch {
    return '—'
  }
}

export function formatRelative(iso) {
  try {
    return formatDistanceToNow(new Date(iso), { locale: arDZ, addSuffix: true })
  } catch {
    return ''
  }
}

/**
 * Per-order unit price. New orders store `unitPrice`; legacy orders don't,
 * so fall back to totalPrice/quantity, then to the current global price.
 */
export function orderUnitPrice(order, currentPrice = 0) {
  if (Number.isFinite(order?.unitPrice) && order.unitPrice > 0) return order.unitPrice
  if (order?.quantity > 0 && Number.isFinite(order?.totalPrice)) {
    return order.totalPrice / order.quantity
  }
  return currentPrice
}
