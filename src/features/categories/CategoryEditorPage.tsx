import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../lib/db/db'
import { addCategory, updateCategory } from './useCategoryDb'
import { FieldEditor } from './FieldEditor'
import { useAuthContext as useAuth } from '../auth/AuthContext'
import { generateId } from '../../lib/utils/uuid'
import type { FieldDefinition } from '../../types'
import { moveFieldInArray } from '../../lib/utils/fieldOrder'

const PASTEL_COLORS = [
  '#c4b5fd', // ラベンダー
  '#fca5a5', // ピーチ
  '#6ee7b7', // ミント
  '#7dd3fc', // スカイ
  '#fde68a', // バター
]

const EMOJI_LIST = [
  '🏃','💪','🧘','🚴','🏊','⚽','🏋️','🤸','🚶','🧗',
  '🍎','🥗','🍱','☕','🥤','🍜','🥩','🥦','🍳','🧃',
  '😴','💊','🩺','❤️','🧠','🦷','👁️','🩹','🏥','💉',
  '📚','💼','💻','📝','✅','📊','🎯','⏰','📅','🗓️',
  '😊','😔','😰','😡','🥰','😤','😴','🤔','😎','🥳',
  '💰','🏠','🚗','✈️','🎮','🎵','📷','🌿','🐕','👨‍👩‍👧',
]

export function CategoryEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📝')
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [color, setColor] = useState<string>(PASTEL_COLORS[0])
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
      db.categories.get(id).then(cat => {
        if (cat) {
          setName(cat.name)
          setIcon(cat.icon)
          setFields(cat.fields)
          setColor(cat.color ?? PASTEL_COLORS[0])
        }
      })
    }
  }, [id])

  const addField = () => setFields(prev => [...prev, { key: generateId(), label: '', type: 'text' }])
  const updateField = (i: number, f: FieldDefinition) => setFields(prev => prev.map((x, idx) => idx === i ? f : x))
  const removeField = (i: number) => setFields(prev => prev.filter((_, idx) => idx !== i))

  const moveField = (i: number, direction: 'up' | 'down') =>
    setFields(prev => moveFieldInArray(prev, i, direction))

  const handleSave = async () => {
    if (!name.trim() || !user) return
    if (id) {
      await updateCategory(id, { name, icon, fields, color })
    } else {
      await addCategory({ name, icon, fields, userId: user.id, color })
    }
    navigate('/settings')
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/settings')} style={{ padding: '6px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#475569' }}>
            ← 戻る
          </button>
          <h2 style={{ margin: 0 }}>{id ? 'カテゴリ編集' : '新規カテゴリ'}</h2>
        </div>
        <button onClick={handleSave} style={{ padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
          保存
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, fontSize: 13 }}>アイコン</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => setShowPicker(p => !p)}
            style={{ fontSize: 28, width: 52, height: 52, border: '2px solid #6366f1', borderRadius: 10, background: '#1e293b', cursor: 'pointer' }}
          >{icon}</button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>タップして変更</span>
        </div>
        {showPicker && (
          <div ref={pickerRef} style={{ marginTop: 8, padding: 10, background: '#1e293b', border: '1px solid #334155', borderRadius: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJI_LIST.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setIcon(e); setShowPicker(false) }}
                  style={{
                    fontSize: 22, width: 40, height: 40, border: e === icon ? '2px solid #6366f1' : '1px solid #334155',
                    borderRadius: 8, background: e === icon ? '#312e81' : '#0f172a', cursor: 'pointer',
                  }}
                >{e}</button>
              ))}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>直接入力：</span>
              <input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                style={{ width: 60, padding: 6, fontSize: 20, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#fff', textAlign: 'center' }}
              />
            </div>
          </div>
        )}
      </div>
      {/* カラー選択 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, fontSize: 13 }}>カラー</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center', justifyContent: 'center' }}>
          {PASTEL_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: color === c ? 40 : 26, height: color === c ? 40 : 26, borderRadius: '50%',
                background: c,
                border: color === c ? '3px solid #1e293b' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}
            >
              {color === c ? '✓' : ''}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>カテゴリ名<br />
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4 }} />
        </label>
      </div>
      <h3>フィールド定義</h3>
      {fields.map((f, i) => (
        <FieldEditor
          key={i}
          field={f}
          onChange={f => updateField(i, f)}
          onRemove={() => removeField(i)}
          onMoveUp={() => moveField(i, 'up')}
          onMoveDown={() => moveField(i, 'down')}
          isFirst={i === 0}
          isLast={i === fields.length - 1}
        />
      ))}
      <button onClick={addField} style={{ width: '100%', padding: 10, marginBottom: 16, background: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: 8, cursor: 'pointer', color: '#334155' }}>
        + フィールドを追加
      </button>
      <button onClick={handleSave} style={{ width: '100%', padding: 12, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
        保存
      </button>
    </div>
  )
}
