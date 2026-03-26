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
  streak: number  // 連続記録日数
}

export function computeTimeSeries(records: LogRecord[], fieldKey: string): TimeSeriesPoint[] {
  return records
    .filter(r => r.values[fieldKey] !== undefined)
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .map(r => ({
      date: r.recorded_at.slice(0, 10),
      value: Number(r.values[fieldKey]),
    }))
}

export function computeStats(records: LogRecord[], fieldKey: string): Stats {
  const values = records
    .map(r => Number(r.values[fieldKey]))
    .filter(v => !isNaN(v))

  if (values.length === 0) return { avg: 0, max: 0, min: 0, sum: 0, count: 0, streak: 0 }

  const sum = values.reduce((a, b) => a + b, 0)
  const sorted = [...records].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))

  // 連続記録日数を計算
  let streak = 0
  let prevDate = ''
  for (const r of sorted) {
    const date = r.recorded_at.slice(0, 10)
    if (!prevDate) { streak = 1; prevDate = date; continue }
    const prev = new Date(prevDate)
    const curr = new Date(date)
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diffDays === 1) { streak++; prevDate = date } else break
  }

  return {
    avg: sum / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
    sum,
    count: values.length,
    streak,
  }
}
