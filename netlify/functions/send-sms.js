/**
 * Agrovet SMS backend — one message per call; the browser loops for bulk sends
 * so each invocation stays well under Netlify's 10s limit.
 *
 * It ships with the site, so once it is configured NOBODY has to set up httpSMS
 * on their phone: the app detects the backend and sends with one tap. The
 * provider key never reaches the browser.
 *
 * ── Configure in Netlify → Site configuration → Environment variables ──────────
 *
 *   SMS_PROVIDER        "httpsms" (default) | "twilio"
 *   FIREBASE_API_KEY    your Firebase Web API key (same value as
 *                       VITE_FIREBASE_API_KEY) — used only to check the caller
 *                       is a signed-in Agrovet user.
 *   SMS_ALLOWED_EMAILS  optional, comma-separated allow-list. When set, only
 *                       those signed-in accounts may send.
 *
 *   # provider "httpsms" — free, sends from your own SIM via the httpSMS app
 *   HTTPSMS_API_KEY
 *   HTTPSMS_FROM        your number in E.164, e.g. +213661234567
 *   HTTPSMS_BASE_URL    optional, default https://api.httpsms.com
 *
 *   # provider "twilio" — paid cloud gateway (~$0.05 / SMS to Algeria)
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM         a Twilio number in E.164, or a Messaging Service SID (MG…)
 *
 * ── API ──────────────────────────────────────────────────────────────────────
 *   GET   → { configured, provider }                       (health check)
 *   POST  → body { to, content }, header Authorization: Bearer <firebase id token>
 *         → 200 { ok:true, id }  |  4xx/5xx { ok:false, error }
 */

const JSON_HEADERS = { 'content-type': 'application/json' }
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
}

function json(statusCode, body) {
  return { statusCode, headers: { ...JSON_HEADERS, ...CORS }, body: JSON.stringify(body) }
}

function providerConfigured(provider) {
  if (provider === 'twilio') {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM,
    )
  }
  return Boolean(process.env.HTTPSMS_API_KEY && process.env.HTTPSMS_FROM)
}

/** Algerian mobile in any form → E.164 (+213…), or '' if it isn't one. */
function toE164Dz(raw) {
  let s = String(raw || '').replace(/[\s\-().]/g, '').replace(/^\+/, '')
  if (s.startsWith('00213')) s = s.slice(5)
  else if (s.startsWith('213') && s.length >= 11) s = s.slice(3)
  else if (s.startsWith('0')) s = s.slice(1)
  return /^[567]\d{8}$/.test(s) ? `+213${s}` : ''
}

/** Confirm the request carries a valid Firebase session for an allowed account. */
async function verifyCaller(authHeader) {
  const apiKey = process.env.FIREBASE_API_KEY
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!apiKey) return { ok: false, error: 'الخادم غير مكتمل الإعداد (FIREBASE_API_KEY)' }
  if (!token) return { ok: false, error: 'يجب تسجيل الدخول' }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ idToken: token }) },
  )
  const data = await res.json().catch(() => ({}))
  const user = res.ok && Array.isArray(data.users) && data.users[0]
  if (!user) return { ok: false, error: 'الجلسة غير صالحة' }

  const allow = (process.env.SMS_ALLOWED_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (allow.length && !allow.includes(String(user.email || '').toLowerCase())) {
    return { ok: false, error: 'هذا الحساب غير مخوّل بالإرسال' }
  }
  return { ok: true, email: user.email }
}

async function sendHttpsms(to, content) {
  const base = (process.env.HTTPSMS_BASE_URL || 'https://api.httpsms.com').replace(/\/$/, '')
  const res = await fetch(`${base}/v1/messages/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.HTTPSMS_API_KEY },
    body: JSON.stringify({ content, from: process.env.HTTPSMS_FROM, to }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const m =
      res.status === 401 || res.status === 403
        ? 'مفتاح httpSMS غير صحيح في إعدادات الخادم'
        : res.status === 402 || res.status === 429
          ? 'تجاوز الخادم حد باقة httpSMS'
          : data.message || `فشل الإرسال (${res.status})`
    throw new Error(typeof m === 'string' ? m : 'فشل الإرسال')
  }
  return data?.data?.id || data?.id || null
}

async function sendTwilio(to, content) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const from = process.env.TWILIO_FROM
  const body = new URLSearchParams({ To: to, Body: content })
  if (/^MG/.test(from)) body.set('MessagingServiceSid', from)
  else body.set('From', from)

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
    },
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `فشل الإرسال (${res.status})`)
  return data.sid || null
}

export const handler = async (event) => {
  const provider = (process.env.SMS_PROVIDER || 'httpsms').toLowerCase()

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod === 'GET') {
    return json(200, { configured: providerConfigured(provider), provider })
  }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method not allowed' })

  if (!providerConfigured(provider)) {
    return json(503, { ok: false, error: 'خادم الرسائل غير مُهيّأ بعد' })
  }

  const auth = await verifyCaller(event.headers.authorization || event.headers.Authorization)
  if (!auth.ok) return json(401, { ok: false, error: auth.error })

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'صيغة الطلب غير صحيحة' })
  }
  const content = String(payload.content || '').trim()
  const to = toE164Dz(payload.to)
  if (!to) return json(400, { ok: false, error: 'رقم غير صالح' })
  if (!content) return json(400, { ok: false, error: 'نص الرسالة فارغ' })

  try {
    const id = provider === 'twilio' ? await sendTwilio(to, content) : await sendHttpsms(to, content)
    return json(200, { ok: true, id })
  } catch (err) {
    return json(502, { ok: false, error: err.message || 'فشل الإرسال' })
  }
}
