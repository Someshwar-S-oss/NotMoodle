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
    if (type === 'course') return <Book className="mr-2 h-4 w-4 text-indigo-400 shrink-0" />
    if (type === 'forum') return <MessageSquare className="mr-2 h-4 w-4 text-blue-400 shrink-0" />
    if (type === 'resource') return <FileText className="mr-2 h-4 w-4 text-green-400 shrink-0" />
    if (type === 'assign') return <ClipboardList className="mr-2 h-4 w-4 text-orange-400 shrink-0" />
    return <LinkIcon className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <Command label="Global Command Menu" shouldFilter={false} className="flex flex-col">
          <div className="flex items-center px-4 border-b border-gray-800">
            {indexing
              ? <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
              : <Search className="h-5 w-5 text-gray-400" />
            }
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={indexing ? 'Building search index...' : 'Search courses, files, assignments...'}
              className="flex-1 bg-transparent border-0 outline-none text-white px-4 py-4 placeholder-gray-500 text-sm"
            />
            <kbd className="hidden sm:flex items-center gap-0.5 text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-[55vh] overflow-y-auto p-2">
            {indexing ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                Indexing your Moodle content...
              </div>
            ) : (
              <>
                <Command.Empty className="p-8 text-center text-gray-500 text-sm">
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
                    className="flex items-center px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white aria-selected:bg-indigo-600 aria-selected:text-white group transition-colors"
                  >
                    {getIcon(item.type)}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{item.title}</span>
                      <span className="text-xs text-gray-400 group-aria-selected:text-indigo-200 truncate">
                        {item.course} · {item.type}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </>
            )}
          </Command.List>

          <div className="bg-gray-950 px-4 py-2 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
            <span>
              <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700">↑</kbd>{' '}
              <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700">↓</kbd> navigate
            </span>
            {items.length > 0 && <span>{items.length} items indexed</span>}
            <span>
              <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700">Enter</kbd> open
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}
