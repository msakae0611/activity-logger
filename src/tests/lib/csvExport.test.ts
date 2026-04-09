import { describe, it, expect } from 'vitest'
import { buildCsvContent, buildFilename } from '../../lib/utils/csvExport'
import type { Category } from '../../types'
import type { Record as LogRecord } from '../../types'

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
        exercise: [{ name: 'レッグプレス', weight: 80, reps: 10 }],
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
    expect(lines).toHaveLength(1)
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
