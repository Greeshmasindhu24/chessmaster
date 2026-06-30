import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import VerifiedPlayRoute from './components/VerifiedPlayRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import PlayPage from './pages/PlayPage'
import PlayOnlinePage from './pages/PlayOnlinePage'
import PlayAiPage from './pages/PlayAiPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import PuzzlesPage from './pages/PuzzlesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="play/ai"
          element={
            <ProtectedRoute>
              <VerifiedPlayRoute>
                <PlayAiPage />
              </VerifiedPlayRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="play/online"
          element={
            <ProtectedRoute>
              <VerifiedPlayRoute>
                <PlayOnlinePage />
              </VerifiedPlayRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="puzzles"
          element={
            <ProtectedRoute>
              <PuzzlesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="play"
          element={
            <ProtectedRoute>
              <PlayPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}
