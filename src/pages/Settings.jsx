import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, Send, ShieldCheck, ShieldAlert, Save, ServerCog } from 'lucide-react'
import { useSmsGateway } from '../hooks/useSmsGateway'
import { useSmsBackend } from '../hooks/useSmsBackend'
import { DEFAULT_BASE_URL, isGatewayReady, testGateway } from '../services/smsGateway'
import { useToast } from '../components/ui/Toast'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'
import Switch from '../components/ui/Switch'
import { isValidDzMobile } from '../utils/phone'

const HTTPSMS_PLAY = 'https://play.google.com/store/apps/details?id=com.httpsms'

export default function Settings() {
  const { config, loading, save } = useSmsGateway()
  const backend = useSmsBackend()
  const toast = useToast()

  const [form, setForm] = useState(config)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const seeded = useRef(false)

  useEffect(() => {
    if (!loading && !seeded.current) {
      setForm(config)
      seeded.current = true
    }
  }, [loading, config])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const phoneOk = !form.fromNumber || isValidDzMobile(form.fromNumber)
  const ready = isGatewayReady({ ...form, enabled: true })

  const handleSave = async () => {
    setSaving(true)
    try {
      await save({
        enabled: !!form.enabled,
        apiKey: (form.apiKey || '').trim(),
        fromNumber: (form.fromNumber || '').trim(),
        baseUrl: (form.baseUrl || '').trim() || DEFAULT_BASE_URL,
      })
      toast('تم حفظ الإعدادات', 'success')
    } catch (err) {
      console.error(err)
      toast('تعذّر حفظ الإعدادات', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    const { ok, error } = await testGateway({
      ...form,
      baseUrl: form.baseUrl || DEFAULT_BASE_URL,
    })
    setTesting(false)
    toast(
      ok ? 'تم إرسال رسالة تجريبية إلى رقمك ✅' : `فشل الاختبار: ${error}`,
      ok ? 'success' : 'error',
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-28 sm:py-8 md:pb-8">
      <h1 className="mb-1 text-lg font-bold text-fg sm:text-xl">الإعدادات</h1>
      <p className="mb-5 text-[13px] text-fg-mute">إرسال الرسائل تلقائياً إلى العملاء من رقم هاتفك.</p>

      {backend.configured && (
        <div className="mb-4 flex gap-2.5 rounded-2xl border border-brand/30 bg-brand/10 p-4 text-[12px] leading-6 text-fg-dim">
          <ServerCog className="mt-0.5 h-4 w-4 shrink-0 text-brand-bright" />
          <p>
            <b className="text-fg">الإرسال التلقائي يعمل عبر خادم الموقع</b>
            {backend.provider ? ` (${backend.provider})` : ''} — لا حاجة لإعداد httpSMS هنا. زرّ
            «إرسال إلى الكل» في نافذة تنبيه العملاء يكفي. الإعداد أدناه يبقى كخيار احتياطي.
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`grid h-9 w-9 place-items-center rounded-xl ${
                ready ? 'bg-brand/15 text-brand-bright' : 'bg-warn/15 text-warn'
              }`}
            >
              {ready ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">بوابة الرسائل (httpSMS)</p>
              <p className="text-[12px] text-fg-mute">
                {ready ? 'جاهزة للإرسال التلقائي' : 'أكمل الإعداد أدناه'}
              </p>
            </div>
          </div>
          <a
            href={HTTPSMS_PLAY}
            target="_blank"
            rel="noreferrer"
            className="ring-focus inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-brand-bright hover:bg-brand/10"
          >
            تثبيت التطبيق
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <ol className="space-y-1.5 rounded-xl bg-night-raised p-3 text-[12px] leading-6 text-fg-dim">
          <li>١. ثبّت تطبيق <b className="text-fg">httpSMS</b> المجاني على هاتف الأندرويد.</li>
          <li>٢. افتح التطبيق وسجّل الدخول برقم هاتفك (هو رقم المُرسِل).</li>
          <li>٣. من التطبيق، انسخ <b className="text-fg">مفتاح API</b> والصقه هنا.</li>
        </ol>

        <Field
          label="رقم هاتفك (المُرسِل)"
          type="tel"
          inputMode="tel"
          dir="ltr"
          placeholder="0665000000"
          value={form.fromNumber || ''}
          onChange={(e) => set({ fromNumber: e.target.value })}
          error={!phoneOk ? 'رقم غير صالح' : undefined}
          hint={phoneOk ? 'نفس الرقم المسجّل في تطبيق httpSMS' : undefined}
        />

        <Field
          label="مفتاح API"
          type="password"
          dir="ltr"
          placeholder="••••••••••••"
          value={form.apiKey || ''}
          onChange={(e) => set({ apiKey: e.target.value })}
        />

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="ring-focus text-[12px] font-medium text-fg-mute hover:text-fg-dim"
        >
          {showAdvanced ? '− إخفاء' : '+ خيارات متقدمة'}
        </button>
        {showAdvanced && (
          <Field
            label="عنوان الخادم"
            dir="ltr"
            placeholder={DEFAULT_BASE_URL}
            value={form.baseUrl || ''}
            onChange={(e) => set({ baseUrl: e.target.value })}
            hint="غيّره فقط إذا كنت تستضيف خادم httpSMS بنفسك."
          />
        )}

        <div className="border-t border-line pt-4">
          <Switch
            id="sms-enabled"
            checked={!!form.enabled}
            onChange={(v) => set({ enabled: v })}
            label="تفعيل الإرسال التلقائي"
            description="عند التفعيل، يرسل زر «تنبيه العملاء» الرسائل مباشرة دون فتح تطبيق الرسائل."
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          <Button
            variant="secondary"
            size="sm"
            icon={Send}
            onClick={handleTest}
            disabled={testing || !form.apiKey || !isValidDzMobile(form.fromNumber || '')}
          >
            {testing ? 'جاري الاختبار...' : 'إرسال رسالة اختبار'}
          </Button>
          <Button size="sm" icon={Save} onClick={handleSave} disabled={saving || !phoneOk}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2.5 rounded-2xl border border-line bg-surface/60 p-4 text-[12px] leading-6 text-fg-mute">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-bright" />
        <p>
          الرسائل تُرسَل عبر <b className="text-fg-dim">هاتفك أنت</b> ومن رقمك، وتُحسب على رصيد
          هاتفك العادي. باقة httpSMS المجانية تكفي لعدد محدود من الرسائل شهرياً؛ لغير محدود يمكنك
          استضافة خادم httpSMS مجاناً وتغيير «عنوان الخادم». يبقى خيار «فتح تطبيق الرسائل» متاحاً
          دائماً كبديل.
        </p>
      </div>
    </div>
  )
}
