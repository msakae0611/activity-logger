# Dark Theme Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force dark theme across all pages on all devices by fixing hardcoded light colors in every component.

**Architecture:** Change `index.css` CSS variables to dark defaults and remove the `prefers-color-scheme` media query. Then fix hardcoded inline `style={}` colors in each component to use dark-mode equivalents. No CSS modules, no theme toggle — dark only.

**Tech Stack:** React + TypeScript + Vite, inline styles throughout

---

## File Map

| File | Change |
|------|--------|
| `src/index.css` | Dark CSS vars by default, remove media query, add body bg |
| `src/components/ui/BottomNav.tsx` | `#fff` → `#1e293b`, border dark |
| `src/components/ui/OfflineBanner.tsx` | Amber dark palette |
| `src/features/auth/LoginPage.tsx` | Input bg/color dark |
| `src/features/logs/LogCard.tsx` | Card bg/border/text dark |
| `src/features/logs/LogsPage.tsx` | Toggle bg, select border dark |
| `src/features/logs/CalendarView.tsx` | Many light pill/card/button colors |
| `src/features/logs/MiniCalendar.tsx` | Today-highlight color fix |
| `src/features/recording/RecordingPage.tsx` | Date box, delete button, field pills |
| `src/features/recording/DynamicForm.tsx` | All input bg/border |
| `src/features/categories/FieldEditor.tsx` | All borders, bg, move buttons |
| `src/features/categories/CategoryEditorPage.tsx` | Category name input, add-field button |
| `src/features/analytics/AnalyticsPage.tsx` | Period selector pills |
| `src/features/analytics/CategoryAnalytics.tsx` | Card bg, pills, chart grid color |
| `src/components/ui/SyncBadge.tsx` | Badge bg/color dark |

---

## Dark Color Reference

| Usage | Value |
|-------|-------|
| Page / input background | `#0f172a` |
| Card / surface | `#1e293b` |
| Border | `#334155` |
| Body text | `#e2e8f0` |
| Heading / bright text | `#f1f5f9` |
| Muted text | `#94a3b8` |
| Accent (indigo) | `#6366f1` |
| Danger red (keep) | `#ef4444` / `#fee2e2` bg → `#3f1010` |

---

## Task 1: Fix index.css — dark foundation

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace `:root` light variables with dark values and fix color-scheme**

Open `src/index.css` and replace the entire file with:

```css
:root {
  --text: #e2e8f0;
  --text-h: #f1f5f9;
  --bg: #0f172a;
  --border: #334155;
  --code-bg: #1e293b;
  --accent: #6366f1;
  --accent-bg: rgba(99, 102, 241, 0.15);
  --accent-border: rgba(99, 102, 241, 0.5);
  --social-bg: rgba(30, 41, 59, 0.5);
  --shadow:
    rgba(0, 0, 0, 0.4) 0 10px 15px -3px, rgba(0, 0, 0, 0.25) 0 4px 6px -2px;

  --sans: system-ui, 'Segoe UI', Roboto, sans-serif;
  --heading: system-ui, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, Consolas, monospace;

  font: 18px/145% var(--sans);
  letter-spacing: 0.18px;
  color-scheme: dark;
  color: var(--text);
  background: var(--bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  @media (max-width: 1024px) {
    font-size: 16px;
  }
}

#root {
  width: 1126px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  border-inline: 1px solid var(--border);
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0f172a;
}

h1,
h2 {
  font-family: var(--heading);
  font-weight: 500;
  color: var(--text-h);
}

h1 {
  font-size: 56px;
  letter-spacing: -1.68px;
  margin: 32px 0;
  @media (max-width: 1024px) {
    font-size: 36px;
    margin: 20px 0;
  }
}
h2 {
  font-size: 24px;
  line-height: 118%;
  letter-spacing: -0.24px;
  margin: 0 0 8px;
  @media (max-width: 1024px) {
    font-size: 20px;
  }
}
p {
  margin: 0;
}

code,
.counter {
  font-family: var(--mono);
  display: inline-flex;
  border-radius: 4px;
  color: var(--text-h);
}

code {
  font-size: 15px;
  line-height: 135%;
  padding: 4px 8px;
  background: var(--code-bg);
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/index.css && git commit -m "style: force dark theme in index.css"
```

---

## Task 2: Fix BottomNav and OfflineBanner

**Files:**
- Modify: `src/components/ui/BottomNav.tsx`
- Modify: `src/components/ui/OfflineBanner.tsx`

- [ ] **Step 1: Fix BottomNav**

Replace the `nav` style object in `src/components/ui/BottomNav.tsx`:

```tsx
export function BottomNav() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', background: '#1e293b',
      borderTop: '1px solid #334155',
      zIndex: 100,
    }}>
      {tabs.map(tab => (
        <NavLink
          key={tab.to} to={tab.to} end={tab.to === '/'}
          style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '8px 0',
            color: isActive ? '#6366f1' : '#94a3b8',
            textDecoration: 'none', fontSize: 11,
          })}
        >
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Fix OfflineBanner**

Replace the div style in `src/components/ui/OfflineBanner.tsx`:

```tsx
export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null
  return (
    <div style={{ background: '#78350f', color: '#fef3c7', padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>
      オフライン中 — 記録はローカルに保存されます
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/components/ui/BottomNav.tsx src/components/ui/OfflineBanner.tsx && git commit -m "style: dark theme for BottomNav and OfflineBanner"
```

---

## Task 3: Fix LogCard and LogsPage

**Files:**
- Modify: `src/features/logs/LogCard.tsx`
- Modify: `src/features/logs/LogsPage.tsx`

- [ ] **Step 1: Fix LogCard**

Replace the full `LogCard` function in `src/features/logs/LogCard.tsx`:

```tsx
export function LogCard({ record, category, onDelete }: LogCardProps) {
  const fields = Object.entries(record.values).slice(0, 3).map(([k, v]) => {
    const field = category?.fields.find(f => f.key === k)
    const label = field?.label ?? k
    const unit = field?.unit ? ` ${field.unit}` : ''
    const val = Array.isArray(v) ? v.join(', ') : String(v)
    return { label, val, unit }
  })

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 16px', marginBottom: 8, position: 'relative', border: '1px solid #334155', borderLeft: `3px solid ${category?.color ?? '#c4b5fd'}` }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>
        {category?.icon ?? '📌'} {category?.name ?? '不明'} — {formatDateTime(record.recorded_at)}
        {!record.synced && <span style={{ marginLeft: 8, fontSize: 11, color: '#f59e0b' }}>⏳未同期</span>}
      </div>
      <div style={{ fontSize: 12, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {fields.map(({ label, val, unit }) => (
          <span key={label}>
            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{label}：</span>
            <span style={{ fontWeight: 400, color: '#e2e8f0' }}>{val}{unit}</span>
          </span>
        ))}
      </div>
      <button onClick={() => onDelete(record.id)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
    </div>
  )
}
```

- [ ] **Step 2: Fix LogsPage**

In `src/features/logs/LogsPage.tsx`, change the view toggle and select styles:

Change the toggle container from `background: '#f1f5f9'` to `background: '#1e293b'`:
```tsx
<div style={{ display: 'flex', background: '#1e293b', borderRadius: 8, padding: 2 }}>
  {(['calendar', 'list'] as ViewMode[]).map(mode => (
    <button key={mode} onClick={() => setViewMode(mode)} style={{
      padding: '4px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
      background: viewMode === mode ? '#6366f1' : 'transparent',
      color: viewMode === mode ? '#fff' : '#e2e8f0',
    }}>
      {mode === 'calendar' ? '📅 カレンダー' : '📋 リスト'}
    </button>
  ))}
</div>
```

Change the filter select style:
```tsx
<select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 16, border: '1px solid #334155', borderRadius: 6, background: '#0f172a', color: '#e2e8f0' }}>
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/logs/LogCard.tsx src/features/logs/LogsPage.tsx && git commit -m "style: dark theme for LogCard and LogsPage"
```

---

## Task 4: Fix CalendarView

**Files:**
- Modify: `src/features/logs/CalendarView.tsx`

- [ ] **Step 1: Fix the day-detail panel border**

Change `borderTop: '1px solid #e2e8f0'` to `borderTop: '1px solid #334155'`:

```tsx
<div style={{ marginTop: 16, borderTop: '1px solid #334155', paddingTop: 12 }}>
```

- [ ] **Step 2: Fix the edit-mode toggle button (inactive state)**

Change `background: '#e0e7ff', color: '#4f46e5'` to `background: '#312e81', color: '#a5b4fc'`:

```tsx
<button
  onClick={() => { setEditingAll(e => !e); setAddingNew(false); setExpandedId(null) }}
  style={{ padding: '4px 12px', background: editingAll ? '#6366f1' : '#312e81', color: editingAll ? '#fff' : '#a5b4fc', border: 'none', borderRadius: 16, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
>✏️ 編集</button>
```

- [ ] **Step 3: Fix record pill buttons (inactive = collapsed)**

Find the record pill buttons (inside `selectedRecords?.map`). Change:
```tsx
background: isExpanded ? (cat?.color ?? '#6366f1') : '#f1f5f9',
color: isExpanded ? '#fff' : '#334155',
```
to:
```tsx
background: isExpanded ? (cat?.color ?? '#6366f1') : '#1e293b',
color: isExpanded ? '#fff' : '#e2e8f0',
```

- [ ] **Step 4: Fix edit form card**

Change `background: '#f8fafc'` to `background: '#1e293b'`:

```tsx
<div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${cat?.color ?? '#6366f1'}` }}>
```

- [ ] **Step 5: Fix cancel button in edit form**

Change `background: '#f1f5f9', color: '#475569'` to `background: '#334155', color: '#e2e8f0'`:

```tsx
<button onClick={() => setEditingId(null)} style={{ padding: '8px 16px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
```

- [ ] **Step 6: Fix record value pills (read-only)**

Find `const pillStyle = { ... background: '#f1f5f9', color: '#334155', ... }`. Change to:

```tsx
const pillStyle = { padding: '4px 10px', borderRadius: 20, border: 'none', background: '#1e293b', color: '#e2e8f0', fontSize: 12, whiteSpace: 'nowrap' as const, cursor: 'default' as const }
```

- [ ] **Step 7: Fix edit/delete action buttons on records**

Change:
```tsx
<button onClick={() => startEdit(record)} style={{ background: '#e0e7ff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#4f46e5' }}>編集</button>
<button onClick={() => deleteRecord(record.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>削除</button>
```
to:
```tsx
<button onClick={() => startEdit(record)} style={{ background: '#312e81', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#a5b4fc' }}>編集</button>
<button onClick={() => deleteRecord(record.id)} style={{ background: '#3f1010', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#f87171' }}>削除</button>
```

- [ ] **Step 8: Fix "add new" category pills (inactive)**

In the `addingNew` section, find category selector pills. Change:
```tsx
background: newCategoryId === c.id ? '#6366f1' : '#f1f5f9',
color: newCategoryId === c.id ? '#fff' : '#334155',
```
to:
```tsx
background: newCategoryId === c.id ? '#6366f1' : '#1e293b',
color: newCategoryId === c.id ? '#fff' : '#e2e8f0',
```

- [ ] **Step 9: Fix "add new" field pills (inactive)**

In the same `addingNew` section, find field selector pills. Change:
```tsx
background: isSelected ? '#ec4899' : isFilled ? '#6366f1' : '#f1f5f9',
color: isSelected || isFilled ? '#fff' : '#334155',
```
to:
```tsx
background: isSelected ? '#ec4899' : isFilled ? '#6366f1' : '#1e293b',
color: isSelected || isFilled ? '#fff' : '#e2e8f0',
```

- [ ] **Step 10: Fix cancel button in add-new form**

Change `background: '#f1f5f9', color: '#475569'` to `background: '#334155', color: '#e2e8f0'`:

```tsx
<button onClick={() => { setAddingNew(false); setNewFieldKey(null) }} style={{ padding: '8px 16px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
```

- [ ] **Step 11: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 12: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/logs/CalendarView.tsx && git commit -m "style: dark theme for CalendarView"
```

---

## Task 5: Fix MiniCalendar — today highlight

**Files:**
- Modify: `src/features/logs/MiniCalendar.tsx`

- [ ] **Step 1: Fix today's highlight color**

In `src/features/logs/MiniCalendar.tsx`, find the `td` style with `isToday ? '#ede9fe'`. Change:

```tsx
background: isSelected ? '#6366f1' : isToday ? '#ede9fe' : 'transparent',
outline: isToday && !isSelected ? '1px solid #6366f1' : 'none',
```
to:
```tsx
background: isSelected ? '#6366f1' : isToday ? '#312e81' : 'transparent',
outline: isToday && !isSelected ? '1px solid #6366f1' : 'none',
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/logs/MiniCalendar.tsx && git commit -m "style: fix today highlight color in MiniCalendar"
```

---

## Task 6: Fix RecordingPage

**Files:**
- Modify: `src/features/recording/RecordingPage.tsx`

- [ ] **Step 1: Fix the date display box**

Find the date display div (contains `recordedAt` and the calendar emoji). Change:
```tsx
<div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b', fontSize: 14, whiteSpace: 'nowrap' }}>
```
to:
```tsx
<div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', border: '1px solid #334155', borderRadius: 4, background: '#1e293b', color: '#e2e8f0', fontSize: 14, whiteSpace: 'nowrap' }}>
```

- [ ] **Step 2: Fix the field pills (unfilled state)**

In the field selector buttons section, change:
```tsx
background: isSelected ? '#ec4899' : isFilled ? '#6366f1' : '#f1f5f9',
color: isSelected || isFilled ? '#fff' : '#334155',
```
to:
```tsx
background: isSelected ? '#ec4899' : isFilled ? '#6366f1' : '#1e293b',
color: isSelected || isFilled ? '#fff' : '#e2e8f0',
```

- [ ] **Step 3: Fix the delete button**

Find the 削除 button (shows when `showExisting`). Change:
```tsx
style={{ width: '100%', padding: '10px', marginTop: 8, background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
```
to:
```tsx
style={{ width: '100%', padding: '10px', marginTop: 8, background: '#1e293b', color: '#f87171', border: '1px solid #3f1010', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
```

- [ ] **Step 4: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/recording/RecordingPage.tsx && git commit -m "style: dark theme for RecordingPage"
```

---

## Task 7: Fix DynamicForm

**Files:**
- Modify: `src/features/recording/DynamicForm.tsx`

- [ ] **Step 1: Fix all input/select/textarea element styles**

In `src/features/recording/DynamicForm.tsx`, replace all occurrences of `background: '#fff', color: '#1e293b'` with `background: '#0f172a', color: '#e2e8f0'`, and replace all `border: '1px solid #e2e8f0'` with `border: '1px solid #334155'`.

Apply these changes to:
- `number` input
- `text` input
- `textarea`
- `select`
- `duration` (time) input
- item-list sub-field number inputs

Each input style changes from:
```tsx
style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b' }}
```
to:
```tsx
style={{ width: '100%', padding: 8, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }}
```

For the item-list sub-field number input (inside the expanded entry div), change:
```tsx
style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', color: '#1e293b', boxSizing: 'border-box' }}
```
to:
```tsx
style={{ width: '100%', padding: '6px 8px', border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' }}
```

For the item-list expanded entry container border, change:
```tsx
<div key={itemName} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 8 }}>
```
to:
```tsx
<div key={itemName} style={{ border: '1px solid #334155', borderRadius: 8, padding: 10, marginBottom: 8 }}>
```

For the item-list expanded entry header text, change `color: '#334155'` to `color: '#e2e8f0'`:
```tsx
<div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#e2e8f0' }}>▼ {itemName}</div>
```

For the sub-field label text, change `color: '#64748b'` to `color: '#94a3b8'`:
```tsx
<div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>{sf.label}</div>
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/recording/DynamicForm.tsx && git commit -m "style: dark theme for DynamicForm inputs"
```

---

## Task 8: Fix FieldEditor and CategoryEditorPage

**Files:**
- Modify: `src/features/categories/FieldEditor.tsx`
- Modify: `src/features/categories/CategoryEditorPage.tsx`

- [ ] **Step 1: Fix FieldEditor outer container border**

Change the outer `div` border from `#e2e8f0` to `#334155`:
```tsx
<div style={{ border: '1px solid #334155', borderRadius: 8, padding: 12, marginBottom: 8 }}>
```

- [ ] **Step 2: Fix move-up/down buttons**

Replace the move button styles. Active (not disabled):
```tsx
style={{
  padding: '2px 6px', fontSize: 12, border: '1px solid #334155', borderRadius: 4,
  cursor: isFirst ? 'default' : 'pointer',
  background: isFirst ? '#0f172a' : '#1e293b',
  color: isFirst ? '#475569' : '#e2e8f0',
  lineHeight: 1, fontWeight: 700,
}}
```
And for the down button (replace `isFirst` with `isLast`):
```tsx
style={{
  padding: '2px 6px', fontSize: 12, border: '1px solid #334155', borderRadius: 4,
  cursor: isLast ? 'default' : 'pointer',
  background: isLast ? '#0f172a' : '#1e293b',
  color: isLast ? '#475569' : '#e2e8f0',
  lineHeight: 1, fontWeight: 700,
}}
```

- [ ] **Step 3: Fix FieldEditor inputs and textareas**

All `border: '1px solid #e2e8f0'` → `border: '1px solid #334155'` in `FieldEditor.tsx`.
Add `background: '#0f172a', color: '#e2e8f0'` to inputs/textareas/selects that don't already have a bg.

For the label input:
```tsx
<input
  placeholder="フィールド名"
  value={field.label}
  onChange={e => onChange({ ...field, label: e.target.value })}
  style={{ flex: 1, padding: 6, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }}
/>
```

For the type select:
```tsx
<select
  value={field.type}
  onChange={e => onChange({ ...field, type: e.target.value as FieldType })}
  style={{ padding: 6, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }}
>
```

For the unit input:
```tsx
<input
  placeholder="単位 (例: kg, h)"
  value={field.unit ?? ''}
  onChange={e => onChange({ ...field, unit: e.target.value })}
  style={{ width: '100%', padding: 6, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }}
/>
```

For all `textarea` elements (options, item-list):
```tsx
style={{ width: '100%', padding: 6, border: '1px solid #334155', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box', background: '#0f172a', color: '#e2e8f0' }}
```

For all sub-field label inputs inside `item-list`:
```tsx
style={{ flex: 1, padding: 6, border: '1px solid #334155', borderRadius: 4, background: '#0f172a', color: '#e2e8f0' }}
```

- [ ] **Step 4: Fix FieldEditor descriptive labels and "add subfield" button**

Change `color: '#64748b'` labels to `color: '#94a3b8'`:
```tsx
<div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>項目リスト（1行に1つ入力）</div>
```
```tsx
<div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>サブフィールド（数値入力欄）</div>
```
```tsx
<div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>選択肢（1行に1つ入力）</div>
```

Change the "add subfield" button:
```tsx
style={{ width: '100%', padding: 6, marginBottom: 8, background: '#1e293b', border: '1px dashed #94a3b8', borderRadius: 6, cursor: 'pointer', color: '#e2e8f0', fontSize: 13 }}
```

- [ ] **Step 5: Fix CategoryEditorPage remaining light colors**

In `src/features/categories/CategoryEditorPage.tsx`:

Fix category name input border (currently `#e2e8f0`):
```tsx
<input value={name} onChange={e => setName(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #334155', borderRadius: 4, marginTop: 4, boxSizing: 'border-box', background: '#0f172a', color: '#e2e8f0' }} />
```

Fix "add field" button (currently `background: '#f1f5f9', color: '#334155'`):
```tsx
<button onClick={addField} style={{ width: '100%', padding: 10, marginBottom: 16, background: '#1e293b', border: '1px dashed #94a3b8', borderRadius: 8, cursor: 'pointer', color: '#e2e8f0' }}>
  + フィールドを追加
</button>
```

- [ ] **Step 6: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 7: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/categories/FieldEditor.tsx src/features/categories/CategoryEditorPage.tsx && git commit -m "style: dark theme for FieldEditor and CategoryEditorPage"
```

---

## Task 9: Fix LoginPage

**Files:**
- Modify: `src/features/auth/LoginPage.tsx`

- [ ] **Step 1: Fix input style**

Find `const inputStyle: React.CSSProperties = { ... }`. Change:
```tsx
const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 10px',
  marginTop: 6,
  boxSizing: 'border-box',
  fontSize: 16,
  border: '1px solid #475569',
  borderRadius: 6,
  background: '#0f172a',
  color: '#e2e8f0',
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/auth/LoginPage.tsx && git commit -m "style: dark theme for LoginPage inputs"
```

---

## Task 10: Fix AnalyticsPage, CategoryAnalytics, and SyncBadge

**Files:**
- Modify: `src/features/analytics/AnalyticsPage.tsx`
- Modify: `src/features/analytics/CategoryAnalytics.tsx`
- Modify: `src/components/ui/SyncBadge.tsx`

- [ ] **Step 1: Fix AnalyticsPage period selector pills**

In `src/features/analytics/AnalyticsPage.tsx`, change inactive pill style:
```tsx
background: period === p.key ? '#6366f1' : '#1e293b',
color: period === p.key ? '#fff' : '#e2e8f0',
```

- [ ] **Step 2: Fix CategoryAnalytics card background**

In `src/features/analytics/CategoryAnalytics.tsx`, change the outer card div:
```tsx
<div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 16px', marginBottom: 12, borderLeft: `4px solid ${categoryColor}` }}>
```

- [ ] **Step 3: Fix CategoryAnalytics stats row text colors**

Change `color: '#475569'` → `color: '#94a3b8'` and `color: '#1e293b'` → `color: '#f1f5f9'`:
```tsx
<div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, color: '#94a3b8' }}>
  <span>🔥 連続 <strong style={{ color: '#f1f5f9' }}>{streak}日</strong></span>
  <span>
    今{periodLabel} <strong style={{ color: '#f1f5f9' }}>{recordedDays}/{totalDays}</strong>
    {period !== 'year' ? '日' : 'ヶ月'}
  </span>
</div>
```

- [ ] **Step 4: Fix CategoryAnalytics field selector pills (inactive)**

Change `background: '#f1f5f9', color: '#334155'` → `background: '#0f172a', color: '#e2e8f0'`:

For the 記録頻度 button:
```tsx
background: selectedField === 'frequency' ? categoryColor : '#0f172a',
color: selectedField === 'frequency' ? '#fff' : '#e2e8f0',
```

For the numeric field buttons:
```tsx
background: selectedField === field.key ? categoryColor : '#0f172a',
color: selectedField === field.key ? '#fff' : '#e2e8f0',
```

- [ ] **Step 5: Fix CategoryAnalytics chart type toggle**

Change `background: '#f1f5f9', color: '#64748b'` → `background: '#0f172a', color: '#94a3b8'`:
```tsx
background: chartType === type ? '#334155' : '#0f172a',
color: chartType === type ? '#fff' : '#94a3b8',
```

- [ ] **Step 6: Fix CategoryAnalytics chart grid line color**

Change `stroke="#f1f5f9"` → `stroke="#334155"` (appears twice — once in BarChart, once in LineChart):
```tsx
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
```

- [ ] **Step 7: Fix SyncBadge**

Replace the full SyncBadge component:
```tsx
export function SyncBadge({ count, syncing }: SyncBadgeProps) {
  if (count === 0 && !syncing) return null
  return (
    <span style={{ background: syncing ? '#1e3a5f' : '#78350f', color: syncing ? '#93c5fd' : '#fef3c7', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>
      {syncing ? '同期中...' : `⏳ ${count}件未同期`}
    </span>
  )
}
```

- [ ] **Step 8: Verify build passes**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

- [ ] **Step 9: Commit**

```bash
cd C:/Users/msaka/Documents/activity-logger && git add src/features/analytics/AnalyticsPage.tsx src/features/analytics/CategoryAnalytics.tsx src/components/ui/SyncBadge.tsx && git commit -m "style: dark theme for Analytics and SyncBadge"
```

---

## Task 11: Final build and deploy

- [ ] **Step 1: Run full build**

```bash
cd C:/Users/msaka/Documents/activity-logger && npm run build
```

Expected: Build succeeds, `dist/` updated.

- [ ] **Step 2: Deploy to Vercel**

```bash
cd C:/Users/msaka/Documents/activity-logger && npx vercel --prod
```

Expected: Deployment URL printed, app live on Vercel.

- [ ] **Step 3: Verify visually in browser**

Open `http://localhost:5173` (or the Vercel URL) in both desktop and smartphone browser (light OS mode). Confirm:
- Page background is dark (`#0f172a`)
- BottomNav is dark with no white flash
- All text is readable (light on dark)
- Analytics charts show dark grid lines
- Login page inputs are dark-background

- [ ] **Step 4: Verify on smartphone**

Open the deployed URL on smartphone browser (light OS mode). Confirm:
- Page background is dark (`#0f172a`)
- BottomNav is dark
- All text is readable (light on dark)
- Login page inputs are dark
- Recording page, Logs page, Analytics page all display dark
