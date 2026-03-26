import Dexie, { type EntityTable } from 'dexie'
import type { Category, SyncQueueItem, Dashboard } from '../../types'
import type { Record as LogRecord } from '../../types'

export class AppDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  records!: EntityTable<LogRecord, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>
  dashboards!: EntityTable<Dashboard, 'id'>

  constructor() {
    super('ActivityLoggerDB')
    this.version(1).stores({
      categories: 'id, user_id, updated_at',
      records: 'id, category_id, user_id, recorded_at, synced, updated_at',
      syncQueue: '++id, table, created_at',
      dashboards: 'id, user_id, is_pinned, updated_at',
    })

    // IndexedDB cannot index boolean values; convert synced to 0/1 for indexing
    this.table('records').hook('creating', (_primKey, obj) => {
      if (typeof obj.synced === 'boolean') {
        ;(obj as unknown as Record<string, unknown>).synced = obj.synced ? 1 : 0
      }
    })

    this.table('records').hook('updating', (modifications) => {
      if ('synced' in modifications && typeof modifications.synced === 'boolean') {
        modifications.synced = modifications.synced ? 1 : 0
      }
    })
  }
}
