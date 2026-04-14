import { useEffect, useState } from 'react'
import type { FieldDefinition } from '../../types'

interface DynamicFormProps {
  fields: FieldDefinition[]
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}

type ItemEntry = { name: string; [key: string]: unknown }

function buildSummary(entry: ItemEntry, field: FieldDefinition): string {
  const sf = field.subFields ?? []
  if (sf.length === 0) return ''
  const hasAnyValue = sf.some(s => typeof entry[s.key] === 'number' && !isNaN(entry[s.key] as number))
  if (!hasAnyValue) return ''
  if (sf.length >= 2 && field.computedTotal && typeof entry.total === 'number') {
    const v0 = entry[sf[0].key] as number
    const v1 = entry[sf[1].key] as number
    return `${isNaN(v0) ? '?' : v0} × ${isNaN(v1) ? '?' : v1} = ${entry.total}`
  }
  if (sf.length >= 2) {
    return sf.map(s => `${s.label}: ${isNaN(entry[s.key] as number) ? '—' : entry[s.key]}`).join(' / ')
  }
  return `${sf[0].label}: ${entry[sf[0].key] ?? '—'}`
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
              {field.label}{field.required && <span style={{ color: '#ef4444' }}> *</span>}
            </label>
            {field.unit && <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>({field.unit})</span>}
          </div>

          {field.type === 'number' && (
            <input id={field.key} type="number" value={(values[field.key] as number) ?? ''} onChange={e => update(field.key, e.target.valueAsNumber)} style={{ width: '100%', padding: 8, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }} />
          )}
          {field.type === 'text' && (
            <input id={field.key} type="text" value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }} />
          )}
          {field.type === 'textarea' && (
            <textarea id={field.key} value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #334155', borderRadius: 4, resize: 'vertical', background: '#0f172a', color: '#e2e8f0' }} />
          )}
          {field.type === 'select' && (
            <select id={field.key} value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }}>
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
            <input id={field.key} type="time" value={(values[field.key] as string) ?? ''} onChange={e => update(field.key, e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }} />
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
            const entries = ((values[field.key] as ItemEntry[]) ?? [])
            const fieldExpanded = expandedItems[field.key] ?? new Set<string>()
            const sfCount = field.subFields?.length ?? 0
            const colCount = sfCount + (field.computedTotal ? 1 : 0)

            const toggleItem = (itemName: string) => {
              const exists = entries.find(e => e.name === itemName)
              const isExpanded = fieldExpanded.has(itemName)
              const newExpanded = new Set(fieldExpanded)
              if (!exists) {
                // 未選択 → 選択+展開
                newExpanded.add(itemName)
                setExpandedItems({ ...expandedItems, [field.key]: newExpanded })
                onChange({ ...values, [field.key]: [...entries, { name: itemName }] })
              } else if (!isExpanded) {
                // 折りたたみ → 展開
                newExpanded.add(itemName)
                setExpandedItems({ ...expandedItems, [field.key]: newExpanded })
              } else {
                // 展開 → 折りたたみ（値は保持）
                newExpanded.delete(itemName)
                setExpandedItems({ ...expandedItems, [field.key]: newExpanded })
              }
            }

            const deselectItem = (itemName: string) => {
              const newExpanded = new Set(fieldExpanded)
              newExpanded.delete(itemName)
              setExpandedItems({ ...expandedItems, [field.key]: newExpanded })
              onChange({ ...values, [field.key]: entries.filter(e => e.name !== itemName) })
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
                {field.options?.map(opt => {
                  const entry = entries.find(e => e.name === opt)
                  const isSelected = !!entry
                  const isExpanded = fieldExpanded.has(opt)
                  const summary = entry ? buildSummary(entry, field) : ''

                  return (
                    <div key={opt} style={{ marginBottom: 6, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                      <button
                        type="button"
                        onClick={() => toggleItem(opt)}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          background: isSelected ? '#ec4899' : '#1e293b',
                          border: isSelected ? 'none' : '1px solid #334155',
                          borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                          color: isSelected ? '#fff' : '#94a3b8',
                          fontWeight: isSelected ? 700 : 400,
                          fontSize: 13,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          outline: 'none',
                          userSelect: 'none',
                          boxSizing: 'border-box',
                          minWidth: 0,
                        }}
                      >
                        <span>{opt}</span>
                        {isSelected && (
                          <span style={{ fontSize: 11, opacity: 0.85, flexShrink: 0, marginLeft: 8 }}>
                            {summary ? `${summary} ` : ''}{isExpanded ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => deselectItem(opt)}
                          aria-label={`${opt}を削除`}
                          style={{
                            padding: '10px 11px',
                            background: '#3f1e1e',
                            border: '1px solid #7f1d1d',
                            borderRadius: 8,
                            color: '#f87171',
                            fontSize: 14,
                            cursor: 'pointer',
                            flexShrink: 0,
                            lineHeight: 1,
                          }}
                        >×</button>
                      )}

                      {isExpanded && (
                        <div style={{ background: '#1e293b', borderRadius: '0 0 8px 8px', padding: '8px 10px' }}>
                          {/* ラベル行 */}
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: 6, marginBottom: 4 }}>
                            {field.subFields?.map(sf => (
                              <span key={sf.key} style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>{sf.label}</span>
                            ))}
                            {field.computedTotal && <span style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>合計</span>}
                          </div>
                          {/* 入力行 */}
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: 6 }}>
                            {field.subFields?.map(sf => (
                              <input
                                key={sf.key}
                                type="number"
                                placeholder={sf.label}
                                value={(entry?.[sf.key] as number) ?? ''}
                                onChange={e => updateEntry(opt, sf.key, e.target.valueAsNumber)}
                                style={{ padding: '8px 6px', border: '1px solid #334155', borderRadius: 6, background: '#0f172a', color: '#e2e8f0', fontSize: 15, textAlign: 'center', width: '100%', boxSizing: 'border-box' }}
                              />
                            ))}
                            {field.computedTotal && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: typeof entry?.total === 'number' ? '#6366f1' : '#475569' }}>
                                {typeof entry?.total === 'number' ? entry.total : '—'}
                              </div>
                            )}
                          </div>
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
