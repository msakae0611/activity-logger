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
  const { error } = await supabase.from(table).upsert(data)
  return { error }
}

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const flushingRef = useRef(false)
  const authedRef = useRef(false)

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

  const flush = async () => {
    if (flushingRef.current) return
    flushingRef.current = true
    setSyncing(true)
    const result = await flushSyncQueue(supabaseSync)
    console.log('[useSync] flush complete:', result)
    setSyncing(false)
    flushingRef.current = false
  }

  // ログイン状態の追跡 + ログイン後にキューをフラッシュ
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && isOnline) {
        authedRef.current = true
        // seedLocalDb完了後にフラッシュするため少し待機
        await new Promise(r => setTimeout(r, 800))
        await flush()
      } else if (event === 'SIGNED_OUT') {
        authedRef.current = false
      }
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // オンライン復帰時にキューをフラッシュ（認証済みの場合のみ）
  useEffect(() => {
    if (!isOnline) return
    if (!authedRef.current) return
    flush()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // キューに新しいアイテムが追加されたときにフラッシュ（オンライン＆認証済みの場合）
  useEffect(() => {
    if (pendingCount === 0) return
    if (!isOnline) return
    if (!authedRef.current) return
    flush()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount, isOnline])

  return { isOnline, syncing, pendingCount }
}
