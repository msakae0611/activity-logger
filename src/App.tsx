import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './features/auth/useAuth'
import { LoginPage } from './features/auth/LoginPage'
import { Layout } from './components/ui/Layout'
import { CategoryListPage } from './features/categories/CategoryListPage'
import { CategoryEditorPage } from './features/categories/CategoryEditorPage'
import { RecordingPage } from './features/recording/RecordingPage'
import { LogsPage } from './features/logs/LogsPage'

const queryClient = new QueryClient()

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>読み込み中...</div>
  if (!user) return <LoginPage />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RecordingPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/analytics" element={<div>分析（実装予定）</div>} />
        <Route path="/settings" element={<CategoryListPage />} />
        <Route path="/settings/categories/new" element={<CategoryEditorPage />} />
        <Route path="/settings/categories/:id" element={<CategoryEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
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
