import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { deleteRecord } from './useLogsDb'
import { LogCard } from './LogCard'
import { useAuth } from '../auth/useAuth'

export function LogsPage() {
  const { user } = useAuth()
  const [filterCategoryId, setFilterCategoryId] = useState('')

  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).sortBy('sort_order') : [],
    [user?.id]
  )

  const records = useLiveQuery(async () => {
    if (!user) return []
    const all = await db.records.where('user_id').equals(user.id).toArray()
    return all
      .filter(r => !filterCategoryId || r.category_id === filterCategoryId)
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
  }, [user?.id, filterCategoryId])

  const categoryMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]))

  return (
    <div style={{ padding: 16 }}>
      <h2>ログ一覧</h2>
      <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 6 }}>
        <option value="">すべてのカテゴリ</option>
        {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
      </select>
      {records?.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>記録がありません</p>}
      {records?.map(record => (
        <LogCard key={record.id} record={record} category={categoryMap[record.category_id]} onDelete={deleteRecord} />
      ))}
    </div>
  )
}
