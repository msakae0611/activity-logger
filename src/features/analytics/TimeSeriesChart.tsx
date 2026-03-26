import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TimeSeriesPoint } from './useAnalytics'

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[]
  chartType?: 'line' | 'bar'
  color?: string
}

export function TimeSeriesChart({ data, chartType = 'line', color = '#6366f1' }: TimeSeriesChartProps) {
  if (data.length === 0) return <p style={{ color: '#94a3b8', textAlign: 'center' }}>データがありません</p>

  const ChartComponent = chartType === 'bar' ? BarChart : LineChart
  const DataComponent = chartType === 'bar' ? Bar : Line

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ChartComponent data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <DataComponent dataKey="value" stroke={color} fill={color} dot={false} />
      </ChartComponent>
    </ResponsiveContainer>
  )
}
