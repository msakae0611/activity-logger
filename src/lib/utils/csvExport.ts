import type { Category, FieldDefinition } from '../../types'
import type { Record as LogRecord } from '../../types'

type ItemEntry = { name: string; total?: number; [subFieldKey: string]: unknown }

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function formatValue(value: unknown, field: FieldDefinition): string {
  if (value === null || value === undefined) return ''
  if (field.type === 'boolean') {
    return value ? 'はい' : 'いいえ'
  }
  if (field.type === 'multi-select') {
    if (Array.isArray(value)) return value.join('|')
    return String(value)
  }
  return String(value)
}

function getDatePart(isoString: string): string {
  // Extract YYYY-MM-DD from ISO8601 string
  return isoString.substring(0, 10)
}

export function buildCsvContent(category: Category, records: LogRecord[]): string {
  const BOM = '\uFEFF'

  // Find first item-list field
  const itemListField = category.fields.find(f => f.type === 'item-list')
  const nonItemListFields = category.fields.filter(f => f.type !== 'item-list')

  const rows: string[] = []

  if (!itemListField) {
    // Standard mode: one row per record
    const headerCells = ['日付', ...category.fields.map(f => f.label)]
    rows.push(headerCells.map(escapeCell).join(','))

    for (const record of records) {
      const date = getDatePart(record.recorded_at)
      const cells = [date, ...category.fields.map(f => {
        const raw = formatValue(record.values[f.key], f)
        return escapeCell(raw)
      })]
      rows.push(cells.join(','))
    }
  } else {
    // Item-list mode: one row per item entry
    const subFields = itemListField.subFields ?? []
    const headerCells = [
      '日付',
      ...nonItemListFields.map(f => f.label),
      '種目',
      ...subFields.map(sf => sf.label),
    ]
    if (itemListField.computedTotal) {
      headerCells.push('合計')
    }
    rows.push(headerCells.map(escapeCell).join(','))

    for (const record of records) {
      const date = getDatePart(record.recorded_at)
      const items = (record.values[itemListField.key] as ItemEntry[] | undefined) ?? []
      if (!Array.isArray(items) || items.length === 0) continue

      for (const item of items) {
        const cells = [
          date,
          ...nonItemListFields.map(f => escapeCell(formatValue(record.values[f.key], f))),
          escapeCell(item.name ?? ''),
          ...subFields.map(sf => escapeCell(String(item[sf.key] ?? ''))),
        ]

        if (itemListField.computedTotal) {
          let total: string
          if (item.total !== undefined) {
            total = String(item.total)
          } else if (subFields.length >= 2) {
            const v0 = Number(item[subFields[0].key] ?? 0)
            const v1 = Number(item[subFields[1].key] ?? 0)
            total = String(v0 * v1)
          } else {
            total = ''
          }
          cells.push(escapeCell(total))
        }

        rows.push(cells.join(','))
      }
    }
  }

  return BOM + rows.join('\n')
}

export function buildFilename(
  categoryName: string,
  fromDate: string | null,
  toDate: string | null,
  today: string
): string {
  if (fromDate === null && toDate === null) {
    return `${today}_${categoryName}_全データ.csv`
  }

  let period: string
  if (fromDate !== null && toDate !== null) {
    period = `${fromDate}_${toDate}`
  } else if (fromDate !== null) {
    period = `${fromDate}_`
  } else {
    // toDate only
    period = `_${toDate}`
  }

  return `${today}_${categoryName}_${period}.csv`
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
