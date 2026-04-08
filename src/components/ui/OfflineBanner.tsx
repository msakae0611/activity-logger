interface OfflineBannerProps { isOnline: boolean }

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null
  return (
    <div style={{ background: '#78350f', color: '#fef3c7', padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>
      オフライン中 — 記録はローカルに保存されます
    </div>
  )
}
