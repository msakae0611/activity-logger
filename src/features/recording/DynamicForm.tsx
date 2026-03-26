import type { FieldDefinition } from '../../types'

interface DynamicFormProps {
  fields: FieldDefinition[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}

export function DynamicForm({ fields, values, onChange }: DynamicFormProps) {
  const update = (key: string, value: unknown) => onChange({ ...values, [key]: value })

  return (
    <div>
      {fields.map(field => (
        <div key={field.key} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <label htmlFor={field.key} style={{ fontSize: 13, fontWeight: 600 }}>
              {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
            </label>
            {field.unit && <span style={{ color: '#64748b', fontWeight: 400, fontSize: 13 }}>({field.unit})</span>}
          </div>

          {field.type === 'number' && (
            <input id={field.key} type="number" value={(values[field.key] as number) ?? ''} onChange={e => update(field.key, e.target.valueAsNumber)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4 }} />
          )}
          {field.type === 'text' && (
            <input id={field.key} type="text" value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4 }} />
          )}
          {field.type === 'textarea' && (
            <textarea id={field.key} value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, resize: 'vertical' }} />
          )}
          {field.type === 'select' && (
            <select id={field.key} value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <option value="">選択してください</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
          {field.type === 'boolean' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input id={field.key} type="checkbox" checked={(values[field.key] as boolean) ?? false} onChange={e => update(field.key, e.target.checked)} style={{ width: 20, height: 20 }} />
              {field.label}
            </label>
          )}
          {field.type === 'rating' && (
            <div id={field.key} style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => update(field.key, n)} style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', opacity: (values[field.key] as number) >= n ? 1 : 0.3 }}>★</button>
              ))}
            </div>
          )}
          {field.type === 'duration' && (
            <input id={field.key} type="time" value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4 }} />
          )}
          {field.type === 'multi-select' && (
            <div id={field.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {field.options?.map(opt => {
                const selected = ((values[field.key] as string[]) ?? []).includes(opt)
                return (
                  <button key={opt} type="button" onClick={() => {
                    const current = (values[field.key] as string[]) ?? []
                    update(field.key, selected ? current.filter(x => x !== opt) : [...current, opt])
                  }} style={{ padding: '4px 12px', borderRadius: 16, border: `1px solid ${selected ? '#6366f1' : '#e2e8f0'}`, background: selected ? '#e0e7ff' : '#fff', cursor: 'pointer' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
