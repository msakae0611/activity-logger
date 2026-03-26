import type { Stats } from './useAnalytics'

interface StatsSummaryProps {
  stats: Stats
  unit?: string
}

export function StatsSummary({ stats, unit = '' }: StatsSummaryProps) {
  const items = [
    { label: '平均', value: `${stats.avg.toFixed(1)}${unit}` },
    { label: '合計', value: `${stats.sum.toFixed(1)}${unit}` },
    { label: '最大', value: `${stats.max}${unit}` },
    { label: '最小', value: `${stats.min}${unit}` },
    { label: '記録数', value: `${stats.count}回` },
    { label: '連続記録', value: `${stats.streak}日` },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {items.map(item => (
        <div key={item.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#334155' }}>{item.value}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}
