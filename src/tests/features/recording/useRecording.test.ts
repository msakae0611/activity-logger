import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../../lib/db/db'
import { saveRecord } from '../../../features/recording/useRecording'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('saveRecord', () => {
  it('Dexie.jsにrecordを保存しsynced=falseにする', async () => {
    await saveRecord({
      categoryId: 'cat-1',
      userId: 'user-1',
      values: { work_hours: 8 },
    })
    const records = await db.records.toArray()
    expect(records).toHaveLength(1)
    expect(records[0].synced).toBeFalsy()
  })

  it('sync_queueにinsert操作を追加する', async () => {
    await saveRecord({
      categoryId: 'cat-1',
      userId: 'user-1',
      values: { work_hours: 8 },
    })
    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0].operation).toBe('insert')
    expect(queue[0].table).toBe('records')
  })
})
