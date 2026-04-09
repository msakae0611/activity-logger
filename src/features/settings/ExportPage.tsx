import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import { useAuthContext as useAuth } from '../auth/AuthContext'
import { buildCsvContent, buildFilename, downloadCsv } from '../../lib/utils/csvExport'

export function ExportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const categories = useLiveQuery(
    () => user ? db.categories.where('user_id').equals(user.id).sortBy('sort_order') : [],
    [user?.id]
  )

  const selectedCategory = categories?.find(c => c.id === selectedId)

  const handleDownload = async () => {
    if (!selectedCategory || !user) return
    setError(null)

    if (fromDate && toDate && fromDate > toDate) {
      setError('開始日は終了日より前にしてください')
      return
    }

    setLoading(true)
    try {
      const records = await db.records
        .where('category_id').equals(selectedId)
        .filter(r => {
          const date = r.recorded_at.slice(0, 10)
          if (fromDate && date < fromDate) return false
          if (toDate && date > toDate) return false
          return true
        })
        .sortBy('recorded_at')

      if (records.length === 0) {
        setError('該当期間にデータがありません')
        return
      }

      const d = new Date()
      const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      const content = buildCsvContent(selectedCategory, records)
      const filename = buildFilename(
        selectedCategory.name,
        fromDate || null,
        toDate || null,
        today,
      )
      downloadCsv(content, filename)
    } catch {
      setError('エクスポートに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    border: '1px solid #334155',
    borderRadius: 6,
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: 16, background: '#0f172a', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => navigate('/settings')}
            style={{ padding: '8px 12px', background: 'none', border: '1px solid #94a3b8', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}
          >
            ← 戻る
          </button>
        </div>
        <h2 style={{ margin: 0, textAlign: 'center' }}>CSVエクスポート</h2>
        <div />
      </div>

      {/* Category selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#f1f5f9' }}>
          カテゴリを選択
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4, paddingBottom: 4 }}>
          {categories?.map(cat => {
            const catColor = cat.color ?? '#c4b5fd'
            const isSelected = selectedId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedId(cat.id); setError(null) }}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap', background: catColor, color: '#1e293b',
                  fontWeight: isSelected ? 700 : 400, opacity: isSelected ? 1 : 0.55,
                }}
              >
                {cat.icon} {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Date range */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#f1f5f9' }}>
          期間（空欄 = 全データ）
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setError(null) }}
            style={inputStyle}
          />
          <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontSize: 14 }}>〜</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setError(null) }}
            style={inputStyle}
          />
        </div>
      </div>

      {error && (
        <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>{error}</p>
      )}

      <button
        onClick={handleDownload}
        disabled={!selectedId || loading}
        style={{
          width: '100%', padding: 14,
          background: !selectedId ? '#1e293b' : '#6366f1',
          color: !selectedId ? '#64748b' : '#fff',
          border: 'none', borderRadius: 8,
          cursor: (!selectedId || loading) ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontWeight: 700, fontSize: 16,
        }}
      >
        {loading ? '生成中...' : '📥 CSVをダウンロード'}
      </button>
    </div>
  )
}
