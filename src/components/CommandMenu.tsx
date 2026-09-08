'use client'

import { useEffect, useState, useMemo } from 'react'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { Search, FileText, MessageSquare, Book, Link as LinkIcon, ClipboardList, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSiteInfo, getCurrentCourses, buildSearchIndex, type MoodleSearchItem } from '@/lib/moodle-client'

import { extractCourseDisplayName } from '@/lib/dashboard-utils'

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<MoodleSearchItem[]>([])
  const [indexing, setIndexing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open && items.length === 0) {
      loadSearchIndex()
    }
  }, [open])

  const loadSearchIndex = async () => {
    setIndexing(true)
    try {
      const tokenRes = await fetch('/api/moodle/token')
      if (!tokenRes.ok) return
      const { token } = await tokenRes.json()

      // All calls go browser → Moodle directly
      const info = await getSiteInfo(token)
      const courses = await getCurrentCourses(token, info.userid)
      const index = await buildSearchIndex(token, courses)
      setItems(index)
    } catch (err) {
      console.error('Search index build failed:', err)
    }
    setIndexing(false)
  }

  const fuse = useMemo(() => new Fuse(items, {
    keys: ['title', 'course', 'type'],
    threshold: 0.3,
  }), [items])

  const results = query
    ? fuse.search(query).map(r => r.item).slice(0, 10)
    : items.slice(0, 10)

  const getIcon = (type: string) => {
    if (type === 'course') return <Book className="h-4 w-4 text-primary shrink-0" strokeWidth={1.8} />
    if (type === 'forum') return <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.8} />
    if (type === 'resource') return <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" strokeWidth={1.8} />
    if (type === 'assign') return <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.8} />
    return <LinkIcon className="h-4 w-4 text-tertiary shrink-0" strokeWidth={1.8} />
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop with frosted blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => setOpen(false)}
      />

      {/* Elevated Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5 dark:ring-white/5">
        <Command label="Global Command Menu" shouldFilter={false} className="flex flex-col">
          {/* Header & Search Input */}
          <div className="flex items-center px-5 py-3.5 border-b border-border/20 bg-muted/20">
            {indexing ? (
              <Loader2 className="h-5 w-5 text-secondary animate-spin shrink-0 ml-1 mr-3" />
            ) : (
              <Search className="h-5 w-5 text-secondary shrink-0 ml-1 mr-3" strokeWidth={2} />
            )}
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={indexing ? 'Building search index...' : 'Search modules, files, assignments...'}
              className="flex-1 bg-transparent border-0 outline-none text-foreground px-1 py-2 placeholder:text-tertiary text-base font-medium font-sans"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-secondary bg-muted/80 border border-border/40 rounded shadow-2xs">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results List */}
          <Command.List className="max-h-[50vh] overflow-y-auto p-2 scrollbar-none space-y-1">
            {indexing ? (
              <div className="py-14 text-center text-secondary text-xs uppercase font-mono tracking-widest flex flex-col items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin mb-3 text-foreground" />
                Indexing your workspace...
              </div>
            ) : results.length === 0 ? (
              <Command.Empty className="py-14 text-center text-tertiary text-xs uppercase font-mono tracking-widest">
                No results for &ldquo;{query}&rdquo;
              </Command.Empty>
            ) : (
              results.map(item => {
                const cleanedCourse = extractCourseDisplayName(item.course)
                return (
                  <Command.Item
                    key={item.id}
                    onSelect={() => {
                      setOpen(false)
                      if (item.url.startsWith('http')) {
                        window.open(item.url, '_blank', 'noopener')
                      } else {
                        router.push(item.url)
                      }
                    }}
                    className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl cursor-pointer text-sm transition-all duration-150 aria-selected:bg-muted/80 aria-selected:shadow-2xs text-foreground group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border/30 flex items-center justify-center shrink-0 group-aria-selected:border-border/60 group-aria-selected:bg-background">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold tracking-normal text-sm text-foreground truncate">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-secondary font-mono mt-0.5 truncate">
                        <span className="truncate text-tertiary">{cleanedCourse}</span>
                        <span className="text-border/80">·</span>
                        <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-muted/70 text-secondary border border-border/20">
                          {item.type}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-tertiary opacity-0 group-aria-selected:opacity-100 transition-opacity shrink-0">
                      ↵
                    </span>
                  </Command.Item>
                )
              })
            )}
          </Command.List>

          {/* Footer Bar */}
          <div className="bg-muted/30 px-5 py-2.5 border-t border-border/20 flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-tertiary">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-muted/80 border border-border/30 px-1.5 py-0.5 rounded shadow-2xs font-mono">↑</kbd>
                <kbd className="bg-muted/80 border border-border/30 px-1.5 py-0.5 rounded shadow-2xs font-mono">↓</kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-muted/80 border border-border/30 px-1.5 py-0.5 rounded shadow-2xs font-mono">↵</kbd>
                <span className="ml-1">Open</span>
              </span>
            </div>
            {items.length > 0 && (
              <span className="text-secondary font-mono">{items.length} items indexed</span>
            )}
          </div>
        </Command>
      </div>
    </div>
  )
}
