import { useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/supabase/auth'


const menuItem = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 16px', background: '#1e293b', borderRadius: 8,
  marginBottom: 8, border: '1px solid #334155', cursor: 'pointer',
  color: '#f1f5f9', fontWeight: 500, fontSize: 15,
}

export function SettingsPage() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    localStorage.removeItem('remember_me')
    sessionStorage.removeItem('session_active')
    await signOut().catch(() => {})
    // SIGNED_OUT イベントが useAuth に伝わり、user=null → LoginPage が自動表示される
  }

  return (
    <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh' }}>
      <h2>設定</h2>
      <div onClick={() => navigate('/settings/categories')} style={menuItem}>
        <span>📂 カテゴリ設定</span>
        <span style={{ color: '#64748b' }}>›</span>
      </div>
      <div onClick={() => navigate('/settings/export')} style={menuItem}>
        <span>📥 CSVエクスポート</span>
        <span style={{ color: '#64748b' }}>›</span>
      </div>
      <div onClick={handleSignOut} style={{ ...menuItem, marginTop: 24, color: '#f87171', borderColor: '#3f1e1e', background: '#1c1010' }}>
        <span>🚪 ログアウト</span>
      </div>
    </div>
  )
}
