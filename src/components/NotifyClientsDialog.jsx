import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageSquare,
  MessageCircle,
  Copy,
  Send,
  Share2,
  AlertTriangle,
  Check,
  Zap,
  X,
  Loader2,
  ChevronLeft,
  SkipForward,
} from 'lucide-react'
import Modal from './ui/Modal'
import Field from './ui/Field'
import Button from './ui/Button'
import Switch from './ui/Switch'
import SmsGatewaySetup from './SmsGatewaySetup'
import { useToast } from './ui/Toast'
import { useSmsGateway } from '../hooks/useSmsGateway'
import { useSmsBackend } from '../hooks/useSmsBackend'
import { isGatewayReady, sendBulk } from '../services/smsGateway'
import { sendBulkViaBackend } from '../services/smsBackend'
import { isValidDzMobile, toLocal } from '../utils/phone'
import { formatDZD, formatDZDPlain } from '../utils/format'
import {
  DEFAULT_SMS_TEMPLATE,
  PERSONALIZED_SMS_TEMPLATE,
  buildSmsUri,
  buildWhatsAppUri,
  fillSmsTemplate,
  readableDate,
  readableTime,
} from '../utils/sms'

function smsSegments(text) {
  const chars = [...text]
  const len = chars.length
  if (!len) return 0
  const unicode = chars.some((c) => c.charCodeAt(0) > 127) // Arabic -> UCS-2
  const single = unicode ? 70 : 160
  const multi = unicode ? 67 : 153
  return len <= single ? 1 : Math.ceil(len / multi)
}

export default function NotifyClientsDialog({ isOpen, onClose, orders = [] }) {
  const toast = useToast()
  const { config } = useSmsGateway()
  const backend = useSmsBackend()
  const gatewayReady = isGatewayReady(config)
  // One tap sends everything: either the site's own backend, or the owner's httpSMS.
  const autoReady = backend.configured || gatewayReady

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [personalized, setPersonalized] = useState(false)
  const [template, setTemplate] = useState(DEFAULT_SMS_TEMPLATE)
  const [phase, setPhase] = useState('idle') // idle | stepper | sending | done
  const [channel, setChannel] = useState('sms') // stepper target: sms | whatsapp
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState([])
  const [stepIndex, setStepIndex] = useState(0)
  const [showSetup, setShowSetup] = useState(false)
  const touchedTemplate = useRef(false)

  useEffect(() => {
    if (touchedTemplate.current) return
    setTemplate(personalized ? PERSONALIZED_SMS_TEMPLATE : DEFAULT_SMS_TEMPLATE)
  }, [personalized])

  useEffect(() => {
    if (isOpen) {
      setPhase('idle')
      setChannel('sms')
      setResults([])
      setProgress({ done: 0, total: 0 })
      setStepIndex(0)
      setShowSetup(false)
    }
  }, [isOpen])

  const recipients = useMemo(() => {
    const seen = new Set()
    return orders.map((o) => {
      const local = toLocal(o.phoneNumber)
      const valid = isValidDzMobile(o.phoneNumber)
      const dup = valid && seen.has(local)
      if (valid) seen.add(local)
      return {
        id: o.id,
        name: o.customerName || '—',
        quantity: o.quantity,
        totalPrice: o.totalPrice,
        raw: o.phoneNumber,
        local,
        valid,
        dup,
      }
    })
  }, [orders])

  const sendable = recipients.filter((r) => r.valid && !r.dup)
  const skipped = recipients.length - sendable.length
  const vars = { date: readableDate(date), time: readableTime(time) }

  const messageFor = (r) =>
    fillSmsTemplate(
      template,
      personalized
        ? { ...vars, name: r.name, quantity: r.quantity, total: formatDZDPlain(r.totalPrice) }
        : vars,
    )

  const sharedMessage = fillSmsTemplate(
    template,
    personalized ? { ...vars, name: '(الاسم)', quantity: '(الكمية)', total: '(الإجمالي)' } : vars,
  )
  const previewMessage = personalized && sendable[0] ? messageFor(sendable[0]) : sharedMessage
  const ready = sendable.length > 0 && date && time
  const segments = smsSegments(previewMessage)

  const openMessagesApp = () => {
    const uri = buildSmsUri(sendable.map((r) => r.raw), sharedMessage)
    if (!uri) return toast('لا يوجد رقم صالح', 'error')
    window.location.href = uri
    toast(`تم فتح تطبيق الرسائل لـ ${sendable.length} عميل`, 'success')
  }

  const startStepper = (via) => {
    setChannel(via)
    setStepIndex(0)
    setPhase('stepper')
  }

  const sendAuto = async () => {
    setPhase('sending')
    setProgress({ done: 0, total: sendable.length })
    setResults([])
    const items = sendable.map((r) => ({ id: r.id, name: r.name, to: r.raw, content: messageFor(r) }))
    const onTick = ({ done, total, item, result }) => {
      setProgress({ done, total })
      setResults((prev) => [...prev, { name: item.name, ...result }])
    }
    const { sent, failed } = backend.configured
      ? await sendBulkViaBackend(items, onTick)
      : await sendBulk(config, items, onTick)
    setPhase('done')
    toast(
      failed ? `أُرسلت ${sent} · فشلت ${failed}` : `تم إرسال ${sent} رسالة بنجاح ✅`,
      failed ? 'error' : 'success',
    )
  }

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${label} نُسخ`, 'success')
    } catch {
      toast('تعذّر النسخ', 'error')
    }
  }

  const share = async () => {
    try {
      await navigator.share({ text: sharedMessage })
    } catch {
      /* cancelled */
    }
  }

  // ---- render helpers -------------------------------------------------------
  const renderProgress = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {phase === 'sending' ? (
          <Loader2 className="h-5 w-5 animate-spin text-brand-bright" />
        ) : (
          <Check className="h-5 w-5 text-brand-bright" />
        )}
        <p className="tnum text-sm font-medium text-fg">
          {phase === 'sending'
            ? `جاري الإرسال... ${progress.done} / ${progress.total}`
            : results.length
              ? `اكتمل الإرسال ${progress.done} / ${progress.total}`
              : 'تم'}
        </p>
      </div>
      {(phase === 'sending' || results.length > 0) && (
        <div className="h-2 overflow-hidden rounded-full bg-night-raised">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      )}
      <div className="scroll-thin max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line bg-night-raised p-2" hidden={results.length === 0}>
        {results.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-2 py-1.5 text-[13px]">
            <span className="truncate text-fg">{r.name}</span>
            {r.ok ? (
              <span className="flex items-center gap-1 text-brand-bright">
                <Check className="h-3.5 w-3.5" /> أُرسلت
              </span>
            ) : (
              <span className="flex items-center gap-1 text-danger-bright">
                <X className="h-3.5 w-3.5" /> {r.error || 'فشل'}
              </span>
            )}
          </div>
        ))}
      </div>
      {phase === 'done' && (
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            إغلاق
          </Button>
          <Button size="sm" onClick={() => setPhase('idle')}>
            رسالة أخرى
          </Button>
        </div>
      )}
    </div>
  )

  const renderStepper = () => {
    const cur = sendable[stepIndex]
    const last = stepIndex >= sendable.length - 1
    const isWa = channel === 'whatsapp'
    const openCurrent = () => {
      const uri = isWa
        ? buildWhatsAppUri(cur.raw, messageFor(cur))
        : buildSmsUri([cur.raw], messageFor(cur))
      if (!uri) return toast('رقم غير صالح', 'error')
      if (isWa) window.open(uri, '_blank', 'noopener')
      else window.location.href = uri
    }
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="tnum text-sm font-medium text-fg">
            {personalized ? 'رسالة مخصّصة' : 'رسالة'} {stepIndex + 1} / {sendable.length}
          </p>
          <span className="text-[12px] text-fg-mute">
            {isWa ? 'تفتح في واتساب' : 'تُرسل من تطبيق الرسائل'}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-night-raised">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${(stepIndex / sendable.length) * 100}%` }}
          />
        </div>

        {cur ? (
          <>
            <div className="rounded-xl border border-line bg-night-raised p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-fg">{cur.name}</span>
                <span className="tnum text-[13px] text-fg-dim" dir="ltr">
                  {cur.local}
                </span>
              </div>
              <p className="whitespace-pre-wrap border-t border-line pt-2 text-[13px] leading-7 text-fg-dim">
                {messageFor(cur)}
              </p>
            </div>

            <Button className="w-full" icon={isWa ? MessageCircle : Send} onClick={openCurrent}>
              {isWa ? `فتح واتساب لـ ${cur.name}` : `فتح رسالة ${cur.name}`}
            </Button>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <Button variant="ghost" size="sm" icon={SkipForward} onClick={() => (last ? setPhase('done') : setStepIndex((i) => i + 1))}>
                تخطّي
              </Button>
              {last ? (
                <Button size="sm" icon={Check} onClick={() => setPhase('done')}>
                  إنهاء
                </Button>
              ) : (
                <Button size="sm" icon={ChevronLeft} onClick={() => setStepIndex((i) => i + 1)}>
                  التالي
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setPhase('done')}>
              إنهاء
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderForm = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field as="input" type="date" label="يوم الاستلام" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field as="input" type="time" label="الساعة" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <Switch
        id="notify-personalized"
        checked={personalized}
        onChange={setPersonalized}
        label="رسالة مخصّصة لكل عميل"
        description="تضيف اسم العميل وكميته والمبلغ الإجمالي إلى كل رسالة."
      />

      <Field
        as="textarea"
        rows={personalized ? 7 : 5}
        label={personalized ? 'قالب الرسالة' : 'نص الرسالة'}
        hint={`المتغيّرات: {التاريخ} {الوقت}${personalized ? ' {الاسم} {الكمية} {الإجمالي}' : ''} — تُستبدل تلقائياً.`}
        value={template}
        onChange={(e) => {
          touchedTemplate.current = true
          setTemplate(e.target.value)
        }}
      />

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-fg-dim">
          معاينة{personalized && sendable[0] ? ` — ${sendable[0].name}` : ''}
        </p>
        <div className="rounded-2xl rounded-tr-sm border border-line bg-night-raised p-3.5">
          <p className="whitespace-pre-wrap text-[13px] leading-7 text-fg">{previewMessage}</p>
        </div>
        <p className="tnum mt-1.5 text-[12px] text-fg-mute">
          {[...previewMessage].length} حرف · ≈ {segments} رسالة SMS
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span className="font-medium text-fg-dim">المستلمون</span>
          <span className="text-fg-mute">
            يصل إلى <span className="font-semibold text-brand-bright">{sendable.length}</span>
            {skipped > 0 && <> · تخطّي {skipped}</>}
          </span>
        </div>
        <div className="scroll-thin max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line bg-night-raised p-2">
          {recipients.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px]">
              <div className="min-w-0">
                <span className="block truncate text-fg">{r.name}</span>
                {personalized && r.valid && !r.dup && (
                  <span className="tnum block text-[11px] text-fg-mute">
                    {r.quantity} كتكوت · {formatDZD(r.totalPrice)}
                  </span>
                )}
              </div>
              {r.valid && !r.dup ? (
                <span className="tnum flex shrink-0 items-center gap-1 text-fg-dim" dir="ltr">
                  <Check className="h-3.5 w-3.5 text-brand-bright" />
                  {r.local}
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-warn">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {r.dup ? 'مكرر' : 'رقم غير صالح'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {autoReady ? (
        <p className="rounded-xl bg-brand/10 p-3 text-[12px] leading-6 text-brand-bright">
          <Zap className="me-1 inline h-3.5 w-3.5" />
          {backend.configured
            ? 'الإرسال التلقائي جاهز عبر خادم الموقع — لا يلزم أي إعداد. زرّ واحد يرسل لكل عميل رسالته.'
            : personalized
              ? 'الإرسال التلقائي مُفعّل — كل عميل يستلم رسالة بتفاصيل طلبه، دفعة واحدة.'
              : 'الإرسال التلقائي مُفعّل — سترسل الرسائل مباشرة من رقمك.'}
        </p>
      ) : personalized || showSetup ? (
        <div className="space-y-2.5">
          <p className="rounded-xl bg-surface-hi/60 p-3 text-[12px] leading-6 text-fg-mute">
            <MessageCircle className="me-1 inline h-3.5 w-3.5 text-brand-bright" />
            الأسرع بلا أي إعداد: <b className="text-fg-dim">واتساب</b> — يفتح لكل عميل رسالته جاهزة
            وتضغط إرسال. أو فعّل الإرسال التلقائي مرة واحدة:
          </p>
          <SmsGatewaySetup onReady={() => setShowSetup(false)} onNavigate={onClose} />
        </div>
      ) : (
        <p className="rounded-xl bg-surface-hi/60 p-3 text-[12px] leading-6 text-fg-mute">
          بلا إعداد: زرّ <b className="text-fg-dim">واتساب</b> يفتح الرسالة لكل عميل، أو
          «فتح الرسائل» يفتح تطبيق SMS بكل الأرقام دفعة واحدة.{' '}
          <button
            type="button"
            onClick={() => setShowSetup(true)}
            className="font-medium text-brand-bright hover:underline"
          >
            فعّل الإرسال التلقائي
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" size="sm" icon={Copy} onClick={() => copy(sharedMessage, 'النص')}>
          نسخ النص
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={Copy}
          onClick={() => copy(sendable.map((r) => r.local).join('، '), 'الأرقام')}
        >
          نسخ الأرقام
        </Button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button variant="secondary" size="sm" icon={Share2} onClick={share}>
            مشاركة
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          icon={MessageCircle}
          onClick={() => startStepper('whatsapp')}
          disabled={!ready}
        >
          واتساب ({sendable.length})
        </Button>

        {autoReady ? (
          <>
            {!personalized && (
              <Button variant="secondary" size="sm" icon={Send} onClick={openMessagesApp} disabled={!ready}>
                فتح الرسائل ({sendable.length})
              </Button>
            )}
            <Button size="sm" icon={Zap} onClick={sendAuto} disabled={!ready}>
              {personalized ? `إرسال إلى الكل (${sendable.length})` : `إرسال تلقائياً (${sendable.length})`}
            </Button>
          </>
        ) : personalized ? (
          <Button
            variant="secondary"
            size="sm"
            icon={Send}
            onClick={() => startStepper('sms')}
            disabled={!ready}
          >
            رسائل SMS، واحدة تلو الأخرى ({sendable.length})
          </Button>
        ) : (
          <Button size="sm" icon={Send} onClick={openMessagesApp} disabled={!ready}>
            فتح الرسائل ({sendable.length})
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تنبيه العملاء برسالة"
      subtitle={`${orders.length} عميل محدّد`}
      icon={MessageSquare}
      size="lg"
    >
      {phase === 'sending' || phase === 'done' ? renderProgress() : phase === 'stepper' ? renderStepper() : renderForm()}
    </Modal>
  )
}
