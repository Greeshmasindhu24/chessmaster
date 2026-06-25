import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
