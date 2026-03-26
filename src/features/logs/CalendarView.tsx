import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { MiniCalendar } from './MiniCalendar'
import { DynamicForm } from '../recording/DynamicForm'
import { saveRecord } from '../recording/useRecording'
import { updateRecord, deleteRecord } from './useLogsDb'
import { toLocalDateTimeString, formatDateTime } from '../../lib/utils/dates'
import { useAuthContext as useAuth } from '../auth/AuthContext'
import type { Record as LogRecord } from '../../types'

const DOT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export function CalendarView() {
  const { user } = useAuth()
  const today = new Date().toLocaleDateString('sv-SE')
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [addingNew, setAddingNew] = useState(false)
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newValues, setNewValues] = useState<Record<string, unknown>>({})

  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).sortBy('sort_order') : [],
    [user?.id]
  )

  const selectedRecords = useLiveQuery(async () => {
    if (!user || !selectedDate) return []
    const all = await db.records.where('user_id').equals(user.id).toArray()
    return all
      .filter(r => r.recorded_at.slice(0, 10) === selectedDate)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  }, [user?.id, selectedDate])

  const categoryMap = Object.fromEntries(
    (categories ?? []).map((c, i) => [c.id, { ...c, color: DOT_COLORS[i % DOT_COLORS.length] }])
  )

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setEditingId(null)
    setAddingNew(false)
  }

  const startEdit = (record: LogRecord) => {
    setEditingId(record.id)
    setEditValues({ ...record.values })
    setAddingNew(false)
  }

  const handleUpdate = async (record: LogRecord) => {
    await updateRecord({ ...record, values: editValues })
    setEditingId(null)
  }

  const handleAddNew = async () => {
    if (!user || !newCategoryId || !selectedDate) return
    const dt = toLocalDateTimeString(new Date(`${selectedDate}T12:00:00`))
    await saveRecord({ categoryId: newCategoryId, userId: user.id, values: newValues, recordedAt: new Date(dt).toISOString() })
    setAddingNew(false)
    setNewValues({})
  }

  return (
    <div>
      <MiniCalendar
        userId={user?.id ?? ''}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />

      {/* Day detail */}
      <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
          <button
            onClick={() => { setAddingNew(true); setEditingId(null); setNewValues({}); if (categories?.length) setNewCategoryId(categories[0].id) }}
            style={{ padding: '4px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 16, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >＋ 追加</button>
        </div>

        {(selectedRecords?.length === 0) && !addingNew && (
          <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>この日の記録はありません</p>
        )}

        {selectedRecords?.map(record => {
          const cat = categoryMap[record.category_id]
          return (
            <div key={record.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${cat?.color ?? '#6366f1'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{cat?.icon} {cat?.name} — {formatDateTime(record.recorded_at)}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {editingId !== record.id && (
                    <button onClick={() => startEdit(record)} style={{ background: '#e0e7ff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12, color: '#4f46e5' }}>編集</button>
                  )}
                  <button onClick={() => deleteRecord(record.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>削除</button>
                </div>
              </div>
              {editingId === record.id ? (
                <>
                  <DynamicForm fields={cat?.fields ?? []} values={editValues} onChange={setEditValues} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleUpdate(record)} style={{ flex: 1, padding: '8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>保存</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 2 }}>
                  {Object.entries(record.values).map(([k, v]) => {
                    const field = cat?.fields.find(f => f.key === k)
                    const val = Array.isArray(v) ? v.join(', ') : String(v)
                    return (
                      <span key={k}>
                        <span style={{ fontWeight: 700, color: '#000' }}>{field?.label ?? k}：</span>
                        <span style={{ fontWeight: 400, color: '#334155' }}>{val}{field?.unit ? ` ${field.unit}` : ''}</span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {addingNew && (
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, borderLeft: '3px solid #10b981' }}>
            <select
              value={newCategoryId}
              onChange={e => { setNewCategoryId(e.target.value); setNewValues({}) }}
              style={{ width: '100%', padding: 8, marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b' }}
            >
              {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            {newCategoryId && categoryMap[newCategoryId] && (
              <DynamicForm fields={categoryMap[newCategoryId].fields} values={newValues} onChange={setNewValues} />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={handleAddNew} style={{ flex: 1, padding: '8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>記録する</button>
              <button onClick={() => setAddingNew(false)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
