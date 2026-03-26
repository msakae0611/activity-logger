import { db } from '../../lib/db/db'
import type { Record as LogRecord } from '../../types'

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
  await db.records.delete(id)
}
