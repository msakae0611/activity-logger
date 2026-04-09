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
  const [fieldState, setFieldState] = useState<{ catId: string; field: string }>({
    catId: category.id,
    field: 'frequency',
  })
  const selectedField = fieldState.catId === category.id ? fieldState.field : 'frequency'
  const handleFieldSelect = (f: string) => setFieldState({ catId: category.id, field: f })
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
    <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 16px', marginBottom: 12, borderLeft: `4px solid ${categoryColor}` }}>
      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
        {category.icon} {category.name}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, color: '#94a3b8' }}>
        <span>🔥 連続 <strong style={{ color: '#f1f5f9' }}>{streak}日</strong></span>
        <span>
          今{periodLabel} <strong style={{ color: '#f1f5f9' }}>{recordedDays}/{totalDays}</strong>
          {period !== 'year' ? '日' : 'ヶ月'}
        </span>
      </div>

      {/* Field selector pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => handleFieldSelect('frequency')}
          style={{
            padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: selectedField === 'frequency' ? categoryColor : '#0f172a',
            color: selectedField === 'frequency' ? '#fff' : '#e2e8f0',
          }}
        >
          記録頻度
        </button>
        {numericFields.map(field => (
          <button
            key={field.key}
            onClick={() => handleFieldSelect(field.key)}
            style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: selectedField === field.key ? categoryColor : '#0f172a',
              color: selectedField === field.key ? '#fff' : '#e2e8f0',
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
              background: chartType === type ? '#334155' : '#0f172a',
              color: chartType === type ? '#fff' : '#94a3b8',
            }}
          >
            {type === 'bar' ? '棒' : '折れ線'}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length === 0 || chartData.every(p => !p[dataKey]) ? (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          この期間の記録はありません
        </div>
      ) : (
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} unit={yLabel ? ` ${yLabel}` : ''} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} formatter={(v: unknown) => [Number(v), selectedField === 'frequency' ? '記録' : yLabel]} />
                <Bar dataKey={dataKey} fill={categoryColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} unit={yLabel ? ` ${yLabel}` : ''} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} formatter={(v: unknown) => [Number(v), selectedField === 'frequency' ? '記録' : yLabel]} />
                <Line type="monotone" dataKey={dataKey} stroke={categoryColor} strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
