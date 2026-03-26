import { db } from '../../lib/db/db'
import { generateId } from '../../lib/utils/uuid'
import { toISOString } from '../../lib/utils/dates'
import type { Record as LogRecord, SyncQueueItem } from '../../types'

interface SaveRecordInput {
  categoryId: string
  userId: string
  values: Record<string, unknown>
  recordedAt?: string
}

export async function saveRecord(input: SaveRecordInput): Promise<LogRecord> {
  const record: LogRecord = {
    id: generateId(),
    category_id: input.categoryId,
    user_id: input.userId,
    recorded_at: input.recordedAt ?? toISOString(),
    values: input.values,
    synced: false,
    updated_at: toISOString(),
  }

  const queueItem: SyncQueueItem = {
    id: generateId(),
    table: 'records',
    operation: 'insert',
    payload: JSON.stringify(record),
    created_at: toISOString(),
  }

  await db.transaction('rw', db.records, db.syncQueue, async () => {
    await db.records.add(record)
    await db.syncQueue.add(queueItem)
  })

  return record
}
