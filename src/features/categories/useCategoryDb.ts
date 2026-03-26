import { db } from '../../lib/db/db'
import { generateId } from '../../lib/utils/uuid'
import { toISOString } from '../../lib/utils/dates'
import type { Category, FieldDefinition } from '../../types'

interface AddCategoryInput {
  name: string
  icon: string
  fields: FieldDefinition[]
  userId: string
}

export async function addCategory(input: AddCategoryInput): Promise<Category> {
  const all = await db.categories.toArray()
  const maxOrder = all.length > 0 ? Math.max(...all.map(c => c.sort_order)) : -1
  const category: Category = {
    id: generateId(),
    user_id: input.userId,
    name: input.name,
    icon: input.icon,
    fields: input.fields,
    sort_order: maxOrder + 1,
    updated_at: toISOString(),
  }
  await db.categories.add(category)
  return category
}

export async function updateCategory(id: string, changes: Partial<Category>): Promise<void> {
  await db.categories.update(id, { ...changes, updated_at: toISOString() })
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id)
}

export async function getCategories(userId: string): Promise<Category[]> {
  const cats = await db.categories.where('user_id').equals(userId).toArray()
  return cats.sort((a, b) => a.sort_order - b.sort_order)
}
