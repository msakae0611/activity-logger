import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../lib/db/db'
import { addCategory, updateCategory } from './useCategoryDb'
import { FieldEditor } from './FieldEditor'
import { useAuth } from '../auth/useAuth'
import { generateId } from '../../lib/utils/uuid'
import type { FieldDefinition } from '../../types'

export function CategoryEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📝')
  const [fields, setFields] = useState<FieldDefinition[]>([])

  useEffect(() => {
    if (id) {
      db.categories.get(id).then(cat => {
        if (cat) { setName(cat.name); setIcon(cat.icon); setFields(cat.fields) }
      })
    }
  }, [id])

  const addField = () => setFields(prev => [...prev, { key: generateId(), label: '', type: 'text' }])
  const updateField = (i: number, f: FieldDefinition) => setFields(prev => prev.map((x, idx) => idx === i ? f : x))
  const removeField = (i: number) => setFields(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!name.trim() || !user) return
    if (id) {
      await updateCategory(id, { name, icon, fields })
    } else {
      await addCategory({ name, icon, fields, userId: user.id })
    }
    navigate('/settings')
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>{id ? 'カテゴリ編集' : '新規カテゴリ'}</h2>
      <div style={{ marginBottom: 12 }}>
        <label>アイコン<br />
          <input value={icon} onChange={e => setIcon(e.target.value)} style={{ width: 60, padding: 8, fontSize: 20, border: '1px solid #e2e8f0', borderRadius: 4 }} />
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>カテゴリ名<br />
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4 }} />
        </label>
      </div>
      <h3>フィールド定義</h3>
      {fields.map((f, i) => (
        <FieldEditor key={i} field={f} onChange={f => updateField(i, f)} onRemove={() => removeField(i)} />
      ))}
      <button onClick={addField} style={{ width: '100%', padding: 10, marginBottom: 16, background: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: 8, cursor: 'pointer' }}>
        + フィールドを追加
      </button>
      <button onClick={handleSave} style={{ width: '100%', padding: 12, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
        保存
      </button>
    </div>
  )
}
