import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, refreshToken } = useSelector((s: RootState) => s.auth)
  if (!isAuthenticated || (!accessToken && !refreshToken)) {
    return <Navigate to="/login?session=expired" replace />
  }
  return <>{children}</>
}
