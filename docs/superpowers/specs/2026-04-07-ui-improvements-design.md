# UI改善 設計ドキュメント

**日付:** 2026-04-07  
**対象アプリ:** LifeLog PWA（activity-logger）  
**スコープ:** 3つのUI改善を同一PRで実装

---

## 概要

以下の3つのUI改善を実装する。

1. フィールド並び順の変更（カテゴリ編集画面に上下ボタン）
2. 記録画面の上部に保存ボタン追加
3. カテゴリボタンのパステルカラー分け

---

## 機能1：フィールド並び順変更

### 要件
- カテゴリ編集画面（`CategoryEditorPage`）で、フィールドの順番を上下ボタンで入れ替えられる

### 設計

**`CategoryEditorPage.tsx` への変更：**
- `moveField(index: number, direction: 'up' | 'down')` 関数を追加
  - `direction === 'up'`: `fields[index]` と `fields[index-1]` を入れ替え
  - `direction === 'down'`: `fields[index]` と `fields[index+1]` を入れ替え
  - 先頭要素の ↑ ボタン、末尾要素の ↓ ボタンは disabled

**`FieldEditor.tsx` への変更：**
- props に `onMoveUp?: () => void`、`onMoveDown?: () => void`、`isFirst: boolean`、`isLast: boolean` を追加
- フィールドヘッダー部分に `↑` `↓` ボタンを表示
- `isFirst` のとき ↑ を disabled、`isLast` のとき ↓ を disabled

### データ永続化
- `fields` 配列の順序がそのまま `Category.fields` として保存される（既存の仕組みを利用）

---

## 機能2：記録画面の上部保存ボタン

### 要件
- フィールドが多い場合にスクロールせず保存できるよう、フォーム展開時の先頭にも保存ボタンを表示する

### 設計

**`RecordingPage.tsx` への変更：**
- `(showForm || showExisting)` ブロックの先頭（フィールド選択ボタンの直前）に保存ボタンを追加
- ボタンのスタイル・`onClick`・表示テキストは既存の下部ボタンと同一
- `showExisting` 時は削除ボタンも上部に追加（下部と対称にする）

---

## 機能3：カテゴリボタンのパステルカラー分け

### 要件
- カテゴリごとに色を設定し、記録画面・ログ画面のカテゴリボタンで視覚的に区別できる

### データモデル変更

**`src/types/index.ts`：**
```ts
export interface Category {
  // ...既存フィールド...
  color?: string  // 追加：パステルカラーの hex 値
}
```

IndexedDB（Dexie）はスキーマレスなので既存レコードへの影響なし。未設定時はデフォルト色にフォールバック。

### パレット（12色）

| 色名 | コード |
|------|--------|
| ラベンダー | `#c4b5fd` |
| ピーチ | `#fca5a5` |
| ミント | `#6ee7b7` |
| スカイ | `#7dd3fc` |
| バター | `#fde68a` |
| ブロッサム | `#f9a8d4` |
| セージ | `#a7f3d0` |
| ピーチオレンジ | `#fdba74` |
| パウダーブルー | `#a5f3fc` |
| リラック | `#d8b4fe` |
| シャンパン | `#fcd34d` |
| スモークピンク | `#fbb6ce` |

### カラー選択UI

**`CategoryEditorPage.tsx`：**
- アイコン選択の直下に「カラー」セクションを追加
- 12色の丸いスウォッチを横並びに表示
- 選択中の色にチェックマーク（`✓`）を表示
- デフォルト：パレット先頭の `#c4b5fd`（ラベンダー）

### カラー適用箇所

**`RecordingPage.tsx`（カテゴリ選択ボタン）：**
- 非選択時：`background: cat.color ?? '#c4b5fd'`、`color: '#1e293b'`、`opacity: 0.5`
- 選択時：`background: cat.color ?? '#c4b5fd'`、`color: '#1e293b'`、`opacity: 1.0`、`fontWeight: 700`

**`LogCard.tsx`（カードの左ボーダー）：**
- 現在 `borderLeft: '3px solid #6366f1'` 固定 → `borderLeft: \`3px solid ${category?.color ?? '#c4b5fd'}\`` に変更
- `LogsPage` の `<select>` フィルターはそのまま（変更対象外）

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/types/index.ts` | `Category` に `color?: string` 追加 |
| `src/features/categories/CategoryEditorPage.tsx` | カラーパレット選択UI、`moveField` 関数、`FieldEditor` に移動ボタン props 渡す |
| `src/features/categories/FieldEditor.tsx` | `onMoveUp`/`onMoveDown`/`isFirst`/`isLast` props、上下ボタン表示 |
| `src/features/recording/RecordingPage.tsx` | 上部保存ボタン追加、カテゴリボタンに `cat.color` 適用 |
| `src/features/logs/LogsPage.tsx` | カテゴリフィルターにカラー適用 |
| `src/features/logs/LogCard.tsx` | カテゴリバッジにカラー適用 |

---

## 非機能要件

- 既存レコード・カテゴリデータへの後方互換性を維持（`color` 未設定はフォールバック）
- 新規ライブラリ追加なし
- TypeScript 型エラーなし
