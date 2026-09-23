// Algerian phone helpers. Mobile = 0(5|6|7) + 8 digits (local, 10 chars).

const COUNTRY = '213'

// Eastern Arabic-Indic (U+0660..0669) and Persian (U+06F0..06F9) digits — an
// Arabic keyboard/IME types these, and they must become ASCII before any of
// the checks below can recognise them as a phone number.
const AR_INDIC = /[٠-٩۰-۹]/g
const asciiDigits = (s) =>
  s.replace(AR_INDIC, (d) => {
    const c = d.charCodeAt(0)
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660)
  })

// Whitespace / separators, plus LRM, RLM and the other invisible bidi controls
// that ride along when a number is pasted out of an RTL document.
const NOISE = new RegExp('[\\s\\-().\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069]', 'g')

/**
 * Strip formatting and normalise any +213 / 00213 / 213 prefix to local
 * 0xxxxxxxxx. Accepts Arabic-Indic digits and tolerates copy-pasted bidi
 * control marks. `+213` followed by the full local number with its leading
 * zero — e.g. `+2130561938525` — is handled too.
 */
export function normalizePhone(raw = '') {
  let s = asciiDigits(String(raw)).replace(NOISE, '')
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
