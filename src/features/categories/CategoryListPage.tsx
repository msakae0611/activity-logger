import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../../lib/db/db'
import { deleteCategory } from './useCategoryDb'
import { useAuthContext as useAuth } from '../auth/AuthContext'
import { signOut } from '../../lib/supabase/auth'

export function CategoryListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).sortBy('sort_order') : [],
    [user?.id]
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>カテゴリ設定</h2>
        <button onClick={() => navigate('/settings/categories/new')} style={{ padding: '8px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          + 追加
        </button>
      </div>
      {categories?.map(cat => (
        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#1e293b', borderRadius: 8, marginBottom: 8, border: '1px solid #334155' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{cat.icon} {cat.name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate(`/settings/categories/${cat.id}`)} style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>編集</button>
            <button onClick={() => deleteCategory(cat.id)} style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>削除</button>
          </div>
        </div>
      ))}
      <button onClick={() => signOut()} style={{ marginTop: 24, width: '100%', padding: 10, background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
        ログアウト
      </button>
    </div>
  )
}
