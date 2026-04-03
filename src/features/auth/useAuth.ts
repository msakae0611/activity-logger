import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'
import { db } from '../../lib/db/db'

async function seedLocalDb(userId: string) {
  const [cats, recs, dashes] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('records').select('*').eq('user_id', userId),
    supabase.from('dashboards').select('*').eq('user_id', userId),
  ])
  if (cats.data?.length) await db.categories.bulkPut(cats.data)
  if (recs.data?.length) await db.records.bulkPut(recs.data.map(r => ({ ...r, synced: true })))
  if (dashes.data?.length) await db.dashboards.bulkPut(dashes.data)
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' && session) {
        // ログイン状態を保持しない設定で、かつ今のセッションが新規ログインでない場合はサインアウト
        const rememberMe = localStorage.getItem('remember_me') === 'true'
        const sessionActive = sessionStorage.getItem('session_active') === 'true'
        if (!rememberMe && !sessionActive) {
          await supabase.auth.signOut()
          return
        }
      }

      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN' && session?.user) {
        sessionStorage.setItem('session_active', 'true')
        await seedLocalDb(session.user.id).catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
