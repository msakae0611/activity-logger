import { BottomNav } from './BottomNav'

interface LayoutProps { children: React.ReactNode }

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 72 }}>
      {children}
      <BottomNav />
    </div>
  )
}
