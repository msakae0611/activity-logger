interface SyncBadgeProps { count: number; syncing: boolean }

export function SyncBadge({ count, syncing }: SyncBadgeProps) {
  if (count === 0 && !syncing) return null
  return (
    <span style={{ background: syncing ? '#1e3a5f' : '#78350f', color: syncing ? '#93c5fd' : '#fef3c7', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>
      {syncing ? '同期中...' : `⏳ ${count}件未同期`}
    </span>
  )
}
