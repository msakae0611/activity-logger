import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { useAuthContext as useAuth } from '../auth/AuthContext'
import { computeTimeSeries, computeStats } from './useAnalytics'
import { TimeSeriesChart } from './TimeSeriesChart'
import { StatsSummary } from './StatsSummary'

export function AnalyticsPage() {
  const { user } = useAuth()
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).toArray() : [],
    [user?.id]
  )

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId)
  const numericFields = selectedCategory?.fields.filter(f =>
    ['number', 'duration', 'rating'].includes(f.type)
  ) ?? []

  const records = useLiveQuery(async () => {
    if (!selectedCategoryId || !user) return []
    return db.records.where('category_id').equals(selectedCategoryId).toArray()
  }, [selectedCategoryId, user?.id]) ?? []

  const seriesData = selectedField ? computeTimeSeries(records, selectedField) : []
  const stats = selectedField ? computeStats(records, selectedField) : null
  const unit = selectedCategory?.fields.find(f => f.key === selectedField)?.unit

  return (
    <div style={{ padding: 16 }}>
      <h2>分析</h2>
      <div style={{ marginBottom: 12 }}>
        <select value={selectedCategoryId} onChange={e => { setSelectedCategoryId(e.target.value); setSelectedField('') }}
          style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 8 }}>
          <option value="">カテゴリを選択</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        {numericFields.length > 0 && (
          <select value={selectedField} onChange={e => setSelectedField(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <option value="">フィールドを選択</option>
            {numericFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        )}
      </div>

      {seriesData.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['line', 'bar'] as const).map(t => (
              <button key={t} onClick={() => setChartType(t)} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', background: chartType === t ? '#6366f1' : '#f1f5f9', color: chartType === t ? '#fff' : '#334155' }}>
                {t === 'line' ? '折れ線' : '棒グラフ'}
              </button>
            ))}
          </div>
          <TimeSeriesChart data={seriesData} chartType={chartType} />
          {stats && <div style={{ marginTop: 16 }}><StatsSummary stats={stats} unit={unit} /></div>}
        </>
      )}

      {!selectedCategoryId && <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 32 }}>カテゴリとフィールドを選択してグラフを表示</p>}
    </div>
  )
}
