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
