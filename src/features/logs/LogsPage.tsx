import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { deleteRecord } from './useLogsDb'
import { LogCard } from './LogCard'
import { CalendarView } from './CalendarView'
import { useAuthContext as useAuth } from '../auth/AuthContext'

type ViewMode = 'calendar' | 'list'

export function LogsPage() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>ログ</h2>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 2 }}>
          {(['calendar', 'list'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '4px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: viewMode === mode ? '#6366f1' : 'transparent',
              color: viewMode === mode ? '#fff' : '#1e293b',
            }}>
              {mode === 'calendar' ? '📅 カレンダー' : '📋 リスト'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView />
      ) : (
        <>
          <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <option value="">すべてのカテゴリ</option>
            {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
          </select>
          {records?.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>記録がありません</p>}
          {records?.map(record => (
            <LogCard key={record.id} record={record} category={categoryMap[record.category_id]} onDelete={deleteRecord} />
          ))}
        </>
      )}
    </div>
  )
}
