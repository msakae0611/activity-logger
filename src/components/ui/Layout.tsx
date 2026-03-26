import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'
import { useSync } from '../../lib/sync/useSync'

interface LayoutProps { children: React.ReactNode }

export function Layout({ children }: LayoutProps) {
  const { isOnline } = useSync()
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 72 }}>
      <OfflineBanner isOnline={isOnline} />
      {children}
      <BottomNav />
    </div>
  )
}
