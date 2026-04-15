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
      console.log('[useAuth] auth event:', event, session ? 'session=ok' : 'session=null')

      // --- SIGNED_OUT: UI を即時更新してからDBクリア（バックグラウンド）---
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        // DBクリアは await しない（UI更新を優先）
        void Promise.allSettled([
          db.records.clear(),
          db.categories.clear(),
          db.syncQueue.clear(),
          db.dashboards.clear(),
        ])
        return
      }

      // --- INITIAL_SESSION: remember_me チェック ---
      if (event === 'INITIAL_SESSION' && session) {
        const rememberMe = localStorage.getItem('remember_me') === 'true'
        const sessionActive = sessionStorage.getItem('session_active') === 'true'
        if (!rememberMe && !sessionActive) {
          // コールバック内から直接 signOut() を呼ぶと再入ロック問題が起きるため
          // setTimeout でイベントループの外に出してから実行する
          setUser(null)
          setLoading(false)
          setTimeout(() => { void supabase.auth.signOut({ scope: 'local' }) }, 0)
          return
        }
      }

      // --- ログイン / セッション復元 ---
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          sessionStorage.setItem('session_active', 'true')
        }
        // UI を即時更新してから DB シード（バックグラウンド）
        setUser(session.user)
        setLoading(false)
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          void seedLocalDb(session.user.id).catch(err =>
            console.error('[useAuth] seedLocalDb failed:', err)
          )
        }
        return
      }

      // セッションなし（INITIAL_SESSION で session=null など）
      setUser(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
