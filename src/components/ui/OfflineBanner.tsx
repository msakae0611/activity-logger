interface OfflineBannerProps { isOnline: boolean }

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null
  return (
    <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>
      オフライン中 — 記録はローカルに保存されます
    </div>
  )
}
