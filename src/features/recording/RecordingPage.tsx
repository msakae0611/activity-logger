import { useState, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { DynamicForm } from './DynamicForm'
import { saveRecord } from './useRecording'
import { updateRecord, deleteRecord } from '../logs/useLogsDb'
import { useAuthContext as useAuth } from '../auth/AuthContext'
import { MiniCalendar } from '../logs/MiniCalendar'

const LAST_CATEGORY_KEY = 'lastCategoryId'

export function RecordingPage() {
  const { user } = useAuth()
  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).sortBy('sort_order') : [],
    [user?.id]
  )
  const [selectedId, setSelectedId] = useState<string>(() => localStorage.getItem(LAST_CATEGORY_KEY) ?? '')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [saved, setSaved] = useState(false)
  const [recordedAt, setRecordedAt] = useState<string>(() => new Date().toLocaleDateString('sv-SE'))
  const [showExisting, setShowExisting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const selectedCategory = categories?.find(c => c.id === selectedId)
  const dateKey = recordedAt

  const existingRecord = useLiveQuery(async () => {
    if (!user || !selectedId) return null
    const all = await db.records.where('user_id').equals(user.id).toArray()
    return all.find(r => r.category_id === selectedId && r.recorded_at.slice(0, 10) === dateKey) ?? null
  }, [user?.id, selectedId, dateKey])

  useEffect(() => {
    if (!selectedId && categories?.length) {
      setSelectedId(categories[0].id)
    }
  }, [categories, selectedId])

  // Reset form when category or date changes
  useEffect(() => {
    setShowExisting(false)
    setShowForm(false)
    setSelectedFieldKey(null)
    setValues({})
  }, [selectedId, dateKey])

  const handleDateSelect = (date: string) => {
    setRecordedAt(date)
  }

  const handleSave = async () => {
    if (!selectedCategory || !user) return
    if (existingRecord) {
      await updateRecord({ ...existingRecord, values, recorded_at: new Date(recordedAt + 'T12:00:00').toISOString() })
    } else {
      await saveRecord({ categoryId: selectedCategory.id, userId: user.id, values, recordedAt: new Date(recordedAt + 'T12:00:00').toISOString() })
    }
    localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory.id)
    setValues({})
    setShowExisting(false)
    setShowForm(false)
    setSelectedFieldKey(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = async () => {
    if (!existingRecord) return
    await deleteRecord(existingRecord.id)
    setShowExisting(false)
    setValues({})
  }

  const handleExistingClick = () => {
    if (!existingRecord) return
    if (showExisting) {
      setShowExisting(false)
      setValues({})
    } else {
      setShowExisting(true)
      setValues({ ...existingRecord.values })
    }
  }

  if (!categories?.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>カテゴリがありません</p>
        <a href="/settings" style={{ color: '#6366f1' }}>設定からカテゴリを追加</a>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh' }}>
      <h2>記録</h2>

      {/* Category selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4, paddingTop: 4, paddingLeft: 4, paddingRight: 4 }}>
        {categories?.map(cat => {
          const catColor = cat.color ?? '#c4b5fd'
          const isSelected = selectedId === cat.id
          return (
            <button key={cat.id} onClick={() => { setSelectedId(cat.id); setValues({}) }}
              style={{
                padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: catColor,
                color: '#1e293b',
                fontWeight: isSelected ? 700 : 400,
                opacity: isSelected ? 1 : 0.55,
              }}>
              {cat.icon} {cat.name}
            </button>
          )
        })}
      </div>

      {/* Mini calendar */}
      {user && (
        <div style={{ marginBottom: 16 }}>
          <MiniCalendar
            userId={user.id}
            selectedDate={dateKey}
            onDateSelect={handleDateSelect}
          />
        </div>
      )}

      {selectedCategory && (
        <>
          {/* Date/time picker + existing record button */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>記録</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', border: '1px solid #334155', borderRadius: 4, background: '#1e293b', color: '#e2e8f0', fontSize: 14, whiteSpace: 'nowrap' }}>
                <span>{recordedAt}</span>
                <span onClick={() => dateInputRef.current?.showPicker()} style={{ cursor: 'pointer', fontSize: 18, lineHeight: 1, marginLeft: 8 }}>📅</span>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={recordedAt}
                  onChange={e => setRecordedAt(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                />
              </div>
              <button
                type="button"
                onClick={() => setRecordedAt(new Date().toLocaleDateString('sv-SE'))}
                style={{ padding: '8px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
              >今日</button>
              {existingRecord ? (
                <button
                  onClick={handleExistingClick}
                  style={{
                    marginLeft: 'auto', padding: '8px 12px', whiteSpace: 'nowrap',
                    background: showExisting ? '#6366f1' : '#312e81',
                    color: showExisting ? '#fff' : '#a5b4fc',
                    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  {showExisting ? '▲ 閉じる' : `✓ ${selectedCategory?.name}：${dateKey.replace(/-/g, '/')}`}
                </button>
              ) : (
                <button
                  onClick={() => setShowForm(f => !f)}
                  style={{
                    marginLeft: 'auto', padding: '8px 12px', whiteSpace: 'nowrap',
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  {showForm ? '▲ 閉じる' : '✏️ 記録する'}
                </button>
              )}
            </div>
          </div>

          {(showForm || showExisting) && (
            <>
              {/* フィールド選択ボタン */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {selectedCategory.fields.map(field => {
                  const isFilled = values[field.key] !== undefined && values[field.key] !== ''
                  const isSelected = selectedFieldKey === field.key
                  return (
                    <button
                      key={field.key}
                      onClick={() => setSelectedFieldKey(isSelected ? null : field.key)}
                      style={{
                        padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                        whiteSpace: 'nowrap', fontWeight: 600, fontSize: 14,
                        background: isSelected ? '#ec4899' : isFilled ? '#6366f1' : '#1e293b',
                        color: isSelected || isFilled ? '#fff' : '#e2e8f0',
                      }}
                    >
                      {field.label}
                    </button>
                  )
                })}
              </div>

              {/* 選択中フィールドの入力 */}
              {selectedFieldKey && (
                <div style={{ marginBottom: 12 }}>
                  <DynamicForm
                    fields={selectedCategory.fields.filter(f => f.key === selectedFieldKey)}
                    values={values}
                    onChange={setValues}
                  />
                </div>
              )}

              {showExisting && (
                <button
                  onClick={handleDelete}
                  style={{ width: '100%', padding: '10px', marginTop: 8, background: '#1e293b', color: '#f87171', border: '1px solid #3f1010', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                >
                  削除
                </button>
              )}
              <button onClick={handleSave} style={{ width: '100%', padding: 14, background: '#ec4899', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16, marginTop: 8 }}>
                {saved ? '✓ 保存しました！' : existingRecord ? '💾 上書き保存' : '💾 記録する'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
