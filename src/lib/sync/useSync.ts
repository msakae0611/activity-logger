import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { flushSyncQueue } from './SyncEngine'
import { supabase } from '../supabase/client'
import type { SyncTable, SyncOperation } from '../../types'

async function supabaseSync(table: SyncTable, operation: SyncOperation, data: { id: string } & Record<string, unknown>) {
  if (operation === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', data.id)
    return { error }
  }
  if (operation === 'update') {
    const { id, ...rest } = data
    const { error } = await supabase.from(table).update(rest).eq('id', id)
    return { error }
  }
  // insert
  const { error } = await supabase.from(table).insert(data)
  return { error }
}

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const flushingRef = useRef(false)

  const pendingCount = useLiveQuery(
    () => db.syncQueue.count(),
    []
  ) ?? 0

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // flush内でセッションを直接確認することで、authedRefのタイミング問題を回避
  const flush = async () => {
    // フラグを最初にチェック＆セット（getSession前に排他制御）
    if (flushingRef.current) {
      console.log('[useSync] flush skipped: already flushing')
      return
    }
    flushingRef.current = true
    setSyncing(true)

    try {
      console.log('[useSync] flush: checking session...')
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        ),
      ])
      const session = sessionResult.data.session
      console.log('[useSync] flush: session =', session ? 'ok' : 'null')
      if (!session) {
        console.log('[useSync] flush skipped: no session')
        return
      }

      const result = await flushSyncQueue(supabaseSync)
      console.log('[useSync] flush complete:', result)
    } catch (err) {
      console.error('[useSync] flush error:', err)
    } finally {
      setSyncing(false)
      flushingRef.current = false
      console.log('[useSync] flush: released lock')
    }
  }

  // ログイン後にキューをフラッシュ（seedLocalDb完了を待ってから実行）
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && isOnline) {
        console.log('[useSync] auth event:', event, '- scheduling flush')
        // seedLocalDb完了後にフラッシュするため少し待機
        await new Promise(r => setTimeout(r, 1000))
        await flush()
      }
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // オンライン復帰時にキューをフラッシュ
  useEffect(() => {
    if (!isOnline) return
    flush()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // キューに新しいアイテムが追加されたときにフラッシュ（オンライン時）
  useEffect(() => {
    if (pendingCount === 0) return
    if (!isOnline) return
    console.log('[useSync] pendingCount changed:', pendingCount, '- flushing')
    flush()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount, isOnline])

  return { isOnline, syncing, pendingCount }
}
