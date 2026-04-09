import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './features/auth/useAuth'
import { AuthContext } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { Layout } from './components/ui/Layout'
import { SettingsPage } from './features/settings/SettingsPage'
import { CategoryListPage } from './features/categories/CategoryListPage'
import { CategoryEditorPage } from './features/categories/CategoryEditorPage'
import { RecordingPage } from './features/recording/RecordingPage'
import { LogsPage } from './features/logs/LogsPage'
import { AnalyticsPage } from './features/analytics/AnalyticsPage'
import { ExportPage } from './features/settings/ExportPage'

const queryClient = new QueryClient()

function AppRoutes() {
  const auth = useAuth()
  if (auth.loading) return <div style={{ padding: 24 }}>読み込み中...</div>
  if (!auth.user) return <LoginPage />
  return (
    <AuthContext.Provider value={auth}>
      <Layout>
        <Routes>
          <Route path="/" element={<RecordingPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/categories" element={<CategoryListPage />} />
          <Route path="/settings/categories/new" element={<CategoryEditorPage />} />
          <Route path="/settings/categories/:id" element={<CategoryEditorPage />} />
          <Route path="/settings/export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
