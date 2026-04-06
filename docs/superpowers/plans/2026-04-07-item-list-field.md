# item-list フィールドタイプ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 複数項目それぞれに数値サブフィールドを入力し合計を自動計算できる汎用フィールドタイプ `item-list` を追加する。

**Architecture:** `types/index.ts` に型を追加 → `FieldEditor.tsx` に設定UIを追加 → `DynamicForm.tsx` に記録UIを追加。既存の `Record.values: { [key: string]: unknown }` 型はそのまま利用し、DB・Sync層は無変更。

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

---

## ファイルマップ

| ファイル | 役割 |
|---|---|
| `src/types/index.ts` | `ItemListSubField` 型追加・`FieldDefinition` 拡張・`FieldType` に `'item-list'` 追加 |
| `src/features/categories/FieldEditor.tsx` | `item-list` 選択時の設定UI（項目リスト・サブフィールド・合計フラグ） |
| `src/features/recording/DynamicForm.tsx` | `item-list` レンダリング（ピル選択・展開入力・合計表示） |
| `src/tests/features/recording/DynamicForm.test.tsx` | `item-list` のテストケース追加 |

---

## Task 1: 型定義を追加する

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: `types/index.ts` を編集する**

`FieldType` ユニオンに `'item-list'` を追加し、`ItemListSubField` インターフェースを新規追加し、`FieldDefinition` に `subFields` と `computedTotal` を追加する。

```ts
// src/types/index.ts

export type FieldType =
  | 'number'
  | 'text'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'boolean'
  | 'duration'
  | 'rating'
  | 'item-list'   // ← 追加

export interface ItemListSubField {
  key: string    // 例: 'weight', 'reps'
  label: string  // 例: 'レベル', '回数'
}

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required?: boolean
  unit?: string
  options?: string[]
  subFields?: ItemListSubField[]   // ← 追加: item-list 専用
  computedTotal?: boolean          // ← 追加: true なら subFields[0].value × subFields[1].value を自動計算
}
```

- [ ] **Step 2: TypeScript コンパイルエラーがないか確認する**

```bash
cd C:/Users/msaka/Documents/activity-logger
npx tsc --noEmit
```

期待結果: エラーなし（または既存のエラーのみ）

- [ ] **Step 3: コミット**

```bash
git add src/types/index.ts
git commit -m "feat: add item-list field type to type definitions"
```

---

## Task 2: `DynamicForm.tsx` に item-list レンダリングを追加する（TDD）

**Files:**
- Modify: `src/tests/features/recording/DynamicForm.test.tsx`
- Modify: `src/features/recording/DynamicForm.tsx`

- [ ] **Step 1: テストを書く**

`src/tests/features/recording/DynamicForm.test.tsx` の既存の `describe('DynamicForm', ...)` ブロック内に以下を追記する：

```tsx
import type { ItemListSubField } from '../../../types'

// 既存の fields 定義の下に追加
const itemListField: FieldDefinition = {
  key: 'machines',
  label: 'マシン',
  type: 'item-list',
  options: ['レッグプレス', 'チェストプレス'],
  subFields: [
    { key: 'weight', label: 'レベル' },
    { key: 'reps', label: '回数' },
  ] as ItemListSubField[],
  computedTotal: true,
}

describe('DynamicForm - item-list', () => {
  it('項目名のピルボタンを表示する', () => {
    render(<DynamicForm fields={[itemListField]} values={{}} onChange={() => {}} />)
    expect(screen.getByText('レッグプレス')).toBeInTheDocument()
    expect(screen.getByText('チェストプレス')).toBeInTheDocument()
  })

  it('項目を選択するとサブフィールド入力欄が展開する', async () => {
    render(<DynamicForm fields={[itemListField]} values={{}} onChange={() => {}} />)
    await userEvent.click(screen.getByText('レッグプレス'))
    expect(screen.getByPlaceholderText('レベル')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('回数')).toBeInTheDocument()
  })

  it('サブフィールドに値を入力するとonChangeが呼ばれる', async () => {
    const onChange = vi.fn()
    render(<DynamicForm fields={[itemListField]} values={{}} onChange={onChange} />)
    await userEvent.click(screen.getByText('レッグプレス'))
    await userEvent.type(screen.getByPlaceholderText('レベル'), '30')
    expect(onChange).toHaveBeenCalled()
  })

  it('両サブフィールドが入力済みのとき合計を表示する', async () => {
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
    await userEvent.click(screen.getByText('レッグプレス'))
    expect(screen.getByText(/合計.*450/)).toBeInTheDocument()
  })

  it('項目を再タップで選択解除するとonChangeで項目が除去される', async () => {
    const onChange = vi.fn()
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={onChange} />)
    // 選択済み項目を再タップ
    await userEvent.click(screen.getByText('レッグプレス'))
    await userEvent.click(screen.getByText('レッグプレス'))
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall.machines).toEqual([])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd C:/Users/msaka/Documents/activity-logger
npx vitest run src/tests/features/recording/DynamicForm.test.tsx
```

期待結果: `item-list` 関連テストが FAIL（レンダリング未実装のため）

- [ ] **Step 3: `DynamicForm.tsx` に item-list レンダリングを追加する**

`DynamicForm.tsx` の `multi-select` ブロックの直後（`</div>` の前）に以下を追加する：

```tsx
{field.type === 'item-list' && (() => {
  type ItemEntry = { name: string; [key: string]: unknown }
  const entries = ((values[field.key] as ItemEntry[]) ?? [])

  const toggleItem = (itemName: string) => {
    const exists = entries.find(e => e.name === itemName)
    if (exists) {
      onChange({ ...values, [field.key]: entries.filter(e => e.name !== itemName) })
    } else {
      onChange({ ...values, [field.key]: [...entries, { name: itemName }] })
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
      {entries.map(entry => (
        <div key={entry.name} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#334155' }}>▼ {entry.name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {field.subFields?.map(sf => (
              <div key={sf.key} style={{ flex: 1, minWidth: 80 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{sf.label}</div>
                <input
                  type="number"
                  placeholder={sf.label}
                  value={(entry[sf.key] as number) ?? ''}
                  onChange={e => updateEntry(entry.name as string, sf.key, e.target.valueAsNumber)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          {field.computedTotal && typeof entry.total === 'number' && (
            <div style={{ marginTop: 6, fontSize: 13, color: '#6366f1', fontWeight: 700 }}>
              合計: {entry.total}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})()}
```

- [ ] **Step 4: テストをすべて通す**

```bash
npx vitest run src/tests/features/recording/DynamicForm.test.tsx
```

期待結果: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add src/features/recording/DynamicForm.tsx src/tests/features/recording/DynamicForm.test.tsx
git commit -m "feat: add item-list rendering to DynamicForm"
```

---

## Task 3: `FieldEditor.tsx` に item-list 設定UIを追加する

**Files:**
- Modify: `src/features/categories/FieldEditor.tsx`

このタスクにはUIロジックのみでテスト対象が薄いため、TDDではなく実装後の手動確認で進める。

- [ ] **Step 1: `FIELD_TYPES` に `item-list` を追加する**

`FieldEditor.tsx` の `FIELD_TYPES` 配列に以下を追加：

```ts
{ value: 'item-list', label: 'アイテムリスト' },
```

- [ ] **Step 2: item-list 設定UIブロックを追加する**

`FieldEditor.tsx` の `number` 用の `unit` 入力欄（`{field.type === 'number' && ...}`）の直後に以下を追加：

```tsx
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
```

- [ ] **Step 3: TypeScript エラーがないか確認する**

```bash
npx tsc --noEmit
```

期待結果: エラーなし

- [ ] **Step 4: 全テストを実行して既存テストが壊れていないか確認する**

```bash
npx vitest run
```

期待結果: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add src/features/categories/FieldEditor.tsx
git commit -m "feat: add item-list settings UI to FieldEditor"
```

---

## Task 4: 動作確認

- [ ] **Step 1: dev サーバーを起動する**

```bash
npm run dev
```

- [ ] **Step 2: 設定画面でカテゴリを作成する**

1. 設定 → 新規カテゴリ（例：「🏋️ ジム」）
2. フィールドを追加 → タイプ「アイテムリスト」を選択
3. 項目リストに「レッグプレス」「チェストプレス」を入力
4. サブフィールドを2つ追加：「レベル」「回数」
5. 「合計を自動計算」チェックをON
6. 保存

- [ ] **Step 3: 記録画面で動作を確認する**

1. 記録画面で「ジム」カテゴリを選択
2. 「記録する」をタップしてフォームを展開
3. 「マシン」フィールドのピルから「レッグプレス」をタップ → 入力欄が展開することを確認
4. レベル: 30、回数: 15 と入力 → 「合計: 450」が表示されることを確認
5. 「チェストプレス」も選択してデータを入力
6. 保存ボタンを押して保存を確認

- [ ] **Step 4: ログ画面で保存データを確認する**

ログ画面で記録した日付のカードを開き、マシンデータが表示されていることを確認する。
