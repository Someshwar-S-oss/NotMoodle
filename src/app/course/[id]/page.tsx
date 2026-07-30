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
    <main className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-6 p-4 md:px-8 md:py-6 border-b border-border/10 bg-background z-10 sticky top-0">
        <button 
          onClick={() => router.push('/')}
          className="p-3 border border-border/20 bg-background hover:bg-[#f2f2f2] text-foreground transition-colors duration-300"
        >
          <ArrowLeft className="h-6 w-6 stroke-1" />
        </button>
        <h1 className="text-3xl md:text-4xl clash-title uppercase tracking-widest truncate">
          Course Library
        </h1>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: The Library (Flattened & Searchable) */}
        <div className="flex-1 flex flex-col overflow-y-auto border-r border-border/10 bg-background">
          <div className="p-4 md:p-8 space-y-8 max-w-4xl w-full mx-auto">
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 stroke-1 text-neutral-500" />
              <input 
                type="text"
                placeholder="SEARCH LECTURES, ASSIGNMENTS, AND FILES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/20 pl-16 pr-6 py-5 text-sm uppercase tracking-widest text-foreground placeholder-neutral-500 focus:outline-none hover:bg-[#f2f2f2] transition-colors"
              />
            </div>

            {error && (
              <div className="p-6 border border-red-500/20 text-red-500 text-sm uppercase tracking-widest font-bold bg-red-500/5">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-32">
                <Loader2 className="h-10 w-10 animate-spin stroke-1 text-foreground/50" />
              </div>
            ) : (
              <div className="border border-border/20 bg-background">
                <div className="px-6 py-4 border-b border-border/20 bg-[#f2f2f2] text-[#111111] flex justify-between items-center">
                  <h2 className="text-xl clash-title uppercase">All Materials</h2>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#111111]/50">{filteredModules.length} ITEMS</span>
                </div>
                
                <div className="divide-y divide-border/10">
                  {filteredModules.length > 0 ? (
                    filteredModules.map((mod: any) => {
                      const isFile = mod.modname === 'resource' && mod.contents?.[0]?.fileurl;
                      
                      const InnerContent = (
                        <>
                          <div className="p-4 border border-border/20 bg-[#f2f2f2] text-[#111111] group-hover:bg-[#111111] group-hover:text-white transition-colors duration-500">
                            {getModuleIcon(mod.modname)}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="text-lg md:text-xl clash-title group-hover:translate-x-2 transition-transform duration-500 truncate text-[#111111]">
                              {mod.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <span className="text-[10px] font-bold text-background bg-[#111111] px-2 py-1 uppercase tracking-widest">
                                {mod.modname}
                              </span>
                              <span className="text-[10px] font-bold text-[#111111]/50 uppercase tracking-widest border border-border/20 px-2 py-1 truncate max-w-[200px]">
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
                            className="w-full text-left flex items-stretch gap-6 px-4 py-4 md:px-6 md:py-5 hover:bg-[#f2f2f2] transition-colors duration-500 group"
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
                          className="w-full text-left flex items-stretch gap-6 px-4 py-4 md:px-6 md:py-5 hover:bg-[#f2f2f2] transition-colors duration-500 group"
                        >
                          {InnerContent}
                        </a>
                      )
                    })
                  ) : (
                    <div className="p-12 text-center text-[#111111]/50 text-xs uppercase font-bold tracking-widest">
                      No materials found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Assistant (Always On) */}
        <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 border-t lg:border-t-0 lg:border-l border-border/10 bg-background flex flex-col h-[500px] lg:h-auto">
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
