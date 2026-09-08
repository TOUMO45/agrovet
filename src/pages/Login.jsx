import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { AlertCircle } from 'lucide-react'
import { auth } from '../lib/firebase'
import AuthShell from '../components/AuthShell'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'

const ERRORS = {
  'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'auth/user-not-found': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'auth/wrong-password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'auth/invalid-email': 'البريد الإلكتروني غير صالح',
  'auth/user-disabled': 'تم تعطيل هذا الحساب',
  'auth/too-many-requests': 'محاولات كثيرة. حاول لاحقاً',
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError(ERRORS[err.code] || 'حدث خطأ أثناء تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="إدارة طلبات الكتاكيت"
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link to="/signup" className="font-medium text-brand-bright hover:underline">
            إنشاء حساب
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
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'جاري الدخول...' : 'دخول'}
        </Button>
      </form>
    </AuthShell>
  )
}
