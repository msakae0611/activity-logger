import { db } from '../../lib/db/db'
import { generateId } from '../../lib/utils/uuid'
import { toISOString } from '../../lib/utils/dates'
import type { Record as LogRecord, SyncQueueItem } from '../../types'

interface GetRecordsOptions {
  userId: string
  categoryId?: string
  from?: string
  to?: string
}

export async function getRecords(opts: GetRecordsOptions): Promise<LogRecord[]> {
  const all = await db.records.where('user_id').equals(opts.userId).toArray()

  return all
    .filter(r => !opts.categoryId || r.category_id === opts.categoryId)
    .filter(r => !opts.from || r.recorded_at >= opts.from)
    .filter(r => !opts.to || r.recorded_at <= opts.to)
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
}

export async function deleteRecord(id: string): Promise<void> {
  await db.transaction('rw', db.records, db.syncQueue, async () => {
    await db.records.delete(id)
    await db.syncQueue.add({
      id: generateId(),
      table: 'records',
      operation: 'delete',
      payload: JSON.stringify({ id }),
      created_at: toISOString(),
    } as SyncQueueItem)
  })
}
