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
