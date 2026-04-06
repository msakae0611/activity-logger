// src/types/index.ts

export type FieldType =
  | 'number'
  | 'text'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'boolean'
  | 'duration'
  | 'rating'
  | 'item-list'

export interface ItemListSubField {
  key: string    // 例: 'weight', 'reps'
  label: string  // 例: 'レベル', '回数'
}

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required?: boolean
  unit?: string             // type=number用
  options?: string[]        // type=select, multi-select用
  subFields?: ItemListSubField[]   // item-list 専用
  computedTotal?: boolean          // true なら subFields[0].value × subFields[1].value を自動計算
}

export interface Category {
  id: string                // UUID
  user_id: string
  name: string
  icon: string
  fields: FieldDefinition[]
  sort_order: number
  updated_at: string        // ISO8601
}

export interface Record {
  id: string                // UUID（クライアント生成）
  category_id: string
  user_id: string
  recorded_at: string       // ISO8601
  values: { [key: string]: unknown }
  synced: boolean           // Dexie.jsのみ
  updated_at: string
}

export type SyncOperation = 'insert' | 'update' | 'delete'
export type SyncTable = 'records' | 'categories' | 'dashboards'

export interface SyncQueueItem {
  id: string
  table: SyncTable
  operation: SyncOperation
  payload: string           // JSON文字列
  created_at: string
}

export interface WidgetDefinition {
  id: string
  type: 'timeseries' | 'stat' | 'calendar'
  title: string
  category_id?: string
  field_key?: string
  chart_type?: 'line' | 'bar' | 'area'
  period?: 'week' | 'month' | 'year'
  position: { x: number; y: number; w: number; h: number }
}

export interface Dashboard {
  id: string
  user_id: string
  name: string
  widgets: WidgetDefinition[]
  is_pinned: boolean
  updated_at: string
}
