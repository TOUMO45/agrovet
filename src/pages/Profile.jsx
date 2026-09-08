import { useEffect, useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() })
      refreshUser()
      toast('تم تحديث الملف الشخصي', 'success')
    } catch (err) {
      console.error('Profile update error:', err)
      toast('حدث خطأ أثناء تحديث الملف الشخصي', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-28 md:pb-8">
      <h1 className="mb-5 text-lg font-bold text-fg sm:text-xl">الملف الشخصي</h1>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="البريد الإلكتروني" type="email" dir="ltr" value={user?.email || ''} disabled />
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
