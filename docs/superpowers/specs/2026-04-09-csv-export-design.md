# CSV Export Feature Design

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** カテゴリごとに記録データをCSVファイルとしてダウンロードできる機能を追加する。

**Architecture:** 純粋関数のCSV生成ユーティリティ (`csvExport.ts`) と専用エクスポートページ (`ExportPage.tsx`) を追加する。設定画面からナビゲートする。

**Tech Stack:** React, TypeScript, Dexie.js (IndexedDB), Blob/URL API (ファイルダウンロード)

---

## UI フロー

1. 設定画面 (`/settings`) に「CSVエクスポート」メニュー項目を追加
2. タップ → `/settings/export` ページへ遷移
3. ExportPage:
   - カテゴリ選択ボタン（記録画面と同じスタイル）
   - 開始日・終了日の入力（date input、空欄 = 全期間）
   - 「ダウンロード」ボタン

---

## ファイル構成

| ファイル | 変更種別 | 役割 |
|---|---|---|
| `src/lib/utils/csvExport.ts` | 新規作成 | CSV生成ロジック（純粋関数） |
| `src/features/settings/ExportPage.tsx` | 新規作成 | エクスポートUI |
| `src/features/settings/SettingsPage.tsx` | 修正 | 「CSVエクスポート」メニュー追加 |
| `src/App.tsx` | 修正 | `/settings/export` ルート追加 |

---

## CSV形式

### 通常フィールドのカテゴリ

ヘッダー行: `日付,[フィールドラベル1],[フィールドラベル2],...`

```
日付,体重,睡眠時間,メモ
2026-04-01,70.5,7.5,良好
2026-04-02,70.2,6.0,
```

- `boolean` フィールド: `true` → `はい`、`false` → `いいえ`
- `multi-select` フィールド: 選択肢を `|` で連結（例: `ランニング|筋トレ`）
- 値が未入力の場合: 空文字

### item-list フィールドのカテゴリ

item-list フィールドを持つカテゴリは、各アイテムを1行に展開する。同じカテゴリに item-list 以外のフィールドがある場合、それらの値を各行に繰り返す。

`computedTotal: true` の場合（subFields[0].value × subFields[1].value）、合計列を末尾に追加する。

```
日付,種目,重さ,回数,合計
2026-04-01,レッグプレス,80,10,800
2026-04-01,チェストプレス,60,12,720
2026-04-02,レッグプレス,85,8,680
```

item が記録されていない行はスキップする。

カテゴリに item-list フィールドが複数ある場合、最初の1つのみ行展開し、残りは JSON 文字列としてセルに格納する。

---

## ファイル名

形式: `{エクスポート実行日}_{カテゴリ名}_{期間}.csv`

- エクスポート実行日: `YYYYMMDD` 形式（例: `20260409`）
- 期間指定あり: `20260409_健康管理_2026-04-01_2026-04-30.csv`
- 全期間（日付未指定）: `20260409_健康管理_全データ.csv`

---

## 文字コード・ダウンロード

- UTF-8 BOM付き（`\uFEFF` プレフィックス）— ExcelおよびWindowsで日本語が文字化けしない
- `Blob` + `URL.createObjectURL` + `<a>` タグの `.click()` でダウンロード
- スマホ（iOS Safari / Android Chrome）でも動作する標準的な手法

---

## csvExport.ts インターフェース

```typescript
export function buildCsvContent(
  category: Category,
  records: LogRecord[],  // 日付フィルタ済み
): string

export function downloadCsv(
  content: string,
  filename: string,
): void

export function buildFilename(
  categoryName: string,
  fromDate: string | null,  // 'YYYY-MM-DD' or null
  toDate: string | null,    // 'YYYY-MM-DD' or null
  today: string,            // 'YYYYMMDD'
): string
```

---

## データ取得

ExportPage は Dexie から直接取得する（useLiveQuery は不要、ボタン押下時に一度だけ取得）:

```typescript
const records = await db.records
  .where('category_id').equals(selectedCategoryId)
  .filter(r => {
    const date = r.recorded_at.slice(0, 10)
    if (fromDate && date < fromDate) return false
    if (toDate && date > toDate) return false
    return true
  })
  .sortBy('recorded_at')
```

---

## エラーハンドリング

- カテゴリ未選択でダウンロードボタン押下: ボタンを disabled にする
- 対象期間にデータが0件: 「該当期間にデータがありません」をUIに表示してダウンロードしない
- 開始日 > 終了日: 「開始日は終了日より前にしてください」を表示

---

## テスト対象

`buildCsvContent` の単体テスト（`src/tests/lib/csvExport.test.ts`）:
- 通常フィールドのみのカテゴリ
- item-list フィールド（computedTotal なし）
- item-list フィールド（computedTotal あり）
- boolean フィールドの変換（true→はい、false→いいえ）
- multi-select フィールドの変換（`|` 連結）
- 空値の処理
