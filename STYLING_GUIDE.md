# Styling Guide

This document outlines the standard styling patterns used throughout the application to ensure consistency.

## Dropdowns / Select Elements

**Always use the `Select` component from `@/presentation/components/Select`** instead of raw `<select>` elements.

### Standard Select Component

```tsx
import { Select } from '@/presentation/components/Select';

<Select
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]}
  size="md" // 'sm' | 'md' | 'lg'
  fullWidth={false}
/>
```

### If You Must Use Raw Select

If you absolutely need to use a raw `<select>` element (not recommended), use this exact className:

```tsx
className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all [&>option]:bg-slate-800 [&>option]:text-slate-300"
```

**Key styling requirements:**
- `focus:outline-none` - Removes default browser outline
- `transition-all` - Smooth transitions
- `[&>option]:bg-slate-800 [&>option]:text-slate-300` - Styles option elements
- `focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50` - Focus states

## Input Fields

Standard input styling:

```tsx
className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
```

## Buttons

### Primary Button
```tsx
className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all"
```

### Secondary Button
```tsx
className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl text-slate-300 text-sm font-medium transition-all"
```

## Cards / Containers

Standard card styling:

```tsx
className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6"
```

## Color Palette

- **Background**: `slate-800/50`, `slate-900/50`
- **Borders**: `slate-700/50`, `slate-800/50`
- **Text**: `slate-100`, `slate-300`, `slate-400`
- **Accent**: `emerald-500/50`, `emerald-400`
- **Error**: `red-500/10`, `red-400`

## Best Practices

1. **Always use the Select component** - Don't create raw `<select>` elements
2. **Consistent spacing** - Use `rounded-xl` for inputs/buttons, `rounded-2xl` for cards
3. **Transitions** - Always include `transition-all` on interactive elements
4. **Focus states** - Always include focus ring styling for accessibility
5. **Option styling** - Use `[&>option]:bg-slate-800 [&>option]:text-slate-300` for select options

