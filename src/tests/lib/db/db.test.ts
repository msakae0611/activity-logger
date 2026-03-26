import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../../lib/db/db'

describe('AppDatabase', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('カテゴリを保存・取得できる', async () => {
    const category = {
      id: 'cat-1',
      user_id: 'user-1',
      name: '業務日報',
      icon: '📝',
      fields: [],
      sort_order: 0,
      updated_at: new Date().toISOString(),
    }
    await db.categories.add(category)
    const result = await db.categories.get('cat-1')
    expect(result?.name).toBe('業務日報')
  })

  it('recordsにsynced=falseで保存できる', async () => {
    const record = {
      id: 'rec-1',
      category_id: 'cat-1',
      user_id: 'user-1',
      recorded_at: new Date().toISOString(),
      values: { work_hours: 8 },
      synced: false,
      updated_at: new Date().toISOString(),
    }
    await db.records.add(record)
    const unsynced = await db.records.where('synced').equals(0).toArray()
    expect(unsynced).toHaveLength(1)
  })
})
