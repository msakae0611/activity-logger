import { db } from '../db/db'
import type { SyncTable } from '../../types'

type UpsertFn = (table: SyncTable, data: object) => Promise<{ error: unknown }>

export async function flushSyncQueue(upsertFn: UpsertFn): Promise<{ processed: number; errors: number }> {
  const queue = await db.syncQueue.orderBy('created_at').toArray()
  if (queue.length === 0) return { processed: 0, errors: 0 }

  let processed = 0
  let errors = 0

  for (const item of queue) {
    const payload = JSON.parse(item.payload)
    const { error } = await upsertFn(item.table, payload)

    if (error) {
      errors++
      continue
    }

    // sync_queueから削除
    await db.syncQueue.delete(item.id)

    // 対応テーブルのsynced フラグを更新
    if (item.table === 'records') {
      await db.records.update(payload.id, { synced: true })
    } else if (item.table === 'categories') {
      await db.categories.update(payload.id, { updated_at: payload.updated_at })
    }

    processed++
  }

  return { processed, errors }
}
