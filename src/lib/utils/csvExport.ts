import type { Category, FieldDefinition } from '../../types'
import type { Record as LogRecord } from '../../types'

type ItemEntry = { name: string; total?: number; [subFieldKey: string]: unknown }
type ItemListSubField = { key: string; label: string }

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function formatValue(value: unknown, field: FieldDefinition): string {
  if (value === null || value === undefined) return ''
  if (field.type === 'boolean') {
    return value === true ? 'はい' : value === false ? 'いいえ' : ''
  }
  return String(value)
}

function getDatePart(isoString: string): string {
  return isoString.substring(0, 10)
}

/** Collect all unique multi-select options (from field definition, then from records) */
function collectMultiSelectOptions(field: FieldDefinition, records: LogRecord[]): string[] {
  const opts = new Set<string>(field.options ?? [])
  for (const record of records) {
    const val = record.values[field.key]
    if (Array.isArray(val)) val.forEach(v => opts.add(String(v)))
  }
  return Array.from(opts)
}

/** Collect all unique item names from item-list records */
function collectItemNames(field: FieldDefinition, records: LogRecord[]): string[] {
  const names = new Set<string>()
  for (const record of records) {
    const items = (record.values[field.key] as ItemEntry[] | undefined) ?? []
    for (const item of items) {
      if (item.name) names.add(item.name)
    }
  }
  return Array.from(names)
}

/** Compute item total from a single item entry */
function computeItemTotal(item: ItemEntry, subFields: ItemListSubField[]): number {
  if (typeof item.total === 'number' && !isNaN(item.total)) return item.total
  if (subFields.length >= 2) {
    return Number(item[subFields[0].key] ?? 0) * Number(item[subFields[1].key] ?? 0)
  }
  if (subFields.length === 1) {
    return Number(item[subFields[0].key] ?? 0)
  }
  return 0
}

export function buildCsvContent(category: Category, records: LogRecord[]): string {
  const BOM = '\uFEFF'
  const rows: string[] = []

  const itemListField = category.fields.find(f => f.type === 'item-list')
  const nonItemListFields = category.fields.filter(f => f.type !== 'item-list')

  if (!itemListField) {
    // --- Standard mode: one row per record, multi-select expanded ---

    // Build headers
    const headerCells: string[] = ['日付']
    for (const field of category.fields) {
      if (field.type === 'multi-select') {
        headerCells.push(...collectMultiSelectOptions(field, records))
      } else {
        headerCells.push(field.label)
      }
    }
    rows.push(headerCells.map(escapeCell).join(','))

    // Build data rows
    for (const record of records) {
      const cells: string[] = [getDatePart(record.recorded_at)]
      for (const field of category.fields) {
        if (field.type === 'multi-select') {
          const options = collectMultiSelectOptions(field, records)
          const selected = new Set<string>(
            Array.isArray(record.values[field.key])
              ? (record.values[field.key] as unknown[]).map(String)
              : [],
          )
          cells.push(...options.map(opt => escapeCell(selected.has(opt) ? '○' : '')))
        } else {
          cells.push(escapeCell(formatValue(record.values[field.key], field)))
        }
      }
      rows.push(cells.join(','))
    }
  } else {
    // --- Item-list mode: aggregate by date (1 row per day) ---
    const subFields = itemListField.subFields ?? []
    const itemNames = collectItemNames(itemListField, records)

    // Build headers: 日付 + non-item-list fields (multi-select expanded) + item name columns
    const headerCells: string[] = ['日付']
    for (const field of nonItemListFields) {
      if (field.type === 'multi-select') {
        headerCells.push(...collectMultiSelectOptions(field, records))
      } else {
        headerCells.push(field.label)
      }
    }
    headerCells.push(...itemNames)
    rows.push(headerCells.map(escapeCell).join(','))

    // Aggregate records by date
    const dateOrder: string[] = []
    const dateRecords = new Map<string, LogRecord[]>()
    const dateItemTotals = new Map<string, Map<string, number>>()

    for (const record of records) {
      const date = getDatePart(record.recorded_at)
      if (!dateRecords.has(date)) {
        dateRecords.set(date, [])
        dateItemTotals.set(date, new Map())
        dateOrder.push(date)
      }
      dateRecords.get(date)!.push(record)

      const dayTotals = dateItemTotals.get(date)!
      const items = (record.values[itemListField.key] as ItemEntry[] | undefined) ?? []
      for (const item of items) {
        if (!item.name) continue
        const total = computeItemTotal(item, subFields)
        dayTotals.set(item.name, (dayTotals.get(item.name) ?? 0) + (isNaN(total) ? 0 : total))
      }
    }

    // Build data rows (skip dates with no item entries)
    for (const date of dateOrder) {
      const recordsForDay = dateRecords.get(date)!
      const lastRecord = recordsForDay[recordsForDay.length - 1]
      const dayTotals = dateItemTotals.get(date)!
      if (dayTotals.size === 0) continue

      const cells: string[] = [date]

      for (const field of nonItemListFields) {
        if (field.type === 'multi-select') {
          const options = collectMultiSelectOptions(field, records)
          // Union: ○ if selected in any record of the day
          const selected = new Set<string>()
          for (const r of recordsForDay) {
            const val = r.values[field.key]
            if (Array.isArray(val)) val.forEach(v => selected.add(String(v)))
          }
          cells.push(...options.map(opt => escapeCell(selected.has(opt) ? '○' : '')))
        } else {
          cells.push(escapeCell(formatValue(lastRecord.values[field.key], field)))
        }
      }

      // Item totals
      cells.push(...itemNames.map(name => {
        const v = dayTotals.get(name)
        return escapeCell(v !== undefined ? String(v) : '')
      }))

      rows.push(cells.join(','))
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
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
