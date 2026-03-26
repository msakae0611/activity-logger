import { useState, useEffect } from 'react'
import type { FieldDefinition, FieldType } from '../../types'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'number', label: '数値' },
  { value: 'text', label: 'テキスト' },
  { value: 'textarea', label: '長文メモ' },
  { value: 'select', label: '単一選択' },
  { value: 'multi-select', label: '複数選択' },
  { value: 'boolean', label: 'ON/OFF' },
  { value: 'duration', label: '時間(HH:MM)' },
  { value: 'rating', label: '★評価' },
]

interface FieldEditorProps {
  field: FieldDefinition
  onChange: (field: FieldDefinition) => void
  onRemove: () => void
}

export function FieldEditor({ field, onChange, onRemove }: FieldEditorProps) {
  const [optionsText, setOptionsText] = useState((field.options ?? []).join('\n'))

  useEffect(() => {
    setOptionsText((field.options ?? []).join('\n'))
  }, [field.key])

  const handleOptionsChange = (text: string) => {
    setOptionsText(text)
    const options = text.split('\n').map(s => s.trim()).filter(Boolean)
    onChange({ ...field, options })
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          placeholder="フィールド名"
          value={field.label}
          onChange={e => onChange({ ...field, label: e.target.value })}
          style={{ flex: 1, padding: 6, border: '1px solid #e2e8f0', borderRadius: 4 }}
        />
        <select
          value={field.type}
          onChange={e => onChange({ ...field, type: e.target.value as FieldType })}
          style={{ padding: 6, border: '1px solid #e2e8f0', borderRadius: 4 }}
        >
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={onRemove} style={{ padding: '6px 10px', background: '#fee2e2', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✕</button>
      </div>
      {field.type === 'number' && (
        <input
          placeholder="単位 (例: kg, h)"
          value={field.unit ?? ''}
          onChange={e => onChange({ ...field, unit: e.target.value })}
          style={{ width: '100%', padding: 6, border: '1px solid #e2e8f0', borderRadius: 4 }}
        />
      )}
      {(field.type === 'select' || field.type === 'multi-select') && (
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>選択肢（1行に1つ入力）</div>
          <textarea
            placeholder={'良い\n普通\n悪い'}
            value={optionsText}
            onChange={e => handleOptionsChange(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 6, border: '1px solid #e2e8f0', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={field.required ?? false}
          onChange={e => onChange({ ...field, required: e.target.checked })}
        />
        必須
      </label>
    </div>
  )
}
