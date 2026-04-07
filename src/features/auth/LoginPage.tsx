import { useState } from 'react'
import { signInWithEmail, signUp, resetPassword } from '../../lib/supabase/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem('remember_me') !== 'false' // 未設定時はデフォルトtrue
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signInWithEmail(email, password)
      }
      localStorage.setItem('remember_me', rememberMe ? 'true' : 'false')
    } catch (err) {
      if (err instanceof Error && err.message === 'Failed to fetch') {
        setError('サーバーに接続できませんでした。ネットワーク接続を確認するか、しばらく待ってから再試行してください。')
      } else {
        setError(err instanceof Error ? err.message : 'エラーが発生しました')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: '100%', maxWidth: 400, padding: 24, boxSizing: 'border-box' }}>
      <h1>Activity Logger</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', textAlign: 'left' }}>メールアドレス
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', textAlign: 'left' }}>パスワード
            <input
              type="password"
              name="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14 }}>ログイン状態を保持する</span>
          </label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ display: 'block', margin: '0 auto', padding: '10px 32px' }}>
          {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
        </button>
      </form>
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#99c2ff' }}>
          {isSignUp ? 'ログインに切り替え' : '新規登録'}
        </button>
      </div>
      {!isSignUp && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          {resetSent ? (
            <p style={{ color: '#99c2ff', fontSize: 13 }}>リセットメールを送信しました</p>
          ) : (
            <button
              onClick={async () => {
                setError(null)
                if (!email) { setError('メールアドレスを入力してください'); return }
                try { await resetPassword(email); setResetSent(true) }
                catch (err) {
                  if (err instanceof Error && err.message === 'Failed to fetch') {
                    setError('サーバーに接続できませんでした。しばらく待ってから再試行してください。')
                  } else {
                    setError(err instanceof Error ? err.message : 'エラーが発生しました')
                  }
                }
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#99c2ff', fontSize: 13 }}
            >
              パスワードをリセット
            </button>
          )}
        </div>
      )}
    </div>
    </div>
  )
}
