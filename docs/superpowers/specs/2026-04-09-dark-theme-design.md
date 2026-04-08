# Dark Theme Unification — Design Spec

**Date:** 2026-04-09  
**Status:** Approved  
**Scope:** Force dark theme across all devices/pages of the LifeLog PWA

---

## Problem

The app uses `prefers-color-scheme: dark` in `index.css` to switch themes, but all components use hardcoded inline `style={}` with light-mode colors (`#fff`, `#e2e8f0`, `#1e293b` as text, etc.). These inline styles are unaffected by CSS media queries, so smartphones in light mode display the app with light backgrounds and unreadable text.

---

## Approach

Approach A: Force dark theme as the single fixed theme.

1. Update `index.css` CSS variables to dark values by default, remove the `prefers-color-scheme` media query, and set `color-scheme: dark`.
2. Fix all hardcoded inline colors in components to use dark-mode equivalents.

No theme toggle, no light mode — dark only.

---

## Color Palette

| Purpose | Token name (reference) | Value |
|---------|------------------------|-------|
| Page background | `--bg` | `#0f172a` |
| Card / panel background | `--surface` | `#1e293b` |
| Border | `--border` | `#334155` |
| Body text | `--text` | `#e2e8f0` |
| Heading text | `--text-h` | `#f1f5f9` |
| Muted / secondary text | `--text-muted` | `#94a3b8` |
| Accent (indigo) | `--accent` | `#6366f1` |
| Input background | `--input-bg` | `#0f172a` |

---

## Changes by File

### `src/index.css`
- Set `color-scheme: dark` (remove `light dark`)
- Replace `:root` light variable values with dark palette above
- Delete the `@media (prefers-color-scheme: dark)` block entirely
- Add `body { background: #0f172a; }` to ensure the page background is dark even outside `#root`

### `src/components/ui/BottomNav.tsx`
- `background: '#fff'` → `#1e293b`
- `borderTop: '1px solid #e2e8f0'` → `1px solid #334155`
- Inactive tab color `#94a3b8` stays as-is (already readable on dark)

### `src/features/logs/LogCard.tsx`
- `background: '#fff'` → `#1e293b`
- `border: '1px solid #e2e8f0'` → `1px solid #334155`
- Text `color: '#1e293b'` → `#e2e8f0`

### `src/features/recording/RecordingPage.tsx`
- Date display box: `background: '#fff', color: '#1e293b'`, border `#e2e8f0` → dark equivalents
- Field pill (unfilled): `background: '#f1f5f9', color: '#334155'` → `#1e293b` / `#e2e8f0`
- Delete button: `background: '#fff', color: '#1e293b'`, border `#e2e8f0` → dark equivalents
- Empty state link color stays `#6366f1`

### `src/features/logs/LogsPage.tsx`
- View toggle background `#f1f5f9` → `#1e293b`
- Toggle inactive text `#1e293b` → `#e2e8f0`
- Filter `<select>` border `#e2e8f0` → `#334155`

### `src/features/logs/CalendarView.tsx`
- Any hardcoded light backgrounds and borders → dark equivalents
- Input/select elements: `background` → `#0f172a`, `color` → `#e2e8f0`, `border` → `#334155`

### `src/features/auth/LoginPage.tsx`
- Input style: `background: '#fff', color: '#000'` → `background: '#0f172a', color: '#e2e8f0'`
- Page background inherits dark from `body`

### `src/features/categories/CategoryEditorPage.tsx`
- Category name input border `#e2e8f0` → `#334155`
- "Add field" button: `background: '#f1f5f9', color: '#334155'` → `#1e293b` / `#e2e8f0`
- Border `1px dashed #94a3b8` stays (already neutral)

### `src/components/ui/OfflineBanner.tsx`
- `background: '#fef3c7', color: '#92400e'` → `background: '#78350f', color: '#fef3c7'` (amber dark)

---

## Out of Scope

- Theme toggle / user preference switch
- Migrating inline styles to CSS modules or CSS variables
- Any functional changes

---

## Success Criteria

- App displays with dark background (`#0f172a`) and light text on both PC and smartphone, regardless of OS light/dark preference
- No white or near-white backgrounds visible in any page
- No unreadable (dark-on-dark) text
