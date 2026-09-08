import { auth } from '../lib/firebase'

/**
 * Client for the site's own serverless sender (`netlify/functions/send-sms.js`).
 * When that function is configured on the deploy, sending is fully automatic and
 * needs zero setup from whoever uses the app — this module just calls it.
 *
 * Same origin as the app, so no CORS and no key in the browser. Each call sends
 * one message; `sendBulkViaBackend` loops with gentle pacing and progress.
 */

const ENDPOINT = '/.netlify/functions/send-sms'

let statusCache // { configured, provider } once fetched

/** Is a server-side SMS provider configured on this deploy? Cached after first call. */
export async function getBackendStatus({ force = false } = {}) {
  if (statusCache && !force) return statusCache
  try {
    const res = await fetch(ENDPOINT, { method: 'GET' })
    if (!res.ok) return (statusCache = { configured: false, provider: null })
    const data = await res.json()
    return (statusCache = { configured: Boolean(data.configured), provider: data.provider || null })
  } catch {
    // No function on this host (local dev, drag-and-drop deploy, offline) — fine.
    return (statusCache = { configured: false, provider: null })
  }
}

export function isBackendReady(status) {
  return Boolean(status?.configured)
}

async function idToken() {
  const u = auth.currentUser
  if (!u) throw new Error('يجب تسجيل الدخول')
  return u.getIdToken()
}

/** Send one message through the backend. Returns { ok, id, error }. */
export async function sendOneViaBackend(to, content) {
  try {
    const token = await idToken()
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, content }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `فشل الإرسال (${res.status})` }
    }
    return { ok: true, id: data.id || null }
  } catch (err) {
    const msg = /failed to fetch|networkerror|load failed/i.test(err.message || '')
      ? 'تعذّر الاتصال بخادم الرسائل — تحقّق من الإنترنت'
      : err.message || 'فشل الإرسال'
    return { ok: false, error: msg }
  }
}

/**
 * Send to many recipients, one request each. `items`: [{ id, name, to, content }].
 * Calls `onProgress({ done, total, item, result })` after each. Returns
 * { sent, failed, results }.
 */
export async function sendBulkViaBackend(items, onProgress) {
  const results = []
  let sent = 0
  let failed = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    // eslint-disable-next-line no-await-in-loop
    const result = await sendOneViaBackend(item.to, item.content)
    results.push({ ...item, ...result })
    result.ok ? sent++ : failed++
    onProgress?.({ done: i + 1, total: items.length, item, result })
    // eslint-disable-next-line no-await-in-loop
    if (i < items.length - 1) await new Promise((r) => setTimeout(r, 300))
  }
  return { sent, failed, results }
}
