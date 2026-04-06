import { useState, useEffect } from 'react'
import type { FieldDefinition } from '../../types'

interface DynamicFormProps {
  fields: FieldDefinition[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}

export function DynamicForm({ fields, values, onChange }: DynamicFormProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, Set<string>>>({})

  // expandedItems cleanup: clear sets when parent resets item-list entries to empty
  useEffect(() => {
    const itemListFields = fields.filter(f => f.type === 'item-list')
    if (itemListFields.length === 0) return

    setExpandedItems(prev => {
      const next = { ...prev }
      let changed = false
      for (const f of itemListFields) {
        const entries = (values[f.key] as Array<{ name: string }> | undefined) ?? []
        if (entries.length === 0 && next[f.key]?.size > 0) {
          next[f.key] = new Set()
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [values, fields])

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
            <input id={field.key} type="number" value={(values[field.key] as number) ?? ''} onChange={e => update(field.key, e.target.valueAsNumber)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b' }} />
          )}
          {field.type === 'text' && (
            <input id={field.key} type="text" value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b' }} />
          )}
          {field.type === 'textarea' && (
            <textarea id={field.key} value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, resize: 'vertical', background: '#fff', color: '#1e293b' }} />
          )}
          {field.type === 'select' && (
            <select id={field.key} value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b' }}>
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
            <input id={field.key} type="time" value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b' }} />
          )}
          {field.type === 'multi-select' && (
            <div id={field.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {field.options?.map(opt => {
                const selected = ((values[field.key] as string[]) ?? []).includes(opt)
                return (
                  <button key={opt} type="button" onClick={() => {
                    const current = (values[field.key] as string[]) ?? []
                    update(field.key, selected ? current.filter(x => x !== opt) : [...current, opt])
                  }} style={{ padding: '4px 12px', borderRadius: 16, border: selected ? '2px solid #fff' : '2px solid #6366f1', background: selected ? '#ec4899' : '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: selected ? 700 : 400, outline: 'none' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}
          {field.type === 'item-list' && (() => {
            type ItemEntry = { name: string; [key: string]: unknown }
            const entries = ((values[field.key] as ItemEntry[]) ?? [])

            const fieldExpanded = expandedItems[field.key] ?? new Set<string>()

            const toggleItem = (itemName: string) => {
              const exists = entries.find(e => e.name === itemName)
              const isExpanded = fieldExpanded.has(itemName)
              if (!exists) {
                // Not selected: select and expand
                const newExpanded = new Set(fieldExpanded)
                newExpanded.add(itemName)
                setExpandedItems({ ...expandedItems, [field.key]: newExpanded })
                onChange({ ...values, [field.key]: [...entries, { name: itemName }] })
              } else if (!isExpanded) {
                // Selected but collapsed: expand only (no onChange)
                const newExpanded = new Set(fieldExpanded)
                newExpanded.add(itemName)
                setExpandedItems({ ...expandedItems, [field.key]: newExpanded })
              } else {
                // Selected and expanded: deselect and collapse
                const newExpanded = new Set(fieldExpanded)
                newExpanded.delete(itemName)
                setExpandedItems({ ...expandedItems, [field.key]: newExpanded })
                onChange({ ...values, [field.key]: entries.filter(e => e.name !== itemName) })
              }
            }

            const updateEntry = (itemName: string, subKey: string, val: number) => {
              const updated = entries.map(e => {
                if (e.name !== itemName) return e
                const next = { ...e, [subKey]: val }
                if (field.computedTotal && field.subFields && field.subFields.length >= 2) {
                  const v0 = subKey === field.subFields[0].key ? val : (e[field.subFields[0].key] as number)
                  const v1 = subKey === field.subFields[1].key ? val : (e[field.subFields[1].key] as number)
                  if (!isNaN(v0) && !isNaN(v1)) next.total = v0 * v1
                }
                return next
              })
              onChange({ ...values, [field.key]: updated })
            }

            return (
              <div>
                {/* 項目ピル */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {field.options?.map(opt => {
                    const selected = entries.some(e => e.name === opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleItem(opt)}
                        style={{
                          padding: '4px 12px', borderRadius: 16,
                          border: selected ? '2px solid #fff' : '2px solid #6366f1',
                          background: selected ? '#ec4899' : '#6366f1',
                          color: '#fff', cursor: 'pointer',
                          fontWeight: selected ? 700 : 400, outline: 'none',
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {/* 選択済み項目の入力欄 */}
                {(field.options ?? []).filter(opt => fieldExpanded.has(opt)).map(itemName => {
                  const entry = entries.find(e => e.name === itemName) ?? { name: itemName }
                  return (
                    <div key={itemName} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#334155' }}>▼ {itemName}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {field.subFields?.map(sf => (
                          <div key={sf.key} style={{ flex: 1, minWidth: 80 }}>
                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{sf.label}</div>
                            <input
                              type="number"
                              placeholder={sf.label}
                              value={(entry[sf.key] as number) ?? ''}
                              onChange={e => updateEntry(itemName, sf.key, e.target.valueAsNumber)}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
                            />
                          </div>
                        ))}
                      </div>
                      {field.computedTotal && typeof entry.total === 'number' && (
                        <div style={{ marginTop: 6, fontSize: 13, color: '#6366f1', fontWeight: 700 }}>
                          合計: {entry.total as number}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      ))}
    </div>
  )
}
