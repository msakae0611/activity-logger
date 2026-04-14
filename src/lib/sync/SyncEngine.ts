import { db } from '../db/db'
import type { SyncTable, SyncOperation } from '../../types'

type SyncFn = (table: SyncTable, operation: SyncOperation, data: { id: string } & Record<string, unknown>) => Promise<{ error: unknown }>

// Dexie専用フィールドでSupabaseに送ってはいけないキー
const LOCAL_ONLY_FIELDS: Record<string, string[]> = {
  records: ['synced'],
}

function stripLocalFields(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const keys = LOCAL_ONLY_FIELDS[table]
  if (!keys) return data
  const result = { ...data }
  for (const key of keys) delete result[key]
  return result
}

export async function flushSyncQueue(syncFn: SyncFn): Promise<{ processed: number; errors: number }> {
  console.log('[SyncEngine] flushSyncQueue start')
  const queue = await db.syncQueue.orderBy('created_at').toArray()
  console.log('[SyncEngine] queue length:', queue.length)
  if (queue.length === 0) return { processed: 0, errors: 0 }

  let processed = 0
  let errors = 0

  for (const item of queue) {
    console.log('[SyncEngine] processing item:', { table: item.table, operation: item.operation, id: item.id })
    let payload = JSON.parse(item.payload)
    payload = stripLocalFields(item.table, payload)

    console.log('[SyncEngine] calling syncFn...')
    const { error } = await syncFn(item.table, item.operation, payload)
    console.log('[SyncEngine] syncFn returned, error:', error ?? null)

    if (error) {
      const e = error as { message?: string; code?: string; details?: string; hint?: string }
      console.error('[SyncEngine] sync error:', {
        table: item.table,
        operation: item.operation,
        message: e.message,
        code: e.code,
        details: e.details,
        hint: e.hint,
      })
      errors++
      continue
    }

    await db.syncQueue.delete(item.id)

    if (item.table === 'records' && item.operation !== 'delete') {
      await db.records.update(payload.id, { synced: true })
    }

    processed++
  }

  console.log('[SyncEngine] flushSyncQueue done:', { processed, errors })
  return { processed, errors }
}
