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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [addingNew, setAddingNew] = useState(false)
  const [editingAll, setEditingAll] = useState(false)
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newValues, setNewValues] = useState<Record<string, unknown>>({})
  const [newFieldKey, setNewFieldKey] = useState<string | null>(null)

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
    setExpandedId(null)
    setEditingId(null)
    setAddingNew(false)
    setEditingAll(false)
  }

  const startEdit = (record: LogRecord) => {
    setEditingId(record.id)
    setEditValues({ ...record.values })
    setAddingNew(false)
  }

  const handleUpdate = async (record: LogRecord) => {
    await updateRecord({ ...record, values: editValues })
    setEditingId(null)
    setExpandedId(null)
  }

  const handleAddNew = async () => {
    if (!user || !newCategoryId || !selectedDate) return
    const dt = toLocalDateTimeString(new Date(`${selectedDate}T12:00:00`))
    await saveRecord({ categoryId: newCategoryId, userId: user.id, values: newValues, recordedAt: new Date(dt).toISOString() })
    setAddingNew(false)
    setNewValues({})
    setNewFieldKey(null)
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
          <div style={{ display: 'flex', gap: 8 }}>
            {(selectedRecords?.length ?? 0) > 0 && (
              <button
                onClick={() => { setEditingAll(e => !e); setAddingNew(false); setExpandedId(null) }}
                style={{ padding: '4px 12px', background: editingAll ? '#6366f1' : '#e0e7ff', color: editingAll ? '#fff' : '#4f46e5', border: 'none', borderRadius: 16, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >✏️ 編集</button>
            )}
            <button
              onClick={() => { setAddingNew(a => !a); setEditingAll(false); setEditingId(null); setNewValues({}); setNewCategoryId(''); setNewFieldKey(null) }}
              style={{ padding: '4px 12px', background: addingNew ? '#6366f1' : '#10b981', color: '#fff', border: 'none', borderRadius: 16, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >＋ 追加</button>
          </div>
        </div>

        {(selectedRecords?.length === 0) && !addingNew && (
          <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>この日の記録はありません</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {selectedRecords?.map(record => {
            const cat = categoryMap[record.category_id]
            const isExpanded = expandedId === record.id
            return (
              <button
                key={record.id}
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
                style={{
                  padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap', fontWeight: 700, fontSize: 12,
                  background: isExpanded ? (cat?.color ?? '#6366f1') : '#f1f5f9',
                  color: isExpanded ? '#fff' : '#334155',
                }}
              >
                {cat?.icon} {cat?.name}
              </button>
            )
          })}
        </div>

        {selectedRecords?.map(record => {
          const cat = categoryMap[record.category_id]
          if (!editingAll && expandedId !== record.id) return null
          return (
            <div key={record.id} style={{ marginBottom: 12 }}>
              {editingId === record.id ? (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${cat?.color ?? '#6366f1'}` }}>
                  <DynamicForm fields={cat?.fields ?? []} values={editValues} onChange={setEditValues} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleUpdate(record)} style={{ flex: 1, padding: '8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>保存</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {Object.entries(record.values).map(([k, v]) => {
                      const field = cat?.fields.find(f => f.key === k)
                      const pillStyle = { padding: '4px 10px', borderRadius: 20, border: 'none', background: '#f1f5f9', color: '#334155', fontSize: 12, whiteSpace: 'nowrap' as const, cursor: 'default' as const }
                      if (Array.isArray(v)) {
                        return v.map((item, i) => (
                          <button key={`${k}-${i}`} style={pillStyle}>
                            {String(item)}
                          </button>
                        ))
                      }
                      return (
                        <button key={k} style={pillStyle}>
                          {String(v)}{field?.unit ? ` ${field.unit}` : ''}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(record)} style={{ background: '#e0e7ff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#4f46e5' }}>編集</button>
                    <button onClick={() => deleteRecord(record.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>削除</button>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {addingNew && (() => {
          const recordByCategory = Object.fromEntries((selectedRecords ?? []).map(r => [r.category_id, r]))
          const availableCategories = (categories ?? []).map(cat => {
            const existingRec = recordByCategory[cat.id]
            const recordedKeys = existingRec ? new Set(Object.keys(existingRec.values)) : new Set<string>()
            const unrecordedFields = cat.fields.filter(f => !recordedKeys.has(f.key))
            return { ...cat, unrecordedFields }
          }).filter(cat => cat.unrecordedFields.length > 0)
          return (
          <div style={{ marginTop: 8 }}>
            {availableCategories.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>追加できるカテゴリはありません</p>
            ) : (
            <>
            {/* カテゴリ選択ボタン */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {availableCategories.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setNewCategoryId(c.id); setNewValues({}); setNewFieldKey(null) }}
                  style={{
                    padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap', fontWeight: 700, fontSize: 14,
                    background: newCategoryId === c.id ? '#6366f1' : '#f1f5f9',
                    color: newCategoryId === c.id ? '#fff' : '#334155',
                  }}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>

            {/* フィールド選択ボタン */}
            {newCategoryId && categoryMap[newCategoryId] && (() => {
              const selectedCatWithUnrecorded = availableCategories.find(c => c.id === newCategoryId)
              const fieldsToShow = selectedCatWithUnrecorded?.unrecordedFields ?? categoryMap[newCategoryId].fields
              return (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {fieldsToShow.map(field => {
                    const isFilled = newValues[field.key] !== undefined && newValues[field.key] !== ''
                    const isSelected = newFieldKey === field.key
                    return (
                      <button
                        key={field.key}
                        onClick={() => setNewFieldKey(isSelected ? null : field.key)}
                        style={{
                          padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                          whiteSpace: 'nowrap', fontWeight: 600, fontSize: 14,
                          background: isSelected ? '#ec4899' : isFilled ? '#6366f1' : '#f1f5f9',
                          color: isSelected || isFilled ? '#fff' : '#334155',
                        }}
                      >
                        {field.label}
                      </button>
                    )
                  })}
                </div>

                {/* 選択中フィールドの入力 */}
                {newFieldKey && (
                  <div style={{ marginBottom: 12 }}>
                    <DynamicForm
                      fields={categoryMap[newCategoryId].fields.filter(f => f.key === newFieldKey)}
                      values={newValues}
                      onChange={setNewValues}
                    />
                  </div>
                )}
              </>
            )
            })()}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={handleAddNew} style={{ flex: 1, padding: '8px', background: '#ec4899', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>💾 記録する</button>
              <button onClick={() => { setAddingNew(false); setNewFieldKey(null) }} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
            </div>
            </>
            )}
          </div>
          )
        })()}
      </div>
    </div>
  )
}
