# Item-List Accordion UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DynamicForm.tsx` の `item-list` フィールドをアコーディオン式に変更し、種目ボタンの直下に入力欄（重量・回数・合計を1行）を展開するUIにする。

**Architecture:** `DynamicForm.tsx` 1ファイルのみ変更。コンポーネント外に `buildSummary` ヘルパーを追加。`toggleItem` の動作を「展開/折りたたみのみ」に変更し、削除は長押し（500ms）専用にする。

**Tech Stack:** React 18 + TypeScript, Vitest + @testing-library/react

---

### Task 1: テストを更新・追加（TDD）

**Files:**
- Modify: `src/tests/features/recording/DynamicForm.test.tsx`

既存テスト2件は新しい動作と一致しないため更新が必要。新規3件を追加する。

- [ ] **Step 1: 既存テストを更新 — 合計表示テストを修正**

新UIでは展開時に「合計」ラベルと「450」値が別要素に分離される。

`src/tests/features/recording/DynamicForm.test.tsx` の `'両サブフィールドが入力済みのとき合計を表示する'` を以下に置き換える：

```tsx
it('展開時に入力済み値と合計が表示される', async () => {
  const values = {
    machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
  }
  render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
  // 初期状態は折りたたみ → クリックで展開
  await userEvent.click(screen.getByText('レッグプレス'))
  expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  expect(screen.getByDisplayValue('15')).toBeInTheDocument()
  expect(screen.getByText('450')).toBeInTheDocument()
})
```

- [ ] **Step 2: 既存テストを更新 — 再タップ挙動テストを修正**

新UIでは「2回タップ = 折りたたみ（削除ではない）」。`'項目を再タップで選択解除するとonChangeで項目が除去される'` を以下に置き換える：

```tsx
it('展開中に再タップすると折りたたむ（onChangeは呼ばれない）', async () => {
  const onChange = vi.fn()
  render(<DynamicForm fields={[itemListField]} values={{}} onChange={onChange} />)
  await userEvent.click(screen.getByText('レッグプレス')) // タップ1: 選択+展開
  onChange.mockClear()
  await userEvent.click(screen.getByText('レッグプレス')) // タップ2: 折りたたみ
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.queryByPlaceholderText('レベル')).not.toBeInTheDocument()
})
```

- [ ] **Step 3: 新規テスト追加 — 長押し削除**

ファイル末尾の `describe('DynamicForm - item-list', ...)` ブロック内に追加。
`fireEvent` のインポートも追加する：

```tsx
// ファイル先頭のimport行を更新
import { render, screen, fireEvent } from '@testing-library/react'
```

```tsx
it('折りたたみ中のボタンを長押しで選択解除する', async () => {
  vi.useFakeTimers()
  const onChange = vi.fn()
  const values = {
    machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
  }
  render(<DynamicForm fields={[itemListField]} values={values} onChange={onChange} />)
  // 初期状態: 選択済みかつ折りたたみ
  const btn = screen.getByRole('button', { name: /レッグプレス/ })
  fireEvent.pointerDown(btn)
  vi.advanceTimersByTime(500)
  expect(onChange).toHaveBeenCalledWith({ machines: [] })
  vi.useRealTimers()
})
```

- [ ] **Step 4: 新規テスト追加 — 折りたたみ時サマリー表示**

```tsx
it('折りたたみ時にサマリー文字列を表示する', () => {
  const values = {
    machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
  }
  render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
  // 初期状態は折りたたみ: サマリーがボタン内に表示される
  expect(screen.getByText(/30 × 15 = 450/)).toBeInTheDocument()
})
```

- [ ] **Step 5: 新規テスト追加 — 折りたたみ時に入力欄が非表示**

```tsx
it('折りたたみ時は入力欄を表示しない', () => {
  const values = {
    machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
  }
  render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
  // 初期状態は折りたたみ
  expect(screen.queryByPlaceholderText('レベル')).not.toBeInTheDocument()
})
```

- [ ] **Step 6: テストが失敗することを確認**

```bash
cd C:/Users/msaka/Documents/activity-logger
npx vitest run src/tests/features/recording/DynamicForm.test.tsx
```

期待結果: 新規追加・更新したテストが FAIL（実装前なので正常）。既存の他テストは PASS。

---

### Task 2: DynamicForm.tsx を実装

**Files:**
- Modify: `src/features/recording/DynamicForm.tsx`

- [ ] **Step 1: ファイル全体を以下の内容に置き換える**

```tsx
import { useEffect, useRef, useState } from 'react'
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
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const longPressFired = useRef<Set<string>>(new Set())

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
                  const pressKey = `${field.key}:${opt}`

                  return (
                    <div key={opt} style={{ marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (longPressFired.current.has(pressKey)) {
                            longPressFired.current.delete(pressKey)
                            return
                          }
                          toggleItem(opt)
                        }}
                        onPointerDown={() => {
                          if (isSelected && !isExpanded) {
                            longPressTimers.current[pressKey] = setTimeout(() => {
                              longPressFired.current.add(pressKey)
                              deselectItem(opt)
                            }, 500)
                          }
                        }}
                        onPointerUp={() => clearTimeout(longPressTimers.current[pressKey])}
                        onPointerLeave={() => clearTimeout(longPressTimers.current[pressKey])}
                        style={{
                          width: '100%',
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
                        }}
                      >
                        <span>{opt}</span>
                        {isSelected && (
                          <span style={{ fontSize: 11, opacity: 0.85, flexShrink: 0, marginLeft: 8 }}>
                            {summary ? `${summary} ` : ''}{isExpanded ? '▲' : '▼'}
                          </span>
                        )}
                      </button>

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
```

- [ ] **Step 2: テストが全て通ることを確認**

```bash
cd C:/Users/msaka/Documents/activity-logger
npx vitest run src/tests/features/recording/DynamicForm.test.tsx
```

期待結果: 全テスト PASS（`Tests X passed`）

- [ ] **Step 3: ビルドが通ることを確認**

```bash
npm run build 2>&1 | tail -5
```

期待結果: `✓ built in X.XXs`（型エラーなし）

- [ ] **Step 4: コミット**

```bash
git add src/features/recording/DynamicForm.tsx src/tests/features/recording/DynamicForm.test.tsx
git commit -m "feat: item-list accordion UI with inline inputs

- Replace pill-group + card-stack with per-item accordion buttons
- Tap unselected: select + expand; tap expanded: collapse (values kept)
- Long-press collapsed button (500ms): deselect and clear values
- Expanded view: subfields + computed total on one row
- Collapsed selected button shows summary (e.g. 60 × 10 = 600)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 5: Vercel にデプロイ**

```bash
git push
```

---

## 動作確認チェックリスト

デプロイ後にスマホ・PCで以下を確認：

- [ ] 未選択ボタン → タップで展開（入力欄が直下に出る）
- [ ] 入力後にボタンをタップ → 折りたたみ（サマリーがボタン内に表示される）
- [ ] 折りたたみ中ボタンをタップ → 再展開して値が保持されている
- [ ] 折りたたみ中ボタンを長押し → 削除（グレーに戻る）
- [ ] 2種目展開してもスクロール不要で入力できる
