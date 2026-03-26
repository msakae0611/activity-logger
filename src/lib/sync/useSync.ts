import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { flushSyncQueue } from './SyncEngine'
import { supabase } from '../supabase/client'
import type { SyncTable } from '../../types'

async function supabaseUpsert(table: SyncTable, data: object) {
  const { error } = await supabase.from(table).upsert(data)
  return { error }
}

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)

  const pendingCount = useLiveQuery(
    () => db.syncQueue.count(),
    []
  ) ?? 0

  // オンライン状態の監視
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

  // オンライン復帰時にフラッシュ
  useEffect(() => {
    if (!isOnline) return
    const flush = async () => {
      setSyncing(true)
      await flushSyncQueue(supabaseUpsert)
      setSyncing(false)
    }
    flush()
  }, [isOnline])

  return { isOnline, syncing, pendingCount }
}
