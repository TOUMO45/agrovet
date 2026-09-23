import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { FullPageSpinner } from './components/Spinner'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import Stock from './pages/Stock'
import Lists from './pages/Lists'
import Archive from './pages/Archive'
import Settings from './pages/Settings'
import Profile from './pages/Profile'

// Dev-only visual harness for the redesign — dead-code-eliminated in production.
const Preview = import.meta.env.DEV ? lazy(() => import('./pages/_Preview.jsx')) : null

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageSpinner />

  const guard = (el) => (user ? el : <Navigate to="/login" replace />)

  return (
    <div className="min-h-screen" dir="rtl">
      {user && <Navbar />}
      <Routes>
        {Preview && (
          <>
            <Route
              path="/preview"
              element={
                <Suspense fallback={<FullPageSpinner />}>
                  <Preview />
                </Suspense>
              }
            />
            {/* dev-only: inspect these pages without a session */}
            <Route path="/dev/archive" element={<Archive />} />
            <Route path="/dev/settings" element={<Settings />} />
            <Route path="/dev/stock" element={<Stock />} />
          </>
        )}
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/sales" element={guard(<Sales />)} />
        <Route path="/stock" element={guard(<Stock />)} />
        <Route path="/lists" element={guard(<Lists />)} />
        <Route path="/archive" element={guard(<Archive />)} />
        <Route path="/settings" element={guard(<Settings />)} />
        <Route path="/profile" element={guard(<Profile />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <BottomNav />}
    </div>
  )
}
