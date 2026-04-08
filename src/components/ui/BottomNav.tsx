import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '記録', icon: '✏️' },
  { to: '/logs', label: 'ログ', icon: '📋' },
  { to: '/analytics', label: '分析', icon: '📊' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', background: '#1e293b',
      borderTop: '1px solid #334155',
      zIndex: 100,
    }}>
      {tabs.map(tab => (
        <NavLink
          key={tab.to} to={tab.to} end={tab.to === '/'}
          style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '8px 0',
            color: isActive ? '#6366f1' : '#94a3b8',
            textDecoration: 'none', fontSize: 11,
          })}
        >
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
