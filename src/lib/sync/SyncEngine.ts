import { db } from '../db/db'
import type { SyncTable, SyncOperation } from '../../types'

type SyncFn = (table: SyncTable, operation: SyncOperation, data: object) => Promise<{ error: unknown }>

export async function flushSyncQueue(syncFn: SyncFn): Promise<{ processed: number; errors: number }> {
  const queue = await db.syncQueue.orderBy('created_at').toArray()
  if (queue.length === 0) return { processed: 0, errors: 0 }

  let processed = 0
  let errors = 0

  for (const item of queue) {
    const payload = JSON.parse(item.payload)
    const { error } = await syncFn(item.table, item.operation, payload)

    if (error) {
      errors++
      continue
    }

    await db.syncQueue.delete(item.id)

    if (item.table === 'records' && item.operation !== 'delete') {
      await db.records.update(payload.id, { synced: true })
    }

    processed++
  }

  return { processed, errors }
}
