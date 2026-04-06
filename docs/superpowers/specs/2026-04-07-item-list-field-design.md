# item-list フィールドタイプ設計

**日付**: 2026-04-07  
**ステータス**: 承認済み

## 概要

ジムのマシン記録など「複数の項目それぞれに数値を入力し、合計を自動計算する」ユースケースに対応する汎用フィールドタイプ `item-list` を追加する。

## データ構造

### `types/index.ts` への追加

```ts
export type FieldType =
  | 'number' | 'text' | 'textarea' | 'select'
  | 'multi-select' | 'boolean' | 'duration' | 'rating'
  | 'item-list'

export interface ItemListSubField {
  key: string    // 例: 'weight', 'reps'
  label: string  // 例: 'レベル', '回数'
}

// FieldDefinition に追加
// subFields?: ItemListSubField[]
// computedTotal?: boolean
```

### `Record.values` 保存形式

フィールドキーに対して項目の配列を格納する。既存の `{ [key: string]: unknown }` 型に収まる。

```json
{
  "gym_machines": [
    { "name": "レッグプレス", "weight": 30, "reps": 15, "total": 450 },
    { "name": "チェストプレス", "weight": 20, "reps": 12, "total": 240 }
  ]
}
```

`total` は `computedTotal: true` のとき `subFields[0].value × subFields[1].value` で自動計算。どちらかが未入力の場合は `total` を省略する。

## UI 設計

### カテゴリ設定画面（`FieldEditor.tsx`）

`item-list` タイプを選択した場合、追加設定欄を表示：

1. **項目リスト**（1行1項目のtextarea）— `FieldDefinition.options` に格納
2. **サブフィールド定義** — ラベル入力 + 削除ボタン + 「追加」ボタン。`FieldDefinition.subFields` に格納
3. **合計自動計算チェックボックス** — `FieldDefinition.computedTotal` に格納。サブフィールドが2つ以上あるときのみ有効

### 記録画面（`DynamicForm.tsx`）

1. 項目名をピルボタンで表示。タップで選択（選択済みは紫、未選択はグレー）
2. 選択された項目の下にサブフィールド入力欄を展開表示
3. `computedTotal: true` かつ全サブフィールドに値がある場合、「合計: 450」をリアルタイム表示
4. ピルを再タップまたは `✕` で選択解除、その項目のデータをクリア

## 変更対象ファイル

| ファイル | 変更内容 |
|---|---|
| `src/types/index.ts` | `ItemListSubField` 型追加、`FieldDefinition` に `subFields`・`computedTotal` 追加、`FieldType` に `'item-list'` 追加 |
| `src/features/categories/FieldEditor.tsx` | `item-list` 選択時の設定UI追加 |
| `src/features/recording/DynamicForm.tsx` | `item-list` レンダリング追加 |
| `src/tests/features/recording/DynamicForm.test.tsx` | `item-list` のレンダリングと合計計算のテストケース追加 |

## 影響範囲（変更なし）

- `RecordingPage.tsx` — `DynamicForm` を呼ぶだけなので透過
- `CategoryEditorPage.tsx` — `FieldEditor` を呼ぶだけなので透過
- DB層・Sync層 — `Record.values` の型は変わらないため対応不要
