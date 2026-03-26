import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db/db'
import * as HolidayJp from '@holiday-jp/holiday_jp'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
const DOT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

interface Props {
  userId: string
  selectedDate: string // YYYY-MM-DD
  onDateSelect: (date: string) => void
}

export function MiniCalendar({ userId, selectedDate, onDateSelect }: Props) {
  const today = new Date()
  const initYear = selectedDate ? parseInt(selectedDate.slice(0, 4)) : today.getFullYear()
  const initMonth = selectedDate ? parseInt(selectedDate.slice(5, 7)) - 1 : today.getMonth()
  const [year, setYear] = useState(initYear)
  const [month, setMonth] = useState(initMonth)
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const monthStart = new Date(year, month, 1).toISOString()
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  const categories = useLiveQuery(
    () => db.categories.where('user_id').equals(userId).sortBy('sort_order'),
    [userId]
  )

  const records = useLiveQuery(async () => {
    const all = await db.records.where('user_id').equals(userId).toArray()
    return all.filter(r => r.recorded_at >= monthStart && r.recorded_at <= monthEnd)
  }, [userId, year, month])

  const categoryColorMap = Object.fromEntries(
    (categories ?? []).map((c, i) => [c.id, DOT_COLORS[i % DOT_COLORS.length]])
  )

  const recordsByDate: Record<string, string[]> = {}
  for (const r of records ?? []) {
    const key = r.recorded_at.slice(0, 10)
    if (!recordsByDate[key]) recordsByDate[key] = []
    if (!recordsByDate[key].includes(r.category_id)) recordsByDate[key].push(r.category_id)
  }

  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7 // 月曜始まり: Mon=0 ... Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = today.toLocaleDateString('sv-SE')

  // Build rows of 7 cells
  const totalCells = firstDay + daysInMonth
  const rows: (number | null)[][] = []
  let row: (number | null)[] = []
  for (let i = 0; i < Math.ceil(totalCells / 7) * 7; i++) {
    const day = i < firstDay || i >= totalCells ? null : i - firstDay + 1
    row.push(day)
    if (row.length === 7) { rows.push(row); row = [] }
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div style={{ border: '3px solid #2e303a', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6366f1', padding: '0 8px' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{year}年{month + 1}月</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6366f1', padding: '0 8px' }}>›</button>
      </div>

      <div style={{ position: 'relative' }}>
      {tooltip && (
        <div style={{
          position: 'absolute', top: tooltip.y, left: tooltip.x,
          background: '#1e293b', color: '#fff', fontSize: 11, padding: '2px 6px',
          borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
          transform: 'translate(-50%, -100%)',
        }}>{tooltip.name}</div>
      )}
      <table ref={tableRef} style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {WEEKDAYS.map((d, i) => (
              <th key={d} style={{
                fontSize: 11, fontWeight: 600, paddingBottom: 4, textAlign: 'center',
                color: i === 6 ? '#ef4444' : i === 5 ? '#3b82f6' : '#fff',
              }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((day, ci) => {
                if (!day) return <td key={ci} />
                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const catIds = recordsByDate[key] ?? []
                const isToday = key === todayKey
                const isSelected = key === selectedDate
                const dow = ci % 7
                const isHoliday = HolidayJp.isHoliday(new Date(key))
                const holidayName = isHoliday ? HolidayJp.between(new Date(key), new Date(key))[0]?.name : null
                const isRed = dow === 6 || isHoliday
                return (
                  <td
                    key={key}
                    onClick={() => onDateSelect(key)}
                    onMouseEnter={holidayName ? (e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      const tableRect = tableRef.current!.getBoundingClientRect()
                      setTooltip({ name: holidayName, x: rect.right - tableRect.left, y: rect.top - tableRect.top })
                    } : undefined}
                    onMouseLeave={holidayName ? () => setTooltip(null) : undefined}
                    style={{
                      textAlign: 'center', cursor: 'pointer', padding: '2px 0',
                      borderRadius: 6,
                      background: isSelected ? '#6366f1' : isToday ? '#ede9fe' : 'transparent',
                      outline: isToday && !isSelected ? '1px solid #6366f1' : 'none',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      fontSize: 13, fontWeight: isToday ? 700 : 400,
                      color: isSelected ? '#fff' : isRed ? '#ef4444' : dow === 5 ? '#3b82f6' : '#fff',
                    }}>{day}{isHoliday && <span style={{ fontSize: 7, verticalAlign: 'super', marginLeft: 1 }}>●</span>}</div>
                    <div style={{ height: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                      {catIds.slice(0, 3).map(cid => (
                        <div key={cid} style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: isSelected ? '#fff' : (categoryColorMap[cid] ?? '#6366f1') }} />
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
