import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!isOnline) return
    const flush = async () => {
      setSyncing(true)
      await flushSyncQueue(supabaseSync)
      setSyncing(false)
    }
    flush()
  }, [isOnline])

  return { isOnline, syncing, pendingCount }
}
