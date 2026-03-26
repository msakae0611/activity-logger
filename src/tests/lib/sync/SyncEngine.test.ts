import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../../lib/db/db'
import { flushSyncQueue } from '../../../lib/sync/SyncEngine'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('flushSyncQueue', () => {
  it('空のキューでは何もしない', async () => {
    const mockSync = vi.fn().mockResolvedValue({ error: null })
    const result = await flushSyncQueue(mockSync)
    expect(result.processed).toBe(0)
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('キューの操作をSupabaseに送信しsynced=trueに更新する', async () => {
    const record = {
      id: 'r1', category_id: 'c1', user_id: 'u1',
      recorded_at: new Date().toISOString(),
      values: { x: 1 }, synced: false, updated_at: new Date().toISOString(),
    }
    await db.records.add(record)
    await db.syncQueue.add({
      id: 'q1', table: 'records', operation: 'insert',
      payload: JSON.stringify(record), created_at: new Date().toISOString(),
    })

    const mockSync = vi.fn().mockResolvedValue({ error: null })
    const result = await flushSyncQueue(mockSync)

    expect(result.processed).toBe(1)
    expect(mockSync).toHaveBeenCalledOnce()
    const updated = await db.records.get('r1')
    expect(updated?.synced).toBeTruthy()
    const queue = await db.syncQueue.toArray()
    expect(queue).toHaveLength(0)
  })
})
