import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Loader2, ExternalLink } from 'lucide-react'
import Field from './ui/Field'
import Button from './ui/Button'
import { useToast } from './ui/Toast'
import { useSmsGateway } from '../hooks/useSmsGateway'
import { DEFAULT_BASE_URL, testGateway } from '../services/smsGateway'
import { isValidDzMobile } from '../utils/phone'

const HTTPSMS_PLAY = 'https://play.google.com/store/apps/details?id=com.httpsms'

/**
 * One-time connection to the free httpSMS gateway, shown inline wherever the
 * owner needs automatic sending (mainly the "notify clients" dialog). Once it
 * is saved with `enabled: true` the config lives in Firestore, so every later
 * send — personalized or not — is a single tap with no trip to the Settings
 * page. `onReady` fires after a successful connect.
 */
export default function SmsGatewaySetup({ onReady, onNavigate }) {
  const { config, save } = useSmsGateway()
  const toast = useToast()
  const [fromNumber, setFromNumber] = useState(config.fromNumber || '')
  const [apiKey, setApiKey] = useState(config.apiKey || '')
  const [busy, setBusy] = useState(false)

  // Firestore config arrives a tick after mount — prefill any earlier values once.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    if (config.fromNumber || config.apiKey) {
      setFromNumber(config.fromNumber || '')
      setApiKey(config.apiKey || '')
      seeded.current = true
    }
  }, [config.fromNumber, config.apiKey])

  const phoneOk = isValidDzMobile(fromNumber)
  const canConnect = phoneOk && apiKey.trim().length > 0 && !busy

  // Keep the phone field to digits only — people paste emails / spaces here.
  const onPhone = (e) => setFromNumber(e.target.value.replace(/\D/g, '').slice(0, 10))

  const pasteKey = async () => {
    try {
      const t = (await navigator.clipboard.readText()).trim()
      if (t) {
        setApiKey(t)
        toast('تم لصق المفتاح', 'success')
      }
    } catch {
      toast('تعذّر الوصول إلى الحافظة — الصق يدوياً', 'error')
    }
  }

  const connect = async () => {
    setBusy(true)
    const cfg = {
      enabled: true,
      apiKey: apiKey.trim(),
      fromNumber: fromNumber.trim(),
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    }
    // Verify the key + number actually work before flipping automatic on.
    const { ok, error } = await testGateway(cfg)
    if (!ok) {
      setBusy(false)
      return toast(`تعذّر الاتصال: ${error}`, 'error')
    }
    try {
      await save(cfg)
      toast('تم تفعيل الإرسال التلقائي ✅ — وصلت رسالة تجريبية إلى رقمك', 'success')
      onReady?.()
    } catch {
      toast('تعذّر حفظ الإعدادات', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/25 bg-brand/[0.07] p-3.5">
      <div className="flex items-start gap-2">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand-bright" />
        <div>
          <p className="text-[13px] font-semibold text-fg">فعّل الإرسال التلقائي — مرة واحدة فقط</p>
          <p className="mt-0.5 text-[12px] leading-6 text-fg-mute">
            بعدها يكفي زرّ واحد لإرسال كل الرسائل المخصّصة من رقمك مباشرة، دون فتح تطبيق الرسائل.
          </p>
        </div>
      </div>

      <ol className="space-y-1 rounded-lg bg-night-raised/70 p-2.5 text-[12px] leading-6 text-fg-dim">
        <li>
          ١. ثبّت تطبيق{' '}
          <a
            href={HTTPSMS_PLAY}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-bright hover:underline"
          >
            httpSMS <ExternalLink className="inline h-3 w-3" />
          </a>{' '}
          المجاني على هاتفك، وسجّل الدخول برقمك.
        </li>
        <li>٢. انسخ «مفتاح API» من التطبيق والصقه هنا.</li>
      </ol>

      <Field
        label="رقم هاتفك (المُرسِل)"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={10}
        dir="ltr"
        placeholder="0665000000"
        value={fromNumber}
        onChange={onPhone}
        hint="رقم هاتفك في تطبيق httpSMS بالصيغة المحلية: عشرة أرقام تبدأ بـ 05 أو 06 أو 07"
        error={fromNumber && !phoneOk ? 'أدخل رقم هاتف جزائري صحيح، مثل 0665000000' : undefined}
      />
      <div>
        <Field
          label="مفتاح API"
          type="password"
          dir="ltr"
          autoComplete="off"
          placeholder="••••••••••••"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value.trim())}
        />
        <button
          type="button"
          onClick={pasteKey}
          className="ring-focus mt-1.5 text-[12px] font-medium text-brand-bright hover:underline"
        >
          لصق المفتاح من الحافظة
        </button>
      </div>

      <Button className="w-full" size="sm" onClick={connect} disabled={!canConnect}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> جاري التفعيل…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" /> تفعيل وحفظ
          </>
        )}
      </Button>

      <p className="text-center text-[11px] text-fg-mute">
        الرسائل تُرسَل من هاتفك وعلى رصيدك العادي ·{' '}
        <Link to="/settings" onClick={onNavigate} className="text-brand-bright hover:underline">
          خيارات أكثر
        </Link>
      </p>
    </div>
  )
}
