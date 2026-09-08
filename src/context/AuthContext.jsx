import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'

const AuthContext = createContext({ user: null, loading: true, refreshUser: () => {} })

/**
 * Wraps a raw Firebase user so the rest of the app can read `user.name`
 * (the old code expected a `.name` field that Firebase never provides — it
 * uses `displayName`). This keeps one canonical shape everywhere.
 */
function shapeUser(fbUser) {
  if (!fbUser) return null
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    name: fbUser.displayName || '',
    displayName: fbUser.displayName || '',
    _raw: fbUser,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(shapeUser(fbUser))
      setLoading(false)
    })
    return unsub
  }, [])

  // Firebase does not re-emit onAuthStateChanged after updateProfile(), so the
  // Profile page calls this to push the new displayName into context.
  const refreshUser = () => setUser(shapeUser(auth.currentUser))

  const value = useMemo(() => ({ user, loading, refreshUser }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
