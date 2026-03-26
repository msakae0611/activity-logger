import type { Record as LogRecord, Category } from '../../types'
import { formatDateTime } from '../../lib/utils/dates'

interface LogCardProps {
  record: LogRecord
  category?: Category
  onDelete: (id: string) => void
}

export function LogCard({ record, category, onDelete }: LogCardProps) {
  const preview = Object.entries(record.values)
    .slice(0, 3)
    .map(([k, v]) => {
      const field = category?.fields.find(f => f.key === k)
      const label = field?.label ?? k
      const unit = field?.unit ? ` ${field.unit}` : ''
      return `${label}: ${v}${unit}`
    })
    .join(' / ')

  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 8, borderLeft: `3px solid #6366f1`, position: 'relative' }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>
        {category?.icon ?? '📌'} {category?.name ?? '不明'} — {formatDateTime(record.recorded_at)}
        {!record.synced && <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b' }}>⏳未同期</span>}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{preview}</div>
      <button onClick={() => onDelete(record.id)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
    </div>
  )
}
