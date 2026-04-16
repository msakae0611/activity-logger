import ExcelJS from 'exceljs'
import type { Category, FieldDefinition } from '../../types'
import type { Record as LogRecord } from '../../types'

type ItemEntry = { name: string; total?: number; [subFieldKey: string]: unknown }

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
  if (field.type === 'multi-select') {
    return Array.isArray(value) ? value.join(', ') : String(value)
  }
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
    // Japanese characters count double in width
    const adjusted = Math.min(maxLen * 1.4, 50)
    col.width = adjusted
  })
}

function isNumericField(field: FieldDefinition): boolean {
  return field.type === 'number' || field.type === 'rating'
}


export async function buildXlsxBuffer(category: Category, records: LogRecord[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'activity-logger'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(category.name)

  const itemListField = category.fields.find(f => f.type === 'item-list')
  const nonItemListFields = category.fields.filter(f => f.type !== 'item-list')

  if (!itemListField) {
    // --- Standard mode: one row per record ---
    const headers = ['日付', ...category.fields.map(f => f.label)]
    sheet.addRow(headers)
    applyHeaderStyle(sheet.lastRow!)

    for (const record of records) {
      const date = getDatePart(record.recorded_at)
      const cells: (string | number)[] = [
        date,
        ...category.fields.map(f => formatValue(record.values[f.key], f)),
      ]
      sheet.addRow(cells)
    }

    // Number format for numeric columns
    category.fields.forEach((f, i) => {
      if (isNumericField(f)) {
        const colIndex = i + 2 // 1-based, first col is 日付
        sheet.getColumn(colIndex).numFmt = '#,##0.##'
      }
    })
  } else {
    // --- Item-list mode: one row per item ---
    const subFields = itemListField.subFields ?? []
    const headers: string[] = [
      '日付',
      ...nonItemListFields.map(f => f.label),
      '種目',
      ...subFields.map(sf => sf.label),
    ]
    if (itemListField.computedTotal && subFields.length >= 2) {
      headers.push('合計')
    }
    sheet.addRow(headers)
    applyHeaderStyle(sheet.lastRow!)

    const nonItemOffset = 2 + nonItemListFields.length // after 日付 + nonItemList cols
    const subFieldStartCol = nonItemOffset + 1          // after 種目 col

    for (const record of records) {
      const date = getDatePart(record.recorded_at)
      const items = (record.values[itemListField.key] as ItemEntry[] | undefined) ?? []
      if (!Array.isArray(items) || items.length === 0) continue

      for (const item of items) {
        const cells: (string | number)[] = [
          date,
          ...nonItemListFields.map(f => formatValue(record.values[f.key], f)),
          item.name ?? '',
          ...subFields.map(sf => {
            const v = item[sf.key]
            return (typeof v === 'number' && !isNaN(v)) ? v : (v == null ? '' : String(v))
          }),
        ]

        if (itemListField.computedTotal && subFields.length >= 2) {
          const total = item.total !== undefined
            ? item.total
            : Number(item[subFields[0].key] ?? 0) * Number(item[subFields[1].key] ?? 0)
          cells.push(typeof total === 'number' && !isNaN(total) ? total : '')
        }

        sheet.addRow(cells)
      }
    }

    // Number format for subfield and total columns
    subFields.forEach((_, i) => {
      sheet.getColumn(subFieldStartCol + i).numFmt = '#,##0.##'
    })
    if (itemListField.computedTotal && subFields.length >= 2) {
      sheet.getColumn(subFieldStartCol + subFields.length).numFmt = '#,##0.##'
    }
    nonItemListFields.forEach((f, i) => {
      if (isNumericField(f)) {
        sheet.getColumn(2 + i).numFmt = '#,##0.##'
      }
    })
  }

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  autoFitColumns(sheet)

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
