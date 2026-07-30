'use client'

import { useEffect, useState, useMemo } from 'react'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { Search, FileText, MessageSquare, Book, Link as LinkIcon, ClipboardList, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSiteInfo, getCurrentCourses, buildSearchIndex, type MoodleSearchItem } from '@/lib/moodle-client'

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
    if (type === 'course') return <Book className="mr-3 h-4 w-4 text-[#111111] shrink-0" strokeWidth={1.5} />
    if (type === 'forum') return <MessageSquare className="mr-3 h-4 w-4 text-[#111111] shrink-0" strokeWidth={1.5} />
    if (type === 'resource') return <FileText className="mr-3 h-4 w-4 text-[#111111] shrink-0" strokeWidth={1.5} />
    if (type === 'assign') return <ClipboardList className="mr-3 h-4 w-4 text-[#111111] shrink-0" strokeWidth={1.5} />
    return <LinkIcon className="mr-3 h-4 w-4 text-foreground/50 shrink-0" strokeWidth={1.5} />
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative w-full max-w-2xl bg-white border border-border/20 shadow-2xl rounded-none overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <Command label="Global Command Menu" shouldFilter={false} className="flex flex-col">
          <div className="flex items-center px-6 py-2 border-b border-border/20 bg-white">
            {indexing
              ? <Loader2 className="h-6 w-6 text-[#111111] animate-spin shrink-0" />
              : <Search className="h-6 w-6 text-[#111111] shrink-0" strokeWidth={2} />
            }
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={indexing ? 'Building search index...' : 'Search modules, files, assignments...'}
              className="flex-1 bg-transparent border-0 outline-none text-[#111111] px-4 py-4 placeholder-foreground/40 text-lg font-medium font-sans"
            />
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] uppercase tracking-widest font-bold text-foreground/50 bg-[#f2f2f2] px-2 py-1">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[55vh] overflow-y-auto p-0">
            {indexing ? (
              <div className="p-12 text-center text-foreground/50 text-xs uppercase font-bold tracking-widest flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#111111]" />
                Indexing your workspace...
              </div>
            ) : (
              <>
                <Command.Empty className="p-12 text-center text-foreground/50 text-xs uppercase font-bold tracking-widest">
                  No results for &ldquo;{query}&rdquo;
                </Command.Empty>

                {results.map(item => (
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
                    className="flex items-center px-6 py-4 border-b border-border/10 text-sm cursor-pointer aria-selected:bg-[#111111] aria-selected:text-[#f2f2f2] group transition-colors"
                  >
                    {getIcon(item.type)}
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold uppercase tracking-wide truncate group-aria-selected:text-[#f2f2f2]">{item.title}</span>
                      <span className="text-xs font-medium text-foreground/50 group-aria-selected:text-[#f2f2f2]/70 truncate mt-1">
                        {item.course} · {item.type}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </>
            )}
          </Command.List>

          <div className="bg-white px-6 py-3 border-t border-border/20 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-foreground/60">
            <span className="flex items-center gap-2">
              <kbd className="bg-[#f2f2f2] px-2 py-1">↑</kbd>
              <kbd className="bg-[#f2f2f2] px-2 py-1">↓</kbd> NAVIGATE
            </span>
            {items.length > 0 && <span>{items.length} INDEXED</span>}
            <span className="flex items-center gap-2">
              <kbd className="bg-[#f2f2f2] px-2 py-1">ENTER</kbd> SELECT
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}
