import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import PlayPage from './pages/PlayPage'
import PlayOnlinePage from './pages/PlayOnlinePage'
import PlayAiPage from './pages/PlayAiPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="play/ai"
          element={
            <ProtectedRoute>
              <PlayAiPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="play/online"
          element={
            <ProtectedRoute>
              <PlayOnlinePage />
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
