// src/features/analytics/useAnalytics.ts
// Pure utility functions for analytics computations (used in tests and components)
import type { Record as LogRecord } from '../../types'

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface Stats {
  avg: number
  max: number
  min: number
  sum: number
  count: number
}

export function computeTimeSeries(records: LogRecord[], field: string): TimeSeriesPoint[] {
  return records
    .filter(r => r.values[field] !== undefined && r.values[field] !== null)
    .map(r => ({
      date: r.recorded_at.slice(0, 10),
      value: Number(r.values[field]),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function computeStats(records: LogRecord[], field: string): Stats {
  const values = records
    .map(r => Number(r.values[field]))
    .filter(v => !isNaN(v))

  if (values.length === 0) {
    return { avg: 0, max: 0, min: 0, sum: 0, count: 0 }
  }

  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length
  const max = Math.max(...values)
  const min = Math.min(...values)

  return { avg, max, min, sum, count: values.length }
}
