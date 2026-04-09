# CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** カテゴリごとに記録データをCSVファイルとしてダウンロードできる機能を設定画面に追加する。

**Architecture:** 純粋関数のCSV生成ユーティリティ (`csvExport.ts`) を独立して実装しテストする。UIは専用の `ExportPage.tsx` に分離し、設定画面からナビゲートする。

**Tech Stack:** React, TypeScript, Dexie.js, Vitest, Blob/URL API

---

## File Structure

| ファイル | 種別 | 役割 |
|---|---|---|
| `src/lib/utils/csvExport.ts` | 新規 | CSV生成・ファイル名生成・ダウンロードの3関数 |
| `src/tests/lib/csvExport.test.ts` | 新規 | csvExport.tsの単体テスト |
| `src/features/settings/ExportPage.tsx` | 新規 | エクスポートUIページ |
| `src/features/settings/SettingsPage.tsx` | 修正 | メニュー項目追加（1行） |
| `src/App.tsx` | 修正 | `/settings/export` ルート追加（2行） |

---

### Task 1: csvExport.ts — CSV生成ユーティリティ

**Files:**
- Create: `src/lib/utils/csvExport.ts`
- Test: `src/tests/lib/csvExport.test.ts`

#### データ構造の前提知識

item-list フィールドの `values[field.key]` は以下の配列:
```typescript
type ItemEntry = { name: string; total?: number; [subFieldKey: string]: unknown }
// 例: [{ name: 'レッグプレス', weight: 80, reps: 10, total: 800 }]
```
`total` は `computedTotal: true` のとき DynamicForm が自動計算して保存する。

- [ ] **Step 1: テストファイルを作成（失敗確認用）**

`src/tests/lib/csvExport.test.ts` を作成:

```typescript
import { describe, it, expect } from 'vitest'
import { buildCsvContent, buildFilename } from '../../../lib/utils/csvExport'
import type { Category } from '../../../types'
import type { Record as LogRecord } from '../../../types'

const makeRecord = (overrides: Partial<LogRecord> = {}): LogRecord => ({
  id: 'r1',
  category_id: 'cat1',
  user_id: 'user1',
  recorded_at: '2026-04-01T12:00:00.000Z',
  values: {},
  synced: false,
  updated_at: '2026-04-01T12:00:00.000Z',
  ...overrides,
})

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat1',
  user_id: 'user1',
  name: '健康管理',
  icon: '🏥',
  fields: [],
  sort_order: 0,
  updated_at: '2026-04-01T12:00:00.000Z',
  ...overrides,
})

describe('buildCsvContent', () => {
  it('通常フィールドのみ: ヘッダー + 1行を生成する', () => {
    const category = makeCategory({
      fields: [
        { key: 'weight', label: '体重', type: 'number' },
        { key: 'memo', label: 'メモ', type: 'text' },
      ],
    })
    const records = [makeRecord({ values: { weight: 70.5, memo: '良好' } })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,体重,メモ')
    expect(lines[1]).toBe('2026-04-01,70.5,良好')
  })

  it('boolean フィールド: true→はい / false→いいえ', () => {
    const category = makeCategory({
      fields: [{ key: 'done', label: '完了', type: 'boolean' }],
    })
    const records = [
      makeRecord({ id: 'r1', values: { done: true } }),
      makeRecord({ id: 'r2', recorded_at: '2026-04-02T12:00:00.000Z', values: { done: false } }),
    ]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[1]).toBe('2026-04-01,はい')
    expect(lines[2]).toBe('2026-04-02,いいえ')
  })

  it('multi-select フィールド: | で連結', () => {
    const category = makeCategory({
      fields: [{ key: 'tags', label: 'タグ', type: 'multi-select', options: ['A', 'B', 'C'] }],
    })
    const records = [makeRecord({ values: { tags: ['A', 'C'] } })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[1]).toBe('2026-04-01,A|C')
  })

  it('値が未入力の場合: 空文字', () => {
    const category = makeCategory({
      fields: [{ key: 'weight', label: '体重', type: 'number' }],
    })
    const records = [makeRecord({ values: {} })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[1]).toBe('2026-04-01,')
  })

  it('カンマを含むセル値はダブルクォートでエスケープ', () => {
    const category = makeCategory({
      fields: [{ key: 'memo', label: 'メモ', type: 'text' }],
    })
    const records = [makeRecord({ values: { memo: '良好,快適' } })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[1]).toBe('2026-04-01,"良好,快適"')
  })

  it('item-list (computedTotal なし): 各アイテムを1行に展開', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        options: ['レッグプレス', 'チェストプレス'],
        subFields: [
          { key: 'weight', label: '重さ' },
          { key: 'reps', label: '回数' },
        ],
        computedTotal: false,
      }],
    })
    const records = [makeRecord({
      values: {
        exercise: [
          { name: 'レッグプレス', weight: 80, reps: 10 },
          { name: 'チェストプレス', weight: 60, reps: 12 },
        ],
      },
    })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,種目,重さ,回数')
    expect(lines[1]).toBe('2026-04-01,レッグプレス,80,10')
    expect(lines[2]).toBe('2026-04-01,チェストプレス,60,12')
  })

  it('item-list (computedTotal あり): 合計列を追加', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        options: ['レッグプレス'],
        subFields: [
          { key: 'weight', label: '重さ' },
          { key: 'reps', label: '回数' },
        ],
        computedTotal: true,
      }],
    })
    const records = [makeRecord({
      values: {
        exercise: [{ name: 'レッグプレス', weight: 80, reps: 10, total: 800 }],
      },
    })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,種目,重さ,回数,合計')
    expect(lines[1]).toBe('2026-04-01,レッグプレス,80,10,800')
  })

  it('item-list (total 未保存): subFields から計算する', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        options: ['レッグプレス'],
        subFields: [
          { key: 'weight', label: '重さ' },
          { key: 'reps', label: '回数' },
        ],
        computedTotal: true,
      }],
    })
    const records = [makeRecord({
      values: {
        exercise: [{ name: 'レッグプレス', weight: 80, reps: 10 }], // total なし
      },
    })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[1]).toBe('2026-04-01,レッグプレス,80,10,800')
  })

  it('item-list: アイテムが空の記録はスキップ', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        options: ['レッグプレス'],
        subFields: [{ key: 'weight', label: '重さ' }],
        computedTotal: false,
      }],
    })
    const records = [makeRecord({ values: { exercise: [] } })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1) // ヘッダーのみ
  })

  it('UTF-8 BOM で始まる', () => {
    const category = makeCategory({ fields: [] })
    const csv = buildCsvContent(category, [])
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
  })
})

describe('buildFilename', () => {
  it('開始日・終了日あり', () => {
    expect(buildFilename('健康管理', '2026-04-01', '2026-04-30', '20260409'))
      .toBe('20260409_健康管理_2026-04-01_2026-04-30.csv')
  })

  it('日付なし（全データ）', () => {
    expect(buildFilename('筋トレ', null, null, '20260409'))
      .toBe('20260409_筋トレ_全データ.csv')
  })

  it('開始日のみ', () => {
    expect(buildFilename('睡眠', '2026-04-01', null, '20260409'))
      .toBe('20260409_睡眠_2026-04-01_.csv')
  })

  it('終了日のみ', () => {
    expect(buildFilename('睡眠', null, '2026-04-30', '20260409'))
      .toBe('20260409_睡眠__2026-04-30.csv')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/tests/lib/csvExport.test.ts`

Expected: FAIL with `Cannot find module '../../../lib/utils/csvExport'`

- [ ] **Step 3: `src/lib/utils/csvExport.ts` を実装**

```typescript
import type { Category, FieldDefinition } from '../../types'
import type { Record as LogRecord } from '../../types'

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function formatFieldValue(field: FieldDefinition, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (field.type === 'boolean') return value ? 'はい' : 'いいえ'
  if (field.type === 'multi-select') {
    return Array.isArray(value) ? (value as string[]).join('|') : String(value)
  }
  return String(value)
}

export function buildCsvContent(
  category: Category,
  records: LogRecord[],
): string {
  const { fields } = category
  const itemListField = fields.find(f => f.type === 'item-list')
  const nonItemListFields = fields.filter(f => f.type !== 'item-list')
  const rows: string[][] = []

  if (itemListField) {
    const subFields = itemListField.subFields ?? []
    const hasTotal = itemListField.computedTotal === true && subFields.length >= 2

    const header = [
      '日付',
      ...nonItemListFields.map(f => f.label),
      '種目',
      ...subFields.map(sf => sf.label),
      ...(hasTotal ? ['合計'] : []),
    ]
    rows.push(header)

    type ItemEntry = { name: string; total?: number; [key: string]: unknown }
    for (const record of records) {
      const date = record.recorded_at.slice(0, 10)
      const baseValues = nonItemListFields.map(f =>
        escapeCell(formatFieldValue(f, record.values[f.key]))
      )
      const items = record.values[itemListField.key] as ItemEntry[] | undefined
      if (!Array.isArray(items) || items.length === 0) continue

      for (const item of items) {
        const totalValue = hasTotal
          ? [escapeCell(
              item.total !== undefined
                ? item.total
                : (Number(item[subFields[0].key]) || 0) * (Number(item[subFields[1].key]) || 0)
            )]
          : []
        rows.push([
          date,
          ...baseValues,
          escapeCell(item.name ?? ''),
          ...subFields.map(sf => escapeCell(item[sf.key] ?? '')),
          ...totalValue,
        ])
      }
    }
  } else {
    const header = ['日付', ...fields.map(f => f.label)]
    rows.push(header)

    for (const record of records) {
      const date = record.recorded_at.slice(0, 10)
      const values = fields.map(f =>
        escapeCell(formatFieldValue(f, record.values[f.key]))
      )
      rows.push([date, ...values])
    }
  }

  return '\uFEFF' + rows.map(row => row.join(',')).join('\n')
}

export function buildFilename(
  categoryName: string,
  fromDate: string | null,
  toDate: string | null,
  today: string,
): string {
  let period: string
  if (fromDate && toDate) {
    period = `${fromDate}_${toDate}`
  } else if (fromDate) {
    period = `${fromDate}_`
  } else if (toDate) {
    period = `_${toDate}`
  } else {
    period = '全データ'
  }
  return `${today}_${categoryName}_${period}.csv`
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: テストがすべてパスすることを確認**

Run: `npx vitest run src/tests/lib/csvExport.test.ts`

Expected: PASS (14 tests)

- [ ] **Step 5: コミット**

```bash
git add src/lib/utils/csvExport.ts src/tests/lib/csvExport.test.ts
git commit -m "feat: add csvExport utility (buildCsvContent, buildFilename, downloadCsv)"
```

---

### Task 2: ExportPage.tsx — エクスポートUIページ

**Files:**
- Create: `src/features/settings/ExportPage.tsx`

テスト不要（UIコンポーネント。ロジックはTask 1でカバー済み）。

- [ ] **Step 1: `src/features/settings/ExportPage.tsx` を作成**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { useAuthContext as useAuth } from '../auth/AuthContext'
import { buildCsvContent, buildFilename, downloadCsv } from '../../lib/utils/csvExport'

export function ExportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).sortBy('sort_order') : [],
    [user?.id]
  )

  const selectedCategory = categories?.find(c => c.id === selectedId)

  const handleDownload = async () => {
    if (!selectedCategory || !user) return
    setError(null)

    if (fromDate && toDate && fromDate > toDate) {
      setError('開始日は終了日より前にしてください')
      return
    }

    setLoading(true)
    try {
      const records = await db.records
        .where('category_id').equals(selectedId)
        .filter(r => {
          const date = r.recorded_at.slice(0, 10)
          if (fromDate && date < fromDate) return false
          if (toDate && date > toDate) return false
          return true
        })
        .sortBy('recorded_at')

      if (records.length === 0) {
        setError('該当期間にデータがありません')
        return
      }

      const today = new Date().toLocaleDateString('sv-SE').replace(/-/g, '')
      const content = buildCsvContent(selectedCategory, records)
      const filename = buildFilename(
        selectedCategory.name,
        fromDate || null,
        toDate || null,
        today,
      )
      downloadCsv(content, filename)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    border: '1px solid #334155',
    borderRadius: 6,
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <button
            onClick={() => navigate('/settings')}
            style={{ padding: '8px 12px', background: 'none', border: '1px solid #94a3b8', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}
          >
            ← 戻る
          </button>
        </div>
        <h2 style={{ margin: 0, textAlign: 'center' }}>CSVエクスポート</h2>
        <div />
      </div>

      {/* カテゴリ選択 */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#f1f5f9' }}>
          カテゴリを選択
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories?.map(cat => {
            const catColor = cat.color ?? '#c4b5fd'
            const isSelected = selectedId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedId(cat.id); setError(null) }}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap', background: catColor, color: '#1e293b',
                  fontWeight: isSelected ? 700 : 400,
                  opacity: isSelected ? 1 : 0.55,
                }}
              >
                {cat.icon} {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* 日付範囲 */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#f1f5f9' }}>
          期間（空欄 = 全データ）
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={inputStyle}
          />
          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontSize: 14 }}>〜</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>{error}</p>
      )}

      <button
        onClick={handleDownload}
        disabled={!selectedId || loading}
        style={{
          width: '100%', padding: 14,
          background: !selectedId ? '#1e293b' : '#6366f1',
          color: !selectedId ? '#64748b' : '#fff',
          border: 'none', borderRadius: 8,
          cursor: !selectedId ? 'default' : 'pointer',
          fontWeight: 700, fontSize: 16,
        }}
      >
        {loading ? '生成中...' : '📥 CSVをダウンロード'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: TypeScriptエラーがないことを確認**

Run: `npx tsc --noEmit`

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/settings/ExportPage.tsx
git commit -m "feat: add ExportPage component"
```

---

### Task 3: ルートとナビゲーションの接続

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: `src/App.tsx` に import とルートを追加**

現在のファイルの先頭インポート部分に追加:
```tsx
import { ExportPage } from './features/settings/ExportPage'
```

`<Route path="/settings/categories/:id" .../>` の次の行に追加:
```tsx
<Route path="/settings/export" element={<ExportPage />} />
```

追加後の Routes 全体:
```tsx
<Routes>
  <Route path="/" element={<RecordingPage />} />
  <Route path="/logs" element={<LogsPage />} />
  <Route path="/analytics" element={<AnalyticsPage />} />
  <Route path="/settings" element={<SettingsPage />} />
  <Route path="/settings/categories" element={<CategoryListPage />} />
  <Route path="/settings/categories/new" element={<CategoryEditorPage />} />
  <Route path="/settings/categories/:id" element={<CategoryEditorPage />} />
  <Route path="/settings/export" element={<ExportPage />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

- [ ] **Step 2: `src/features/settings/SettingsPage.tsx` にメニュー項目を追加**

現在の `カテゴリ設定` メニューの直後（`ログアウト` の前）に追加:
```tsx
<div onClick={() => navigate('/settings/export')} style={menuItem}>
  <span>📥 CSVエクスポート</span>
  <span style={{ color: '#64748b' }}>›</span>
</div>
```

- [ ] **Step 3: 全テストがパスすることを確認**

Run: `npx vitest run`

Expected: 全テスト PASS

- [ ] **Step 4: TypeScriptエラーがないことを確認**

Run: `npx tsc --noEmit`

Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/App.tsx src/features/settings/SettingsPage.tsx
git commit -m "feat: wire up CSV export route and settings menu"
```
