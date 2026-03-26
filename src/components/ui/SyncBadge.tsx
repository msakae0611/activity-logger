interface SyncBadgeProps { count: number; syncing: boolean }

export function SyncBadge({ count, syncing }: SyncBadgeProps) {
  if (count === 0 && !syncing) return null
  return (
    <span style={{ background: syncing ? '#bfdbfe' : '#fef3c7', color: syncing ? '#1e40af' : '#92400e', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>
      {syncing ? '同期中...' : `⏳ ${count}件未同期`}
    </span>
  )
}
