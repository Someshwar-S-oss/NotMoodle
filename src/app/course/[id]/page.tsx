'use client'

import { useEffect, useState, use, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, FileText, Link as LinkIcon, ClipboardList, Folder, Loader2, Search, Sparkles } from 'lucide-react'
import { getCourseContents } from '@/lib/moodle-client'
import { Drawer } from '@/components/Drawer'
import { FileViewer } from '@/components/FileViewer'
import { ChatBox } from '@/components/ChatBox'

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const courseId = parseInt(unwrappedParams.id, 10)
  const router = useRouter()
  const searchParams = useSearchParams()
  const modParam = searchParams.get('mod')
  
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedMod, setSelectedMod] = useState<any>(null)
  const [token, setToken] = useState<string>('')
  
  // New state for unified search
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  useEffect(() => {
    if (modParam && sections.length > 0) {
      for (const section of sections) {
        const found = section.modules?.find((m: any) => m.id.toString() === modParam)
        if (found && found.modname === 'resource' && found.contents?.[0]?.fileurl) {
          setSelectedMod(found)
          break
        }
      }
    }
  }, [modParam, sections])

  const loadCourseData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const tokenRes = await fetch('/api/moodle/token')
      if (tokenRes.status === 401) { window.location.href = '/login'; return }
      if (!tokenRes.ok) throw new Error('Not connected to Moodle')
      const { token } = await tokenRes.json()
      setToken(token)

      const contents = await getCourseContents(token, courseId)
      
      if (contents?.exception) {
        throw new Error(contents.message || 'Failed to load course contents')
      }
      
      setSections(contents || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred loading the course.')
    }
    setLoading(false)
  }

  // Flatten all modules into a single searchable array, stripping away the rigid Moodle sections
  const allModules = useMemo(() => {
    const modules: any[] = []
    sections.forEach(section => {
      if (section.modules) {
        section.modules.forEach((mod: any) => {
          modules.push({ ...mod, sectionName: section.name })
        })
      }
    })
    return modules
  }, [sections])

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return allModules
    const query = searchQuery.toLowerCase()
    return allModules.filter(m => 
      m.name.toLowerCase().includes(query) || 
      m.sectionName.toLowerCase().includes(query) ||
      m.modname.toLowerCase().includes(query)
    )
  }, [allModules, searchQuery])

  const getModuleIcon = (modname: string) => {
    switch (modname) {
      case 'resource': return <FileText className="h-6 w-6 stroke-1 text-foreground shrink-0" />
      case 'url': return <LinkIcon className="h-6 w-6 stroke-1 text-foreground shrink-0" />
      case 'assign': return <ClipboardList className="h-6 w-6 stroke-1 text-foreground shrink-0" />
      case 'folder': return <Folder className="h-6 w-6 stroke-1 text-foreground shrink-0" />
      default: return <FileText className="h-6 w-6 stroke-1 text-foreground shrink-0" />
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground newsprint-texture flex flex-col relative">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-6 p-4 md:px-8 md:py-6 border-b-4 border-border bg-background z-10 sticky top-0">
        <button 
          onClick={() => router.push('/')}
          className="p-3 border border-border bg-background hover:bg-muted text-foreground transition-all duration-200"
        >
          <ArrowLeft className="h-6 w-6 stroke-1" />
        </button>
        <h1 className="text-3xl md:text-5xl font-serif font-black uppercase tracking-tighter truncate">
          Course Library
        </h1>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: The Library (Flattened & Searchable) */}
        <div className="flex-1 flex flex-col overflow-y-auto border-r-4 border-border bg-background/50">
          <div className="p-4 md:p-8 space-y-8 max-w-4xl w-full mx-auto">
            
            {/* Search Bar */}
            <div className="relative hard-shadow-hover">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 stroke-1 text-neutral-500" />
              <input 
                type="text"
                placeholder="SEARCH LECTURES, ASSIGNMENTS, AND FILES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border-4 border-border pl-16 pr-6 py-5 text-lg font-mono uppercase tracking-widest text-foreground placeholder-neutral-500 focus:outline-none focus:bg-muted transition-all"
              />
            </div>

            {error && (
              <div className="p-6 bg-accent border-4 border-border text-background font-mono uppercase tracking-widest text-sm font-bold">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-32 border-4 border-border bg-background">
                <Loader2 className="h-10 w-10 animate-spin stroke-1 text-foreground" />
              </div>
            ) : (
              <div className="border-4 border-border bg-background hard-shadow-hover">
                <div className="px-6 py-4 border-b-4 border-border bg-foreground text-background flex justify-between items-center">
                  <h2 className="text-xl font-serif font-bold uppercase">All Materials</h2>
                  <span className="text-xs font-mono uppercase tracking-widest">{filteredModules.length} ITEMS</span>
                </div>
                
                <div className="divide-y-4 divide-border">
                  {filteredModules.length > 0 ? (
                    filteredModules.map((mod: any) => {
                      const isFile = mod.modname === 'resource' && mod.contents?.[0]?.fileurl;
                      
                      const InnerContent = (
                        <>
                          <div className="p-4 border-2 border-border bg-background group-hover:bg-foreground group-hover:text-background transition-colors">
                            {getModuleIcon(mod.modname)}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="text-lg md:text-xl font-serif font-bold group-hover:underline decoration-2 truncate">
                              {mod.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className="text-xs font-mono text-background bg-foreground px-2 py-1 uppercase tracking-widest">
                                {mod.modname}
                              </span>
                              <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest border border-border px-2 py-1 truncate max-w-[200px]">
                                {mod.sectionName}
                              </span>
                            </div>
                          </div>
                        </>
                      );

                      if (isFile) {
                        return (
                          <button
                            key={mod.id}
                            onClick={() => setSelectedMod(mod)}
                            className="w-full text-left flex items-stretch gap-6 px-4 py-4 md:px-6 md:py-5 hover:bg-muted transition-colors group"
                          >
                            {InnerContent}
                          </button>
                        )
                      }

                      return (
                        <a
                          key={mod.id}
                          href={mod.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-left flex items-stretch gap-6 px-4 py-4 md:px-6 md:py-5 hover:bg-muted transition-colors group"
                        >
                          {InnerContent}
                        </a>
                      )
                    })
                  ) : (
                    <div className="p-12 text-center text-neutral-500 font-mono uppercase tracking-widest">
                      No materials found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Assistant (Always On) */}
        <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 border-t-4 lg:border-t-0 border-border bg-background flex flex-col h-[500px] lg:h-auto">
          {!loading && !error && (
            <ChatBox courseId={courseId.toString()} />
          )}
        </div>
      </div>

      {/* Full-Screen File Viewer Drawer */}
      <Drawer
        isOpen={!!selectedMod}
        onClose={() => setSelectedMod(null)}
        title={selectedMod?.name || 'File Preview'}
        fullScreen={true}
      >
        {selectedMod && <FileViewer mod={selectedMod} courseId={courseId} token={token} />}
      </Drawer>
    </main>
  )
}
