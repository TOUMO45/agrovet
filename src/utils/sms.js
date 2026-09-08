import { toIntl, toLocal } from './phone'

// Clinic identity used in the message footers.
export const CLINIC_LINE = 'عيادة Agrovet، طريق التبّون، أدغا، أدرار'
export const DOCTOR_LINE = 'د. لعبودي عبد الغني'

export const DEFAULT_SMS_TEMPLATE =
  'السّادة العملاء الكرام،\n' +
  'نُعلمكم أنّ طلباتكم من الكتاكيت جاهزة للاستلام.\n' +
  'موعد الاستلام: {التاريخ} على الساعة {الوقت}\n' +
  `مكان الاستلام: ${CLINIC_LINE}\n` +
  'نرجو الحضور في الموعد المحدّد. شكرًا لثقتكم.\n' +
  DOCTOR_LINE

export const PERSONALIZED_SMS_TEMPLATE =
  'السّيد(ة) {الاسم}،\n' +
  'نُعلمكم أنّ طلبكم من الكتاكيت جاهز للاستلام، وهذه تفاصيله:\n' +
  'الكمية: {الكمية} كتكوت\n' +
  'المبلغ الإجمالي: {الإجمالي}\n' +
  'موعد الاستلام: {التاريخ} على الساعة {الوقت}\n' +
  `مكان الاستلام: ${CLINIC_LINE}\n` +
  'نرجو الحضور في الموعد المحدّد. شكرًا لثقتكم.\n' +
  DOCTOR_LINE

const opt = (v) => (v === '' || v == null ? '' : String(v))

/** Replace {التاريخ}/{الوقت}/{الاسم}/{الكمية}/{الإجمالي}. Unknown tokens stay. */
export function fillSmsTemplate(
  template,
  { date = '', time = '', name = '', quantity = '', total = '' } = {},
) {
  return String(template)
    .replaceAll('{التاريخ}', date || '—')
    .replaceAll('{الوقت}', time || '—')
    .replaceAll('{الاسم}', name || '')
    .replaceAll('{الكمية}', opt(quantity))
    .replaceAll('{الإجمالي}', opt(total))
    .replaceAll('{date}', date || '—')
    .replaceAll('{time}', time || '—')
}

/**
 * Build an `sms:` URI. Android opens Messages with every recipient filled in
 * and the body ready; the user still taps send (the web platform gives no way
 * to send silently). Recipients are de-duplicated and reduced to local form.
 */
export function buildSmsUri(rawNumbers = [], body = '') {
  const numbers = [...new Set(rawNumbers.map(toLocal).filter(Boolean))]
  if (numbers.length === 0) return null
  return `sms:${numbers.join(',')}?body=${encodeURIComponent(body)}`
}

/**
 * Build a `https://wa.me/…` link that opens WhatsApp (app on mobile, web on
 * desktop) with the message pre-filled for one recipient. Free, no account or
 * key — the owner just taps send. Returns null if the number isn't a DZ mobile.
 */
export function buildWhatsAppUri(rawNumber, body = '') {
  const intl = toIntl(rawNumber)
  if (!intl) return null
  return `https://wa.me/${intl}?text=${encodeURIComponent(body)}`
}

/** Format an <input type="date"> value (yyyy-mm-dd) as a readable Arabic date. */
export function readableDate(value) {
  if (!value) return ''
  const d = new Date(value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  const parts = new Intl.DateTimeFormat('ar-DZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  // "الخميس، 10 سبتمبر 2026" -> "يوم الخميس 10 سبتمبر 2026"
  return 'يوم ' + parts.replace('،', '')
}

/** Format an <input type="time"> value (HH:mm) as e.g. "9:00 صباحًا". */
export function readableTime(value) {
  if (!value) return ''
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h)) return value
  const period = h < 12 ? 'صباحًا' : 'مساءً'
  const h12 = ((h + 11) % 12) + 1
  const mm = String(m || 0).padStart(2, '0')
  return `${h12}:${mm} ${period}`
}
