import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../../lib/db/db'
import { getRecords, deleteRecord } from '../../../features/logs/useLogsDb'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await db.records.bulkAdd([
    { id: 'r1', category_id: 'cat-1', user_id: 'user-1', recorded_at: '2026-03-25T09:00:00Z', values: {}, synced: false, updated_at: '2026-03-25T09:00:00Z' },
    { id: 'r2', category_id: 'cat-2', user_id: 'user-1', recorded_at: '2026-03-24T09:00:00Z', values: {}, synced: true, updated_at: '2026-03-24T09:00:00Z' },
  ])
})

describe('useLogsDb', () => {
  it('ユーザーの全レコードを日付降順で返す', async () => {
    const records = await getRecords({ userId: 'user-1' })
    expect(records).toHaveLength(2)
    expect(records[0].id).toBe('r1') // 新しい方が先
  })

  it('カテゴリでフィルタリングできる', async () => {
    const records = await getRecords({ userId: 'user-1', categoryId: 'cat-1' })
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('r1')
  })

  it('レコードを削除できる', async () => {
    await deleteRecord('r1')
    const all = await db.records.toArray()
    expect(all).toHaveLength(1)
  })
})
