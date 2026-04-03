// src/features/analytics/useAnalyticsData.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import type { FieldDefinition } from '../../types'

export type Period = 'week' | 'month' | 'year'

export interface ChartPoint {
  label: string
  frequency: number
  [key: string]: string | number
}

export interface AnalyticsData {
  chartData: ChartPoint[]
  streak: number
  totalDays: number
  recordedDays: number
}

function toDateKey(date: Date): string {
  return date.toLocaleDateString('sv-SE') // YYYY-MM-DD
}

function getPeriodRange(period: Period): { from: Date; to: Date; buckets: Date[] } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (period === 'week') {
    const from = new Date(today)
    from.setDate(today.getDate() - 6)
    const buckets: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      buckets.push(d)
    }
    return { from, to: today, buckets }
  }

  if (period === 'month') {
    const from = new Date(today)
    from.setDate(today.getDate() - 29)
    const buckets: Date[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      buckets.push(d)
    }
    return { from, to: today, buckets }
  }

  // year: last 12 months
  const buckets: Date[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    buckets.push(d)
  }
  const from = buckets[0]
  return { from, to: today, buckets }
}

function bucketLabel(date: Date, period: Period): string {
  if (period === 'week') {
    return date.toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' })
  }
  if (period === 'month') {
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })
}

function computeStreak(recordedDaySet: Set<string>): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  const cursor = new Date(today)
  while (recordedDaySet.has(toDateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function useAnalyticsData(
  userId: string,
  categoryId: string,
  fields: FieldDefinition[],
  period: Period
): AnalyticsData {
  const numericFields = fields.filter(f =>
    f.type === 'number' || f.type === 'duration' || f.type === 'rating'
  )

  const data = useLiveQuery(async () => {
    if (!userId || !categoryId) return null

    const { from, to, buckets } = getPeriodRange(period)
    const fromISO = from.toISOString().slice(0, 10)
    const toISO = to.toISOString().slice(0, 10) + 'T23:59:59'

    const records = await db.records
      .where('user_id').equals(userId)
      .filter(r => r.category_id === categoryId &&
        r.recorded_at >= fromISO &&
        r.recorded_at <= toISO)
      .toArray()

    // Separate unbounded query for streak — not limited to the chart period window
    const allCatRecords = await db.records
      .where('user_id').equals(userId)
      .filter(r => r.category_id === categoryId)
      .toArray()

    // Build a map: dateKey → record values (for week/month) or monthKey → records (for year)
    const recordedDaySet = new Set(allCatRecords.map(r => r.recorded_at.slice(0, 10)))

    const chartData: ChartPoint[] = buckets.map(bucket => {
      const point: ChartPoint = { label: bucketLabel(bucket, period), frequency: 0 }

      if (period === 'year') {
        const monthKey = `${bucket.getFullYear()}-${String(bucket.getMonth() + 1).padStart(2, '0')}`
        const monthRecords = records.filter(r => r.recorded_at.startsWith(monthKey))
        point.frequency = monthRecords.length
        for (const field of numericFields) {
          const vals = monthRecords
            .map(r => Number(r.values[field.key]))
            .filter(v => !isNaN(v) && v !== 0)
          point[field.key] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0
        }
      } else {
        const dayKey = toDateKey(bucket)
        const dayRecords = records.filter(r => r.recorded_at.startsWith(dayKey))
        point.frequency = dayRecords.length > 0 ? 1 : 0
        for (const field of numericFields) {
          const vals = dayRecords
            .map(r => Number(r.values[field.key]))
            .filter(v => !isNaN(v) && v !== 0)
          point[field.key] = vals.length > 0 ? vals[vals.length - 1] : 0
        }
      }

      return point
    })

    const totalDays = period === 'year' ? 12 : period === 'month' ? 30 : 7
    const recordedDays = period === 'year'
      ? buckets.filter(b => {
          const monthKey = `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, '0')}`
          return records.some(r => r.recorded_at.startsWith(monthKey))
        }).length
      : buckets.filter(b => recordedDaySet.has(toDateKey(b))).length

    const streak = computeStreak(recordedDaySet)

    return { chartData, streak, totalDays, recordedDays }
  }, [userId, categoryId, period, fields.map(f => f.key).join(',')])

  return data ?? { chartData: [], streak: 0, totalDays: 0, recordedDays: 0 }
}
