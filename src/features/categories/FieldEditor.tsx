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
  { value: 'item-list', label: 'アイテムリスト' },
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
      {field.type === 'item-list' && (
        <div>
          {/* 項目リスト */}
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>項目リスト（1行に1つ入力）</div>
          <textarea
            placeholder={'レッグプレス\nチェストプレス\nラットプルダウン'}
            value={(field.options ?? []).join('\n')}
            onChange={e => {
              const options = e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
              onChange({ ...field, options })
            }}
            rows={4}
            style={{ width: '100%', padding: 6, border: '1px solid #e2e8f0', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
          />

          {/* サブフィールド */}
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>サブフィールド（数値入力欄）</div>
          {(field.subFields ?? []).map((sf, idx) => (
            <div key={sf.key} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input
                placeholder={`サブフィールド名 (例: レベル)`}
                value={sf.label}
                onChange={e => {
                  const next = (field.subFields ?? []).map((x, i) => i === idx ? { ...x, label: e.target.value } : x)
                  onChange({ ...field, subFields: next })
                }}
                style={{ flex: 1, padding: 6, border: '1px solid #e2e8f0', borderRadius: 4 }}
              />
              <button
                type="button"
                onClick={() => {
                  const next = (field.subFields ?? []).filter((_, i) => i !== idx)
                  onChange({ ...field, subFields: next })
                }}
                style={{ padding: '6px 10px', background: '#fee2e2', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const next = [...(field.subFields ?? []), { key: `sf_${Date.now()}`, label: '' }]
              onChange({ ...field, subFields: next })
            }}
            style={{ width: '100%', padding: 6, marginBottom: 8, background: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: 6, cursor: 'pointer', color: '#334155', fontSize: 13 }}
          >+ サブフィールドを追加</button>

          {/* 合計自動計算 */}
          {(field.subFields ?? []).length >= 2 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={field.computedTotal ?? false}
                onChange={e => onChange({ ...field, computedTotal: e.target.checked })}
              />
              合計を自動計算（{field.subFields![0].label || 'サブフィールド1'} × {field.subFields![1].label || 'サブフィールド2'}）
            </label>
          )}
        </div>
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
