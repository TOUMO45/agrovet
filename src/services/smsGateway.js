import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { toE164 } from '../utils/phone'

/**
 * Automatic SMS via httpSMS (https://httpsms.com) — a free/open-source Android
 * app that sends messages through the phone's own SIM. Its API allows browser
 * calls (CORS `*`), so the dashboard can send with no server of its own.
 *
 * Config lives in Firestore `settings/smsGateway` so it follows the owner
 * across devices:  { enabled, apiKey, fromNumber, baseUrl }
 */

const CONFIG_REF = doc(db, 'settings', 'smsGateway')
export const DEFAULT_BASE_URL = 'https://api.httpsms.com'

export const emptyGatewayConfig = {
  enabled: false,
  apiKey: '',
  fromNumber: '',
  baseUrl: DEFAULT_BASE_URL,
}

export function subscribeGatewayConfig(onData) {
  return onSnapshot(
    CONFIG_REF,
    (snap) => onData({ ...emptyGatewayConfig, ...(snap.data() || {}) }),
    (err) => {
      console.error('Error reading SMS gateway config:', err)
      onData(emptyGatewayConfig)
    },
  )
}

export async function saveGatewayConfig(patch) {
  await setDoc(CONFIG_REF, patch, { merge: true })
}

export function isGatewayReady(cfg) {
  return Boolean(cfg?.enabled && cfg?.apiKey && toE164(cfg?.fromNumber))
}

async function postMessage({ apiKey, baseUrl, from, to, content }) {
  const res = await fetch(`${(baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')}/v1/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ content, from, to }),
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    let msg
    if (res.status === 401 || res.status === 403) msg = 'مفتاح API غير صحيح'
    else if (res.status === 402 || res.status === 429) msg = 'تجاوزت حد الباقة المجانية'
    else msg = data?.message || data?.data || `فشل الإرسال (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : 'فشل الإرسال')
  }
  return data?.data?.id || data?.id || null
}

/** Send one message. Returns { ok, id, error }. */
export async function sendOne(cfg, to, content) {
  const from = toE164(cfg.fromNumber)
  const e164 = toE164(to)
  if (!from) return { ok: false, error: 'رقم المُرسِل غير صحيح في الإعدادات' }
  if (!e164) return { ok: false, error: 'رقم غير صالح' }
  try {
    const id = await postMessage({ apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, from, to: e164, content })
    return { ok: true, id }
  } catch (err) {
    const msg = /failed to fetch|networkerror|load failed/i.test(err.message || '')
      ? 'تعذّر الاتصال بخادم الرسائل — تأكد من الإنترنت والإعدادات'
      : err.message || 'فشل الإرسال'
    return { ok: false, error: msg }
  }
}

/**
 * Send to many recipients, one request each (httpSMS is single-recipient).
 * `items`: [{ id, to, content }]. Calls `onProgress({ done, total, item, result })`
 * after each. Returns { sent, failed, results }.
 */
export async function sendBulk(cfg, items, onProgress) {
  const results = []
  let sent = 0
  let failed = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    // eslint-disable-next-line no-await-in-loop
    const result = await sendOne(cfg, item.to, item.content)
    results.push({ ...item, ...result })
    result.ok ? sent++ : failed++
    onProgress?.({ done: i + 1, total: items.length, item, result })
    // gentle pacing so the phone app isn't hammered
    if (i < items.length - 1) await new Promise((r) => setTimeout(r, 350))
  }
  return { sent, failed, results }
}

/** Fire a single message to the owner's own number as a connectivity test. */
export async function testGateway(cfg) {
  return sendOne(cfg, cfg.fromNumber, 'رسالة تجريبية من تطبيق أغروفيت ✅')
}
