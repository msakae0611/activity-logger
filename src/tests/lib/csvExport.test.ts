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

  it('multi-select フィールド: 選択肢ごとに列を分け ○ で表現', () => {
    const category = makeCategory({
      fields: [{ key: 'tags', label: 'タグ', type: 'multi-select', options: ['A', 'B', 'C'] }],
    })
    const records = [makeRecord({ values: { tags: ['A', 'C'] } })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,A,B,C')
    expect(lines[1]).toBe('2026-04-01,○,,○')
  })

  it('multi-select: 未選択は空文字', () => {
    const category = makeCategory({
      fields: [{ key: 'sym', label: '症状', type: 'multi-select', options: ['頭痛', '腹痛', '疲れ'] }],
    })
    const records = [makeRecord({ values: { sym: ['腹痛'] } })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,頭痛,腹痛,疲れ')
    expect(lines[1]).toBe('2026-04-01,,○,')
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

  it('item-list: 日次集約 — 1日1行、各アイテムが列になる', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        subFields: [
          { key: 'weight', label: '重さ' },
          { key: 'reps', label: '回数' },
        ],
        computedTotal: true,
      }],
    })
    const records = [makeRecord({
      values: {
        exercise: [
          { name: 'レッグプレス', weight: 150, reps: 3, total: 450 },
          { name: 'チェストプレス', weight: 80, reps: 3, total: 240 },
        ],
      },
    })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,レッグプレス,チェストプレス')
    expect(lines[1]).toBe('2026-04-01,450,240')
  })

  it('item-list: 同一日の複数レコードは合計値', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        subFields: [
          { key: 'weight', label: '重さ' },
          { key: 'reps', label: '回数' },
        ],
        computedTotal: true,
      }],
    })
    const records = [
      makeRecord({ id: 'r1', values: { exercise: [{ name: 'レッグプレス', weight: 150, reps: 3, total: 450 }] } }),
      makeRecord({ id: 'r2', values: { exercise: [{ name: 'レッグプレス', weight: 100, reps: 3, total: 300 }] } }),
    ]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,レッグプレス')
    expect(lines[1]).toBe('2026-04-01,750')
  })

  it('item-list: total 未保存は subFields から計算して集約', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
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
    expect(lines[1]).toBe('2026-04-01,800')
  })

  it('item-list: アイテムがない日はその列が空', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        subFields: [{ key: 'weight', label: '重さ' }],
        computedTotal: false,
      }],
    })
    const records = [
      makeRecord({ id: 'r1', recorded_at: '2026-04-01T12:00:00.000Z', values: { exercise: [{ name: 'レッグプレス', weight: 80 }] } }),
      makeRecord({ id: 'r2', recorded_at: '2026-04-02T12:00:00.000Z', values: { exercise: [{ name: 'チェストプレス', weight: 60 }] } }),
    ]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,レッグプレス,チェストプレス')
    expect(lines[1]).toBe('2026-04-01,80,')
    expect(lines[2]).toBe('2026-04-02,,60')
  })

  it('item-list: アイテムが空の記録はスキップ (日付行自体も出ない)', () => {
    const category = makeCategory({
      fields: [{
        key: 'exercise',
        label: '種目',
        type: 'item-list',
        subFields: [{ key: 'weight', label: '重さ' }],
        computedTotal: false,
      }],
    })
    const records = [makeRecord({ values: { exercise: [] } })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n').filter(Boolean)
    // header only
    expect(lines).toHaveLength(1)
  })

  it('item-list + 通常フィールド: 非item-listフィールドは当日最終値', () => {
    const category = makeCategory({
      fields: [
        { key: 'note', label: 'メモ', type: 'text' },
        {
          key: 'exercise',
          label: '種目',
          type: 'item-list',
          subFields: [{ key: 'weight', label: '重さ' }, { key: 'reps', label: '回数' }],
          computedTotal: true,
        },
      ],
    })
    const records = [makeRecord({
      values: {
        note: '快調',
        exercise: [{ name: 'レッグプレス', weight: 150, reps: 3, total: 450 }],
      },
    })]
    const csv = buildCsvContent(category, records)
    const lines = csv.replace('\uFEFF', '').split('\n')
    expect(lines[0]).toBe('日付,メモ,レッグプレス')
    expect(lines[1]).toBe('2026-04-01,快調,450')
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
