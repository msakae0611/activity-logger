import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { DynamicForm } from './DynamicForm'
import { saveRecord } from './useRecording'
import { useAuth } from '../auth/useAuth'

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

  const selectedCategory = categories?.find(c => c.id === selectedId)

  useEffect(() => {
    if (!selectedId && categories?.length) {
      setSelectedId(categories[0].id)
    }
  }, [categories, selectedId])

  const handleSave = async () => {
    if (!selectedCategory || !user) return
    await saveRecord({ categoryId: selectedCategory.id, userId: user.id, values })
    localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory.id)
    setValues({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
    <div style={{ padding: 16 }}>
      <h2>記録</h2>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {categories?.map(cat => (
          <button key={cat.id} onClick={() => { setSelectedId(cat.id); setValues({}) }}
            style={{ padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: selectedId === cat.id ? '#6366f1' : '#f1f5f9',
              color: selectedId === cat.id ? '#fff' : '#334155',
              fontWeight: selectedId === cat.id ? 700 : 400,
            }}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {selectedCategory && (
        <>
          <DynamicForm fields={selectedCategory.fields} values={values} onChange={setValues} />
          <button onClick={handleSave} style={{ width: '100%', padding: 14, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16, marginTop: 8 }}>
            {saved ? '✓ 記録しました！' : '💾 記録する'}
          </button>
        </>
      )}
    </div>
  )
}
