import ExcelJS from 'exceljs'
import type { Category, FieldDefinition } from '../../types'
import type { Record as LogRecord } from '../../types'

type ItemEntry = { name: string; total?: number; [subFieldKey: string]: unknown }
type ItemListSubField = { key: string; label: string }

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
}

function formatValue(value: unknown, field: FieldDefinition): string | number {
  if (value === null || value === undefined) return ''
  if (field.type === 'boolean') return value === true ? 'はい' : value === false ? 'いいえ' : ''
  if ((field.type === 'number' || field.type === 'duration' || field.type === 'rating') && typeof value === 'number' && !isNaN(value)) {
    return value
  }
  return String(value)
}

function getDatePart(isoString: string): string {
  return isoString.substring(0, 10)
}

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 22
}

function autoFitColumns(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach(col => {
    if (!col.eachCell) return
    let maxLen = 8
    col.eachCell({ includeEmpty: false }, cell => {
      const val = cell.value == null ? '' : String(cell.value)
      if (val.length > maxLen) maxLen = val.length
    })
    const adjusted = Math.min(maxLen * 1.4, 50)
    col.width = adjusted
  })
}

function isNumericField(field: FieldDefinition): boolean {
  return field.type === 'number' || field.type === 'rating'
}

function sanitizeSheetName(name: string): string {
  // Excel sheet name: max 31 chars, no :/\?*[]
  return name.replace(/[:/\\?*[\]]/g, '_').slice(0, 31)
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

// --- Sheet builders ---

function buildSimpleSheet(
  sheet: ExcelJS.Worksheet,
  field: FieldDefinition,
  records: LogRecord[],
): void {
  sheet.addRow(['日付', field.label])
  applyHeaderStyle(sheet.lastRow!)

  for (const record of records) {
    sheet.addRow([getDatePart(record.recorded_at), formatValue(record.values[field.key], field)])
  }

  if (isNumericField(field)) {
    sheet.getColumn(2).numFmt = '#,##0.##'
  }
}

function buildMultiSelectSheet(
  sheet: ExcelJS.Worksheet,
  field: FieldDefinition,
  records: LogRecord[],
): void {
  const options = collectMultiSelectOptions(field, records)

  sheet.addRow(['日付', ...options])
  applyHeaderStyle(sheet.lastRow!)

  for (const record of records) {
    const selected = new Set<string>(
      Array.isArray(record.values[field.key])
        ? (record.values[field.key] as unknown[]).map(String)
        : [],
    )
    sheet.addRow([
      getDatePart(record.recorded_at),
      ...options.map(opt => (selected.has(opt) ? '○' : '')),
    ])
  }
}

function buildItemListSheet(
  sheet: ExcelJS.Worksheet,
  field: FieldDefinition,
  records: LogRecord[],
): void {
  const subFields = field.subFields ?? []
  const itemNames = collectItemNames(field, records)

  sheet.addRow(['日付', ...itemNames])
  applyHeaderStyle(sheet.lastRow!)

  // Aggregate by date
  const dateOrder: string[] = []
  const dateMap = new Map<string, Map<string, number>>()

  for (const record of records) {
    const date = getDatePart(record.recorded_at)
    if (!dateMap.has(date)) {
      dateMap.set(date, new Map())
      dateOrder.push(date)
    }
    const dayMap = dateMap.get(date)!
    const items = (record.values[field.key] as ItemEntry[] | undefined) ?? []
    for (const item of items) {
      if (!item.name) continue
      const total = computeItemTotal(item, subFields)
      dayMap.set(item.name, (dayMap.get(item.name) ?? 0) + (isNaN(total) ? 0 : total))
    }
  }

  for (const date of dateOrder) {
    const dayMap = dateMap.get(date)!
    sheet.addRow([
      date,
      ...itemNames.map(name => {
        const v = dayMap.get(name)
        return v !== undefined ? v : ''
      }),
    ])
  }

  // Number format for item columns
  for (let i = 0; i < itemNames.length; i++) {
    sheet.getColumn(2 + i).numFmt = '#,##0.##'
  }
}

// --- Main export ---

export async function buildXlsxBuffer(category: Category, records: LogRecord[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'activity-logger'
  workbook.created = new Date()

  for (const field of category.fields) {
    const sheetName = sanitizeSheetName(field.label)
    const sheet = workbook.addWorksheet(sheetName)

    if (field.type === 'item-list') {
      buildItemListSheet(sheet, field, records)
    } else if (field.type === 'multi-select') {
      buildMultiSelectSheet(sheet, field, records)
    } else {
      buildSimpleSheet(sheet, field, records)
    }

    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    autoFitColumns(sheet)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}

export function buildXlsxFilename(
  categoryName: string,
  fromDate: string | null,
  toDate: string | null,
  today: string,
): string {
  if (fromDate === null && toDate === null) {
    return `${today}_${categoryName}_全データ.xlsx`
  }
  let period: string
  if (fromDate !== null && toDate !== null) {
    period = `${fromDate}_${toDate}`
  } else if (fromDate !== null) {
    period = `${fromDate}_`
  } else {
    period = `_${toDate}`
  }
  return `${today}_${categoryName}_${period}.xlsx`
}

export function downloadXlsx(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
