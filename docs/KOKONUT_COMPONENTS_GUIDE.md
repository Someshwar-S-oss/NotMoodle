# Kokonut UI Components Guide for NotMoodle

This guide explains how each of the 5 Kokonut UI components added to NotMoodle works and provides copy-paste ready examples.

---

## 1. Apple Activity Card (`apple-activity-card.tsx`)

### Location
`src/components/kokonutui/apple-activity-card.tsx`

### Overview
Inspired by the Apple Fitness and Adidas Running vital rings, this component renders concentric SVG rings that animate smoothly into place to track learning metrics, submission progress, or daily study activity.

### Props & Data Structure
- `rings`: An array of ring objects:
  - `label`: Name of the metric (e.g., `'deadlines'`).
  - `value`: Numerical progress value (e.g., `8`).
  - `max`: Target or maximum value (e.g., `10`).
  - `color`: CSS color for the ring track (e.g., `'#f43f5e'`).
  - `unit`: Measurement unit (e.g., `'due'`, `'done'`).
  - `icon`: Optional Lucide icon element.
- `title`: Header title text.
- `subtitle`: Subtitle description.
- `className`: Optional wrapper CSS class names.

### Example Usage
```tsx
import { AppleActivityCard } from '@/components/kokonutui/apple-activity-card'
import { Flame, CheckCircle, BookOpen } from 'lucide-react'

export function MyProgressWidget() {
  const activityData = [
    {
      label: 'pending assignments',
      value: 3,
      max: 5,
      color: '#f43f5e', // coral / rose
      unit: 'due',
      icon: <Flame className="w-3.5 h-3.5 text-rose-500" />
    },
    {
      label: 'submissions done',
      value: 12,
      max: 15,
      color: '#10b981', // emerald
      unit: 'completed',
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
    },
    {
      label: 'modules active',
      value: 6,
      max: 6,
      color: '#38bdf8', // sky
      unit: 'courses',
      icon: <BookOpen className="w-3.5 h-3.5 text-sky-500" />
    }
  ]

  return (
    <AppleActivityCard
      title="study momentum"
      subtitle="daily activity & completion metrics"
      rings={activityData}
      className="max-w-md"
    />
  )
}
```

---

## 2. Typewriter Title (`type-writer.tsx`)

### Location
`src/components/kokonutui/type-writer.tsx`

### Overview
A smooth, accessible typewriter headline effect inspired by Brilliant app onboarding and learning prompts. It types out text sequentially, highlights key phrases, and supports deleting and looping through multiple sentences.

### Props & Data Structure
- `text`: Single string or array of strings to cycle through.
- `speed`: Typing speed in milliseconds (default: `45`).
- `waitTime`: Pause duration between phrases in milliseconds (default: `1800`).
- `deleteSpeed`: Deletion speed when switching phrases (default: `30`).
- `cursor`: Whether to display the blinking cursor pipe (default: `true`).
- `className`: Heading style classes.

### Example Usage
```tsx
import { TypewriterTitle } from '@/components/kokonutui/type-writer'

export function HeroBanner() {
  return (
    <div className="py-6">
      <p className="text-xs font-mono lowercase text-secondary">welcome back</p>
      <TypewriterTitle
        text={[
          "let's build momentum today",
          "your enrolled modules are ready",
          "review your upcoming deadlines"
        ]}
        speed={40}
        waitTime={2000}
        className="text-3xl font-semibold tracking-tight text-foreground"
      />
    </div>
  )
}
```

---

## 3. Kokonut Loader (`loader.tsx`)

### Location
`src/components/kokonutui/loader.tsx`

### Overview
An elegant multi-ring concentric spinner with fluid opacity masks. It replaces generic spinning icons with a refined, branded loading indicator.

### Props & Data Structure
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`).
- `title`: Primary message displayed under the spinner.
- `subtitle`: Secondary muted caption.
- `className`: Additional styling classes.

### Example Usage
```tsx
import { Loader } from '@/components/kokonutui/loader'

export function LoadingCard() {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader
        size="md"
        title="loading course materials..."
        subtitle="syncing latest resources from moodle"
      />
    </div>
  )
}
```

---

## 4. Toolbar (`toolbar.tsx`)

### Location
`src/components/kokonutui/toolbar.tsx`

### Overview
A floating dock-style interactive toolbar component with magnetic hover, draggable docking edges (`top`, `bottom`, `left`, `right`), tool nesting, keyboard shortcuts, and smooth spring physics.

### Props & Data Structure
- `tools`: Array of `DockTool` objects:
  - `id`: Unique identifier (e.g., `'search'`).
  - `label`: Tooltip and accessible label (lowercase).
  - `icon`: Lucide icon component.
  - `shortcut`: Key shortcut (e.g., `'K'`, `'D'`).
  - `onClick`: Click handler callback.
- `value`: Active tool ID.
- `defaultEdge`: Dock position: `'bottom' | 'top' | 'left' | 'right'`.
- `onValueChange`: Callback when the active tool changes.

### Example Usage
```tsx
import { Toolbar, type DockTool } from '@/components/kokonutui/toolbar'
import { Home, Search, BookOpen, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function FloatingQuickToolbar() {
  const router = useRouter()

  const tools: DockTool[] = [
    {
      id: 'dashboard',
      label: 'dashboard',
      icon: Home,
      shortcut: 'D',
      onClick: () => router.push('/dashboard'),
    },
    {
      id: 'search',
      label: 'search',
      icon: Search,
      shortcut: 'K',
      onClick: () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
      },
    },
    {
      id: 'courses',
      label: 'courses',
      icon: BookOpen,
      shortcut: 'C',
      onClick: () => router.push('/dashboard#courses'),
    },
    {
      id: 'settings',
      label: 'settings',
      icon: Settings,
      shortcut: 'S',
      onClick: () => router.push('/settings'),
    },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Toolbar
        tools={tools}
        defaultValue="dashboard"
        defaultEdge="bottom"
      />
    </div>
  )
}
```

---

## 5. Action Search Bar (`action-search-bar.tsx`)

### Location
`src/components/kokonutui/action-search-bar.tsx`

### Overview
A spotlight command palette with keyboard shortcut triggers (`⌘K`), breadcrumb navigation, nested sub-actions, fuzzy search, and progress feedback.

### Props & Data Structure
- `items`: Array of `CommandItem` actions:
  - `id`: Unique ID.
  - `label`: Action text.
  - `icon`: React node icon.
  - `group`: Section category name.
  - `keywords`: Array of search keywords.
  - `shortcut`: Display shortcut array (e.g., `['⌘', 'D']`).
  - `onSelect`: Action handler.
- `open`: Controlled visibility boolean.
- `onOpenChange`: Callback when modal visibility toggles.
- `placeholder`: Input placeholder.

### Example Usage
```tsx
import { useState } from 'react'
import { ActionSearchBar, type CommandItem } from '@/components/kokonutui/action-search-bar'
import { Home, Book, FileText, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'

export function QuickActionMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()

  const items: CommandItem[] = [
    {
      id: 'go-dashboard',
      label: 'go to dashboard',
      group: 'navigation',
      icon: <Home className="w-4 h-4" />,
      shortcut: ['G', 'D'],
      onSelect: () => router.push('/dashboard')
    },
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'switch to light mode' : 'switch to dark mode',
      group: 'appearance',
      icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      shortcut: ['⌘', 'T'],
      onSelect: () => setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  ]

  return (
    <ActionSearchBar
      open={open}
      onOpenChange={setOpen}
      items={items}
      placeholder="type a command or search..."
    />
  )
}
```
