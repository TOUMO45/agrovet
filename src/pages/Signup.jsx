import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { AlertCircle } from 'lucide-react'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'

export default function Signup() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name })
      refreshUser()
      navigate('/dashboard')
    } catch (err) {
      console.error('Signup error:', err)
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'هذا البريد الإلكتروني مسجل بالفعل'
          : 'حدث خطأ أثناء إنشاء الحساب',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="إنشاء حساب"
      subtitle="إدارة طلبات الكتاكيت"
      footer={
        <>
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-medium text-brand-bright hover:underline">
            تسجيل الدخول
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] text-danger-bright">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field
          label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          hint="6 أحرف على الأقل"
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </Button>
      </form>
    </AuthShell>
  )
}
