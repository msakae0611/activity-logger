import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase/client'

const menuItem = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 16px', background: '#1e293b', borderRadius: 8,
  marginBottom: 8, border: '1px solid #334155', cursor: 'pointer',
  color: '#f1f5f9', fontWeight: 500, fontSize: 15,
}

export function SettingsPage() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    // ログイン継続フラグをクリア
    localStorage.setItem('remember_me', 'false')
    sessionStorage.removeItem('session_active')
    // Supabase の正規ログアウトを呼ぶ（SIGNED_OUT イベント → useAuth が user=null に更新）
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[SettingsPage] signOut error:', error)
      // 万一失敗してもローカルセッションを強制クリアしてリロード
      Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
      window.location.replace('/')
    }
    // 成功時は SIGNED_OUT イベントを受けた useAuth が setUser(null) → LoginPage を表示するため、
    // ここでは何もしない（setSigningOut(false) も不要、コンポーネントはアンマウントされる）
  }

  return (
    <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh' }}>
      <h2>設定</h2>
      <div onClick={() => navigate('/settings/categories')} style={menuItem}>
        <span>📂 カテゴリ設定</span>
        <span style={{ color: '#64748b' }}>›</span>
      </div>
      <div onClick={() => navigate('/settings/export')} style={menuItem}>
        <span>📥 データエクスポート</span>
        <span style={{ color: '#64748b' }}>›</span>
      </div>
      <div
        onClick={() => { void handleSignOut() }}
        style={{ ...menuItem, marginTop: 24, color: signingOut ? '#94a3b8' : '#f87171', borderColor: '#3f1e1e', background: '#1c1010', pointerEvents: signingOut ? 'none' : 'auto' }}
      >
        <span>{signingOut ? 'ログアウト中...' : '🚪 ログアウト'}</span>
      </div>
    </div>
  )
}
