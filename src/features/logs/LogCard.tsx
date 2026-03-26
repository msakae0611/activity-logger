import type { Record as LogRecord, Category } from '../../types'
import { formatDateTime } from '../../lib/utils/dates'

interface LogCardProps {
  record: LogRecord
  category?: Category
  onDelete: (id: string) => void
}

export function LogCard({ record, category, onDelete }: LogCardProps) {
  const fields = Object.entries(record.values).slice(0, 3).map(([k, v]) => {
    const field = category?.fields.find(f => f.key === k)
    const label = field?.label ?? k
    const unit = field?.unit ? ` ${field.unit}` : ''
    const val = Array.isArray(v) ? v.join(', ') : String(v)
    return { label, val, unit }
  })

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 16px', marginBottom: 8, borderLeft: `3px solid #6366f1`, position: 'relative', border: '1px solid #334155', borderLeftWidth: 3 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>
        {category?.icon ?? '📌'} {category?.name ?? '不明'} — {formatDateTime(record.recorded_at)}
        {!record.synced && <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b' }}>⏳未同期</span>}
      </div>
      <div style={{ fontSize: 12, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {fields.map(({ label, val, unit }) => (
          <span key={label}>
            <span style={{ fontWeight: 700, color: '#000' }}>{label}：</span>
            <span style={{ fontWeight: 400, color: '#334155' }}>{val}{unit}</span>
          </span>
        ))}
      </div>
      <button onClick={() => onDelete(record.id)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
    </div>
  )
}
