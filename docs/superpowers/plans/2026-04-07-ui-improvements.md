# UI改善（フィールド並び順・上部保存ボタン・カテゴリカラー）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** カテゴリ編集画面でフィールドの並び順を変更できるようにし、記録画面に上部保存ボタンを追加し、カテゴリごとにパステルカラーを設定して記録・ログ画面に反映する。

**Architecture:** `Category` 型に `color?: string` を追加し、`CategoryEditorPage` にカラーパレットと `moveField` ロジックを追加、`FieldEditor` に上下移動ボタンを追加する。カラーは `RecordingPage` のカテゴリボタンと `LogCard` の左ボーダーに適用する。既存データへの後方互換性を維持する（`color` 未設定時はデフォルトカラーにフォールバック）。

**Tech Stack:** React, TypeScript, Dexie.js (IndexedDB), Vitest, @testing-library/jest-dom

---

## ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/types/index.ts` | 修正 | `Category` に `color?: string` 追加 |
| `src/features/categories/useCategoryDb.ts` | 修正 | `AddCategoryInput` に `color?` 追加 |
| `src/lib/utils/fieldOrder.ts` | 新規作成 | `moveFieldInArray` 純粋関数（テスト容易化） |
| `src/features/categories/FieldEditor.tsx` | 修正 | `onMoveUp`/`onMoveDown`/`isFirst`/`isLast` props + ↑↓ボタン |
| `src/features/categories/CategoryEditorPage.tsx` | 修正 | カラーパレット選択UI + `moveField` ロジック |
| `src/features/recording/RecordingPage.tsx` | 修正 | カテゴリボタンに `cat.color` 適用 + 上部保存ボタン追加 |
| `src/features/logs/LogCard.tsx` | 修正 | 左ボーダーに `category?.color` 適用 |
| `src/tests/lib/fieldOrder.test.ts` | 新規作成 | `moveFieldInArray` のユニットテスト |
| `src/tests/features/categories/useCategoryDb.test.ts` | 修正 | `color` フィールドの永続化テスト追加 |

---

## Task 1: `Category` 型に `color` フィールドを追加

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/features/categories/useCategoryDb.ts`
- Test: `src/tests/features/categories/useCategoryDb.test.ts`

- [ ] **Step 1: テストを追加（失敗することを確認）**

`src/tests/features/categories/useCategoryDb.test.ts` の末尾に追加：

```typescript
it('colorを指定してカテゴリを追加できる', async () => {
  const cat = await addCategory({ name: 'カラーテスト', icon: '🎨', fields: [], userId: mockUserId, color: '#c4b5fd' })
  expect(cat.color).toBe('#c4b5fd')
})

it('colorを更新できる', async () => {
  const cat = await addCategory({ name: 'カラーテスト', icon: '🎨', fields: [], userId: mockUserId })
  await updateCategory(cat.id, { color: '#fca5a5' })
  const updated = await db.categories.get(cat.id)
  expect(updated?.color).toBe('#fca5a5')
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
cd /c/Users/msaka/Documents/activity-logger
npm test -- --run src/tests/features/categories/useCategoryDb.test.ts
```

期待: TypeScript エラーまたは `color` が undefined でテスト失敗

- [ ] **Step 3: `src/types/index.ts` の `Category` 型に `color` を追加**

`sort_order: number` の行の下に追加：

```typescript
export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  fields: FieldDefinition[]
  sort_order: number
  color?: string           // 追加: パステルカラーの hex 値（例: '#c4b5fd'）
  updated_at: string
}
```

- [ ] **Step 4: `src/features/categories/useCategoryDb.ts` の `AddCategoryInput` に `color?` を追加**

`AddCategoryInput` インターフェースを更新：

```typescript
interface AddCategoryInput {
  name: string
  icon: string
  fields: FieldDefinition[]
  userId: string
  color?: string  // 追加
}
```

`addCategory` 関数内の `category` オブジェクト生成部分を更新：

```typescript
const category: Category = {
  id: generateId(),
  user_id: input.userId,
  name: input.name,
  icon: input.icon,
  fields: input.fields,
  sort_order: maxOrder + 1,
  color: input.color,      // 追加
  updated_at: toISOString(),
}
```

- [ ] **Step 5: テストを実行してパスを確認**

```bash
npm test -- --run src/tests/features/categories/useCategoryDb.test.ts
```

期待: 全テスト PASS

- [ ] **Step 6: コミット**

```bash
cd /c/Users/msaka/Documents/activity-logger
git add src/types/index.ts src/features/categories/useCategoryDb.ts src/tests/features/categories/useCategoryDb.test.ts
git commit -m "feat: add color field to Category type and useCategoryDb"
```

---

## Task 2: `moveFieldInArray` ユーティリティ関数を作成

**Files:**
- Create: `src/lib/utils/fieldOrder.ts`
- Test: `src/tests/lib/fieldOrder.test.ts`

- [ ] **Step 1: テストファイルを作成**

`src/tests/lib/fieldOrder.test.ts` を新規作成：

```typescript
import { describe, it, expect } from 'vitest'
import { moveFieldInArray } from '../../../lib/utils/fieldOrder'

describe('moveFieldInArray', () => {
  const arr = ['a', 'b', 'c', 'd']

  it('上方向に移動できる', () => {
    expect(moveFieldInArray(arr, 2, 'up')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('下方向に移動できる', () => {
    expect(moveFieldInArray(arr, 1, 'down')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('先頭要素を上に移動しても変化しない', () => {
    expect(moveFieldInArray(arr, 0, 'up')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('末尾要素を下に移動しても変化しない', () => {
    expect(moveFieldInArray(arr, 3, 'down')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('元の配列を変更しない（immutable）', () => {
    const original = ['x', 'y', 'z']
    moveFieldInArray(original, 0, 'down')
    expect(original).toEqual(['x', 'y', 'z'])
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npm test -- --run src/tests/lib/fieldOrder.test.ts
```

期待: モジュールが存在しないためエラー

- [ ] **Step 3: `src/lib/utils/fieldOrder.ts` を作成**

```typescript
export function moveFieldInArray<T>(arr: T[], index: number, direction: 'up' | 'down'): T[] {
  if (direction === 'up' && index === 0) return arr
  if (direction === 'down' && index === arr.length - 1) return arr
  const next = [...arr]
  const swapWith = direction === 'up' ? index - 1 : index + 1
  ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
  return next
}
```

- [ ] **Step 4: テストを実行してパスを確認**

```bash
npm test -- --run src/tests/lib/fieldOrder.test.ts
```

期待: 全テスト PASS（5件）

- [ ] **Step 5: コミット**

```bash
git add src/lib/utils/fieldOrder.ts src/tests/lib/fieldOrder.test.ts
git commit -m "feat: add moveFieldInArray utility with tests"
```

---

## Task 3: `FieldEditor` に上下移動ボタンを追加

**Files:**
- Modify: `src/features/categories/FieldEditor.tsx`

- [ ] **Step 1: `FieldEditorProps` に新しい props を追加**

`src/features/categories/FieldEditor.tsx` の `FieldEditorProps` インターフェースを更新：

```typescript
interface FieldEditorProps {
  field: FieldDefinition
  onChange: (field: FieldDefinition) => void
  onRemove: () => void
  onMoveUp: () => void    // 追加
  onMoveDown: () => void  // 追加
  isFirst: boolean        // 追加
  isLast: boolean         // 追加
}
```

- [ ] **Step 2: 関数シグネチャを更新して ↑↓ ボタンを追加**

`export function FieldEditor(...)` を更新：

```typescript
export function FieldEditor({ field, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: FieldEditorProps) {
```

`<div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>` のブロックを更新（inputとselectの前に ↑↓ ボタンを追加）：

```typescript
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            style={{
              padding: '2px 6px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4,
              cursor: isFirst ? 'default' : 'pointer',
              background: isFirst ? '#f8fafc' : '#f1f5f9',
              color: isFirst ? '#cbd5e1' : '#475569',
              lineHeight: 1,
            }}
          >↑</button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            style={{
              padding: '2px 6px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4,
              cursor: isLast ? 'default' : 'pointer',
              background: isLast ? '#f8fafc' : '#f1f5f9',
              color: isLast ? '#cbd5e1' : '#475569',
              lineHeight: 1,
            }}
          >↓</button>
        </div>
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
      {/* 以降は既存コードそのまま */}
```

- [ ] **Step 3: TypeScript エラーがないことを確認**

```bash
cd /c/Users/msaka/Documents/activity-logger
npx tsc --noEmit
```

期待: `CategoryEditorPage.tsx` で `onMoveUp`/`onMoveDown`/`isFirst`/`isLast` が未渡しのエラーが出る（次タスクで解消する）

- [ ] **Step 4: コミット（エラーは次タスクで解消）**

```bash
git add src/features/categories/FieldEditor.tsx
git commit -m "feat: add move up/down buttons to FieldEditor"
```

---

## Task 4: `CategoryEditorPage` に `moveField` とカラーパレットを追加

**Files:**
- Modify: `src/features/categories/CategoryEditorPage.tsx`

- [ ] **Step 1: import と定数を追加**

ファイル冒頭の import 行の後（`const EMOJI_LIST` の前）に追加：

```typescript
import { moveFieldInArray } from '../../lib/utils/fieldOrder'

const PASTEL_COLORS = [
  '#c4b5fd', // ラベンダー
  '#fca5a5', // ピーチ
  '#6ee7b7', // ミント
  '#7dd3fc', // スカイ
  '#fde68a', // バター
  '#f9a8d4', // ブロッサム
  '#a7f3d0', // セージ
  '#fdba74', // ピーチオレンジ
  '#a5f3fc', // パウダーブルー
  '#d8b4fe', // リラック
  '#fcd34d', // シャンパン
  '#fbb6ce', // スモークピンク
]
```

- [ ] **Step 2: `color` state を追加**

`const [fields, setFields] = useState<FieldDefinition[]>([])` の行の後に追加：

```typescript
const [color, setColor] = useState<string>(PASTEL_COLORS[0])
```

- [ ] **Step 3: 既存レコード読み込み時に `color` を復元**

`useEffect` 内の `setFields(cat.fields)` の行の後に追加：

```typescript
if (cat) {
  setName(cat.name)
  setIcon(cat.icon)
  setFields(cat.fields)
  setColor(cat.color ?? PASTEL_COLORS[0])  // 変更
}
```

- [ ] **Step 4: `moveField` 関数を追加**

`removeField` の行の後に追加：

```typescript
const moveField = (i: number, direction: 'up' | 'down') =>
  setFields(prev => moveFieldInArray(prev, i, direction))
```

- [ ] **Step 5: `handleSave` に `color` を追加**

```typescript
const handleSave = async () => {
  if (!name.trim() || !user) return
  if (id) {
    await updateCategory(id, { name, icon, fields, color })
  } else {
    await addCategory({ name, icon, fields, userId: user.id, color })
  }
  navigate('/settings')
}
```

- [ ] **Step 6: カラーパレット選択UIを追加**

カテゴリ名の `<div style={{ marginBottom: 16 }}>` ブロックの直前（アイコン選択の下）に追加：

```typescript
      {/* カラー選択 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, fontSize: 13 }}>カラー</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {PASTEL_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
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
```

- [ ] **Step 7: `FieldEditor` に move props を渡すよう更新**

`fields.map((f, i) => (` の `<FieldEditor .../>` 部分を更新：

```typescript
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
```

- [ ] **Step 8: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 9: 開発サーバーで動作確認**

```bash
npm run dev
```

- カテゴリ編集画面を開く
- カラーパレットが表示されること
- フィールドの ↑↓ ボタンで並び順が変わること
- 保存後、再編集時にカラーと並び順が復元されること

- [ ] **Step 10: コミット**

```bash
git add src/features/categories/CategoryEditorPage.tsx
git commit -m "feat: add color palette and field reordering to CategoryEditorPage"
```

---

## Task 5: `RecordingPage` カテゴリボタンにカラーを適用

**Files:**
- Modify: `src/features/recording/RecordingPage.tsx`

- [ ] **Step 1: カテゴリ選択ボタンのスタイルを更新**

`RecordingPage.tsx` の category selector ブロック（`categories?.map(cat => (` 部分）を更新：

```typescript
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {categories?.map(cat => {
          const catColor = cat.color ?? '#c4b5fd'
          const isSelected = selectedId === cat.id
          return (
            <button key={cat.id} onClick={() => { setSelectedId(cat.id); setValues({}) }}
              style={{
                padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: catColor,
                color: '#1e293b',
                fontWeight: isSelected ? 700 : 400,
                opacity: isSelected ? 1 : 0.55,
                outline: isSelected ? `2px solid ${catColor}` : 'none',
                outlineOffset: 2,
              }}>
              {cat.icon} {cat.name}
            </button>
          )
        })}
      </div>
```

- [ ] **Step 2: 開発サーバーで動作確認**

- 記録画面を開く
- カテゴリボタンがパステルカラーで表示されること
- 選択中のボタンが不透明・太字になること
- カラー未設定のカテゴリはラベンダー（`#c4b5fd`）で表示されること

- [ ] **Step 3: コミット**

```bash
git add src/features/recording/RecordingPage.tsx
git commit -m "feat: apply category color to RecordingPage category buttons"
```

---

## Task 6: `LogCard` 左ボーダーにカラーを適用

**Files:**
- Modify: `src/features/logs/LogCard.tsx`

- [ ] **Step 1: 左ボーダーのカラーを `category?.color` に変更**

`LogCard.tsx` の `<div style={{ background: '#fff', ...` 行を更新：

```typescript
    <div style={{
      background: '#fff',
      borderRadius: 8,
      padding: '12px 16px',
      marginBottom: 8,
      position: 'relative',
      border: '1px solid #e2e8f0',
      borderLeft: `3px solid ${category?.color ?? '#c4b5fd'}`,
    }}>
```

- [ ] **Step 2: 開発サーバーで動作確認**

- ログ画面（リスト表示）を開く
- 各カードの左ボーダーがカテゴリのパステルカラーで表示されること

- [ ] **Step 3: コミット**

```bash
git add src/features/logs/LogCard.tsx
git commit -m "feat: apply category color to LogCard left border"
```

---

## Task 7: `RecordingPage` 上部に保存ボタンを追加

**Files:**
- Modify: `src/features/recording/RecordingPage.tsx`

- [ ] **Step 1: フォーム展開ブロックの先頭に保存・削除ボタンを追加**

`RecordingPage.tsx` の `{(showForm || showExisting) && (` の行を見つけ、`<>` の直後かつ `{/* フィールド選択ボタン */}` の直前に以下を挿入する：

```typescript
              {/* 上部保存・削除ボタン */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={handleSave} style={{ flex: 1, padding: 12, background: '#ec4899', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                  {saved ? '✓ 保存しました！' : existingRecord ? '💾 上書き保存' : '💾 記録する'}
                </button>
                {showExisting && (
                  <button
                    onClick={handleDelete}
                    style={{ padding: '12px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                  >
                    削除
                  </button>
                )}
              </div>
```

挿入後の構造（概略）：
```
{(showForm || showExisting) && (
  <>
    {/* 上部保存・削除ボタン ← 今回挿入 */}
    <div>...</div>

    {/* フィールド選択ボタン ← 既存（変更なし） */}
    <div style={{ display: 'flex', flexWrap: 'wrap', ... }}>...</div>

    {/* 選択中フィールドの入力 ← 既存（変更なし） */}
    ...

    {/* 下部削除ボタン ← 既存（削除しない） */}
    {showExisting && <button onClick={handleDelete}>削除</button>}

    {/* 下部保存ボタン ← 既存（削除しない） */}
    <button onClick={handleSave}>💾 記録する</button>
  </>
)}
```

既存の下部保存ボタン・削除ボタンは **削除しない**（上下両方に表示）

- [ ] **Step 2: 開発サーバーで動作確認**

- 記録画面でフォームを展開する
- フィールド選択ボタンの上に保存ボタンが表示されること
- 上部・下部どちらの保存ボタンでも保存できること
- 既存レコード表示時は上部・下部に削除ボタンも表示されること

- [ ] **Step 3: 全テストを実行して回帰がないことを確認**

```bash
npm test -- --run
```

期待: 全テスト PASS

- [ ] **Step 4: 最終コミット**

```bash
git add src/features/recording/RecordingPage.tsx
git commit -m "feat: add save button at top of RecordingPage form"
```

---

## 完了確認チェックリスト

- [ ] `npm test -- --run` が全件 PASS
- [ ] `npx tsc --noEmit` でエラーなし
- [ ] カテゴリ編集画面：カラーパレットが12色表示される
- [ ] カテゴリ編集画面：フィールドの ↑↓ ボタンで並び順変更できる
- [ ] カテゴリ編集画面：先頭フィールドの ↑ が disabled、末尾の ↓ が disabled
- [ ] 記録画面：カテゴリボタンがパステルカラーで表示される
- [ ] 記録画面：フォーム展開時に上部にも保存ボタンが表示される
- [ ] ログ画面（リスト）：各カードの左ボーダーがカテゴリカラーで表示される
- [ ] カラー未設定の既存カテゴリはラベンダー (`#c4b5fd`) にフォールバックされる
