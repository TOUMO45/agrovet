// Algerian phone helpers. Mobile = 0(5|6|7) + 8 digits (local, 10 chars).

const COUNTRY = '213'

/** Strip formatting and normalise any +213 / 00213 / 213 prefix to local 0xxxxxxxxx. */
export function normalizePhone(raw = '') {
  let s = String(raw).replace(/[\s\-().]/g, '')
  s = s.replace(/^\+/, '')
  if (s.startsWith('00' + COUNTRY)) s = s.slice(2 + COUNTRY.length)
  else if (s.startsWith(COUNTRY) && s.length >= 11) s = s.slice(COUNTRY.length)
  if (s && !s.startsWith('0')) s = '0' + s
  return s
}

export function isValidDzMobile(raw = '') {
  return /^0[567]\d{8}$/.test(normalizePhone(raw))
}

/** Local dialing form, e.g. "0668938144". Empty string if it can't be made sane. */
export function toLocal(raw = '') {
  const s = normalizePhone(raw)
  return /^0\d{8,9}$/.test(s) ? s : ''
}

/** International form without "+", e.g. "213668938144" — for wa.me links. */
export function toIntl(raw = '') {
  const s = normalizePhone(raw)
  return /^0\d{8,9}$/.test(s) ? COUNTRY + s.slice(1) : ''
}

/** E.164 form, e.g. "+213668938144" — for SMS-gateway APIs. */
export function toE164(raw = '') {
  const intl = toIntl(raw)
  return intl ? '+' + intl : ''
}
