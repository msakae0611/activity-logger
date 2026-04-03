# Analytics Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an analytics page (`/analytics`) that shows per-category recording frequency and numeric field trends with week/month/year period switching and line/bar chart toggle.

**Architecture:** Three files under `src/features/analytics/`: a data hook (`useAnalyticsData.ts`) that computes chart data and streak stats from Dexie, a card component (`CategoryAnalytics.tsx`) that renders one category's stats and chart, and the page (`AnalyticsPage.tsx`) that wires period selection and maps over all categories.

**Tech Stack:** React, TypeScript, Dexie + dexie-react-hooks (`useLiveQuery`), Recharts (`BarChart`, `LineChart`, `ResponsiveContainer`), inline styles (no CSS framework)

---

### Task 1: Data hook — `useAnalyticsData`

**Files:**
- Create: `src/features/analytics/useAnalyticsData.ts`

This hook takes `userId`, `categoryId`, `fields[]`, and `period` (`'week' | 'month' | 'year'`), queries Dexie for records in range, and returns:
- `chartData`: array of `{ label: string; frequency: number; [fieldKey]: number }` — one entry per day (week/month) or month (year)
- `streak`: number of consecutive days ending today that have a record for this category
- `totalDays`: total days in the period
- `recordedDays`: how many days in the period have a record

- [ ] **Step 1: Create the file with types and skeleton**

```typescript
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

export function useAnalyticsData(
  userId: string,
  categoryId: string,
  fields: FieldDefinition[],
  period: Period
): AnalyticsData {
  // implemented in steps below
  return { chartData: [], streak: 0, totalDays: 0, recordedDays: 0 }
}
```

- [ ] **Step 2: Implement date range helpers inside the file**

Replace the skeleton return with the full implementation:

```typescript
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

    // Build a map: dateKey → record values (for week/month) or monthKey → records (for year)
    const recordedDaySet = new Set(records.map(r => r.recorded_at.slice(0, 10)))

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
```

- [ ] **Step 3: Commit**

```bash
git add src/features/analytics/useAnalyticsData.ts
git commit -m "feat: add useAnalyticsData hook for analytics page"
```

---

### Task 2: Category analytics card — `CategoryAnalytics`

**Files:**
- Create: `src/features/analytics/CategoryAnalytics.tsx`

Renders one category's stats row and Recharts chart. Props: `userId`, `category` (Category type), `categoryColor` (hex string), `period` (Period).

- [ ] **Step 1: Create the component**

```typescript
// src/features/analytics/CategoryAnalytics.tsx
import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useAnalyticsData } from './useAnalyticsData'
import type { Category } from '../../types'
import type { Period } from './useAnalyticsData'

interface Props {
  userId: string
  category: Category
  categoryColor: string
  period: Period
}

const NUMERIC_TYPES = new Set(['number', 'duration', 'rating'])

export function CategoryAnalytics({ userId, category, categoryColor, period }: Props) {
  const numericFields = category.fields.filter(f => NUMERIC_TYPES.has(f.type))
  const [selectedField, setSelectedField] = useState<string>('frequency')
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  const { chartData, streak, totalDays, recordedDays } = useAnalyticsData(
    userId, category.id, category.fields, period
  )

  const dataKey = selectedField === 'frequency' ? 'frequency' : selectedField
  const yLabel = selectedField === 'frequency'
    ? ''
    : numericFields.find(f => f.key === selectedField)?.unit ?? ''

  const periodLabel = period === 'week' ? '週' : period === 'month' ? '月' : '年'

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 12, borderLeft: `4px solid ${categoryColor}` }}>
      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
        {category.icon} {category.name}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, color: '#475569' }}>
        <span>🔥 連続 <strong style={{ color: '#1e293b' }}>{streak}日</strong></span>
        <span>
          今{periodLabel} <strong style={{ color: '#1e293b' }}>{recordedDays}/{totalDays}</strong>
          {period !== 'year' ? '日' : 'ヶ月'}
        </span>
      </div>

      {/* Field selector pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => setSelectedField('frequency')}
          style={{
            padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: selectedField === 'frequency' ? categoryColor : '#f1f5f9',
            color: selectedField === 'frequency' ? '#fff' : '#334155',
          }}
        >
          記録頻度
        </button>
        {numericFields.map(field => (
          <button
            key={field.key}
            onClick={() => setSelectedField(field.key)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: selectedField === field.key ? categoryColor : '#f1f5f9',
              color: selectedField === field.key ? '#fff' : '#334155',
            }}
          >
            {field.label}{field.unit ? ` (${field.unit})` : ''}
          </button>
        ))}
      </div>

      {/* Chart type toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['bar', 'line'] as const).map(type => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            style={{
              padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: chartType === type ? '#334155' : '#f1f5f9',
              color: chartType === type ? '#fff' : '#64748b',
            }}
          >
            {type === 'bar' ? '棒' : '折れ線'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} unit={yLabel ? ` ${yLabel}` : ''} />
              <Tooltip formatter={(v: number) => [v, selectedField === 'frequency' ? '記録' : yLabel]} />
              <Bar dataKey={dataKey} fill={categoryColor} radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} unit={yLabel ? ` ${yLabel}` : ''} />
              <Tooltip formatter={(v: number) => [v, selectedField === 'frequency' ? '記録' : yLabel]} />
              <Line type="monotone" dataKey={dataKey} stroke={categoryColor} strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/analytics/CategoryAnalytics.tsx
git commit -m "feat: add CategoryAnalytics card component"
```

---

### Task 3: Analytics page — `AnalyticsPage`

**Files:**
- Create: `src/features/analytics/AnalyticsPage.tsx`

Top-level page: period tabs (週/月/年), maps over all user categories, renders one `CategoryAnalytics` per category.

- [ ] **Step 1: Create the page**

```typescript
// src/features/analytics/AnalyticsPage.tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { useAuthContext } from '../auth/AuthContext'
import { CategoryAnalytics } from './CategoryAnalytics'
import type { Period } from './useAnalyticsData'

const DOT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]

export function AnalyticsPage() {
  const { user } = useAuthContext()
  const [period, setPeriod] = useState<Period>('month')

  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).sortBy('sort_order') : [],
    [user?.id]
  )

  if (!categories?.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
        <p>カテゴリがありません</p>
        <a href="/settings/categories" style={{ color: '#6366f1' }}>設定からカテゴリを追加</a>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>分析</h2>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            style={{
              flex: 1, padding: '8px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14,
              background: period === p.key ? '#6366f1' : '#f1f5f9',
              color: period === p.key ? '#fff' : '#334155',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Category cards */}
      {categories.map((cat, i) => (
        <CategoryAnalytics
          key={cat.id}
          userId={user!.id}
          category={cat}
          categoryColor={DOT_COLORS[i % DOT_COLORS.length]}
          period={period}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/analytics/AnalyticsPage.tsx
git commit -m "feat: add AnalyticsPage with period tabs and category cards"
```

---

### Task 4: Wire up and verify build

**Files:**
- Verify: `src/App.tsx` — import already present (`import { AnalyticsPage } from './features/analytics/AnalyticsPage'`)

- [ ] **Step 1: Confirm import is already in App.tsx**

`src/App.tsx` line 12 already has:
```typescript
import { AnalyticsPage } from './features/analytics/AnalyticsPage'
```
No change needed.

- [ ] **Step 2: Run build to verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds (pre-existing errors in `useSync.ts` and unused imports are unrelated — only check for new errors in `src/features/analytics/`).

- [ ] **Step 3: Run dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:5173/analytics` and verify:
- 週/月/年 tabs switch the chart data
- Each category shows a card with stats row
- 記録頻度 pill shows bar/line chart of recording days
- Numeric field pills (if any) show value trends
- 棒/折れ線 toggle switches chart type
- Empty state shows when no categories exist

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete analytics page with per-category charts and streak stats"
```
