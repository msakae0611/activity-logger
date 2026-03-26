export function toISOString(date: Date = new Date()): string {
  return date.toISOString()
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
