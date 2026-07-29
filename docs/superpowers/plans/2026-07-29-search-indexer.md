# Forum & Resource Indexer (Global Search) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a fast, client-side Command-K search interface to instantly navigate course resources and forums.

**Architecture:** Next.js API route to fetch and flatten Moodle course contents. Client-side state (localStorage/memory for MVP) combined with `cmdk` and `fuse.js` for the UI and fuzzy searching.

**Tech Stack:** Next.js 14, `cmdk`, `fuse.js`, Tailwind CSS.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install cmdk and fuse.js**
Run the following command:
```bash
npm install cmdk fuse.js
```

- [ ] **Step 2: Commit**
```bash
git add package.json package-lock.json
git commit -m "build: add cmdk and fuse.js for global search"
```

---

### Task 2: Search Data Proxy API

**Files:**
- Create: `src/app/api/moodle/search-data/route.ts`

**Interfaces:**
- Produces: A flattened JSON array of searchable items (courses, modules, files, forums).

- [ ] **Step 1: Write API Route**
Create `src/app/api/moodle/search-data/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conn } = await supabase.from('moodle_connections').select('encrypted_token').eq('user_id', user.id).single()
  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  // 1. Get info
  const infoRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`)
  const info = await infoRes.json()
  
  // 2. Get courses
  const coursesRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${info.userid}`)
  const courses = await coursesRes.json()

  let searchItems: any[] = []

  // 3. For each course, get contents
  // Note: For MVP we do this sequentially. In production, Promise.all or background worker is better.
  for (const course of courses) {
    searchItems.push({
      id: `course_${course.id}`,
      type: 'course',
      title: course.fullname,
      course: course.fullname,
      url: `/course/${course.id}`
    })

    const contentsRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${course.id}`)
    const contents = await contentsRes.json()

    if (Array.isArray(contents)) {
      for (const section of contents) {
        for (const module of section.modules || []) {
          searchItems.push({
            id: `mod_${module.id}`,
            type: module.modname, // 'resource', 'forum', 'assign', etc.
            title: module.name,
            course: course.fullname,
            url: module.url || `/mod/${module.id}`
          })
        }
      }
    }
  }

  return NextResponse.json({ items: searchItems })
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/moodle/search-data/route.ts
git commit -m "feat: add api route to fetch and flatten searchable course data"
```

---

### Task 3: Command Menu Component

**Files:**
- Create: `src/components/CommandMenu.tsx`

**Interfaces:**
- Consumes: `/api/moodle/search-data`, `cmdk`, `fuse.js`.
- Produces: The global `Cmd+K` interface overlay.

- [ ] **Step 1: Write Command Menu**
Create `src/components/CommandMenu.tsx`:
```tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { Search, FileText, MessageSquare, Book, Link as LinkIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    // Fetch index on load
    fetch('/api/moodle/search-data')
      .then(res => res.json())
      .then(data => {
        if (data.items) setItems(data.items)
      })
  }, [])

  const fuse = useMemo(() => new Fuse(items, {
    keys: ['title', 'course', 'type'],
    threshold: 0.3,
  }), [items])

  const results = query ? fuse.search(query).map(r => r.item).slice(0, 10) : items.slice(0, 10)

  const getIcon = (type: string) => {
    if (type === 'course') return <Book className="mr-2 h-4 w-4" />
    if (type === 'forum') return <MessageSquare className="mr-2 h-4 w-4" />
    if (type === 'resource') return <FileText className="mr-2 h-4 w-4" />
    return <LinkIcon className="mr-2 h-4 w-4" />
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Command label="Global Command Menu" shouldFilter={false} className="flex flex-col">
          <div className="flex items-center px-4 border-b border-gray-800">
            <Search className="h-5 w-5 text-gray-400" />
            <Command.Input 
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search courses, files, forums... (Cmd+K)" 
              className="flex-1 bg-transparent border-0 outline-none text-white px-4 py-4 placeholder-gray-500"
            />
          </div>
          
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-gray-500">No results found.</Command.Empty>
            
            {results.map((item) => (
              <Command.Item
                key={item.id}
                onSelect={() => {
                  setOpen(false)
                  if (item.url) router.push(item.url)
                }}
                className="flex items-center px-4 py-3 rounded-lg text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white aria-selected:bg-blue-600 aria-selected:text-white group transition-colors"
              >
                {getIcon(item.type)}
                <div className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-gray-400 group-aria-selected:text-blue-200">{item.course} • {item.type}</span>
                </div>
              </Command.Item>
            ))}
          </Command.List>
          
          <div className="bg-gray-950 p-2 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
            <span>Use <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700">↑</kbd> <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700">↓</kbd> to navigate</span>
            <span><kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700">Enter</kbd> to open</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/CommandMenu.tsx
git commit -m "feat: add global command-k search interface"
```

---

### Task 4: Integrate Command Menu

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add CommandMenu to Layout**
Import and place `<CommandMenu />` in the global layout just below `<NotificationBell />` or inside the main `div`.

- [ ] **Step 2: Commit**
```bash
git add src/app/layout.tsx
git commit -m "feat: integrate command menu into global layout"
```
