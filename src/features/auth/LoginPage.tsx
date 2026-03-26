import { useState } from 'react'
import { signInWithEmail, signUp } from '../../lib/supabase/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1>Activity Logger</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>メールアドレス<br />
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>パスワード<br />
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required style={{ width: '100%', padding: 8 }}
            />
          </label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
        </button>
      </form>
      <button onClick={() => setIsSignUp(!isSignUp)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'blue' }}>
        {isSignUp ? 'ログインに切り替え' : '新規登録に切り替え'}
      </button>
    </div>
  )
}
