import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'
import { db } from '../../lib/db/db'
import type { Category, Record as LogRecord, Dashboard } from '../../types'

async function seedLocalDb(userId: string) {
  // Promise.allSettled: クエリを独立して実行し、一つが失敗しても他に影響しない
  const [catsResult, recsResult, dashesResult] = await Promise.allSettled([
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('records').select('*').eq('user_id', userId),
    supabase.from('dashboards').select('*').eq('user_id', userId),
  ])

  // カテゴリ: フル同期（Supabaseにないローカルエントリを削除 + upsert）
  if (catsResult.status === 'fulfilled' && !catsResult.value.error) {
    const remoteCats = (catsResult.value.data ?? []) as Category[]
    const remoteIds = new Set(remoteCats.map(c => c.id))
    const localCats = await db.categories.where('user_id').equals(userId).toArray()
    const toDelete = localCats.filter(c => !remoteIds.has(c.id)).map(c => c.id)
    await db.transaction('rw', db.categories, async () => {
      if (toDelete.length) await db.categories.bulkDelete(toDelete)
      if (remoteCats.length) await db.categories.bulkPut(remoteCats)
    })
  }

  // レコード: upsertのみ（未同期のオフラインレコードを保持するため削除しない）
  if (recsResult.status === 'fulfilled' && !recsResult.value.error && recsResult.value.data?.length) {
    const remoteRecs = recsResult.value.data as LogRecord[]
    await db.records.bulkPut(remoteRecs.map(r => ({ ...r, synced: true })))
  }

  // ダッシュボード: フル同期
  if (dashesResult.status === 'fulfilled' && !dashesResult.value.error) {
    const remoteDashes = (dashesResult.value.data ?? []) as Dashboard[]
    const remoteIds = new Set(remoteDashes.map(d => d.id))
    const localDashes = await db.dashboards.where('user_id').equals(userId).toArray()
    const toDelete = localDashes.filter(d => !remoteIds.has(d.id)).map(d => d.id)
    await db.transaction('rw', db.dashboards, async () => {
      if (toDelete.length) await db.dashboards.bulkDelete(toDelete)
      if (remoteDashes.length) await db.dashboards.bulkPut(remoteDashes)
    })
  }
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
