import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'
import { useSync } from '../../lib/sync/useSync'

interface LayoutProps { children: React.ReactNode }

export function Layout({ children }: LayoutProps) {
  const { isOnline } = useSync()
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 72, background: '#0f172a', minHeight: '100vh' }}>
      <OfflineBanner isOnline={isOnline} />
      {children}
      <BottomNav />
    </div>
  )
}
