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

  const handleSignOut = () => {
    localStorage.setItem('remember_me', 'false')
    sessionStorage.removeItem('session_active')
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key)
    })
    window.location.reload()
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>設定</h2>
      <div onClick={() => navigate('/settings/categories')} style={menuItem}>
        <span>📂 カテゴリ設定</span>
        <span style={{ color: '#64748b' }}>›</span>
      </div>
      <div onClick={handleSignOut} style={{ ...menuItem, marginTop: 24, color: '#f87171', borderColor: '#3f1e1e', background: '#1c1010' }}>
        <span>🚪 ログアウト</span>
      </div>
    </div>
  )
}
