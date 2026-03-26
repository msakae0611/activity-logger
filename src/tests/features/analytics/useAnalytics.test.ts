import { describe, it, expect } from 'vitest'
import { computeTimeSeries, computeStats } from '../../../features/analytics/useAnalytics'
import type { Record as LogRecord } from '../../../types'

const records: LogRecord[] = [
  { id: 'r1', category_id: 'c1', user_id: 'u1', recorded_at: '2026-03-23T00:00:00Z', values: { work_hours: 8 }, synced: true, updated_at: '' },
  { id: 'r2', category_id: 'c1', user_id: 'u1', recorded_at: '2026-03-24T00:00:00Z', values: { work_hours: 6 }, synced: true, updated_at: '' },
  { id: 'r3', category_id: 'c1', user_id: 'u1', recorded_at: '2026-03-25T00:00:00Z', values: { work_hours: 9 }, synced: true, updated_at: '' },
]

describe('computeTimeSeries', () => {
  it('指定フィールドの時系列データを返す', () => {
    const series = computeTimeSeries(records, 'work_hours')
    expect(series).toHaveLength(3)
    expect(series[0].value).toBe(8)
    expect(series[2].value).toBe(9)
  })
})

describe('computeStats', () => {
  it('平均・最大・最小・合計を計算する', () => {
    const stats = computeStats(records, 'work_hours')
    expect(stats.avg).toBeCloseTo(7.67, 1)
    expect(stats.max).toBe(9)
    expect(stats.min).toBe(6)
    expect(stats.sum).toBe(23)
    expect(stats.count).toBe(3)
  })
})
