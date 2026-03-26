import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../../lib/db/db'
import {
  addCategory, updateCategory, deleteCategory, getCategories
} from '../../../features/categories/useCategoryDb'

const mockUserId = 'user-1'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('useCategoryDb', () => {
  it('カテゴリを追加できる', async () => {
    const cat = await addCategory({ name: '業務日報', icon: '📝', fields: [], userId: mockUserId })
    expect(cat.name).toBe('業務日報')
    expect(cat.id).toBeTruthy()
  })

  it('カテゴリを更新できる', async () => {
    const cat = await addCategory({ name: '旧名', icon: '📝', fields: [], userId: mockUserId })
    await updateCategory(cat.id, { name: '新名' })
    const updated = await db.categories.get(cat.id)
    expect(updated?.name).toBe('新名')
  })

  it('カテゴリを削除できる', async () => {
    const cat = await addCategory({ name: 'テスト', icon: '📝', fields: [], userId: mockUserId })
    await deleteCategory(cat.id)
    const result = await db.categories.get(cat.id)
    expect(result).toBeUndefined()
  })

  it('ユーザーのカテゴリ一覧を取得できる', async () => {
    await addCategory({ name: 'A', icon: '📝', fields: [], userId: mockUserId })
    await addCategory({ name: 'B', icon: '💪', fields: [], userId: mockUserId })
    const cats = await getCategories(mockUserId)
    expect(cats).toHaveLength(2)
  })
})
