'use client'

import { useEffect, useState, use, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Link as LinkIcon,
  ClipboardList,
  Folder,
  Loader2,
  Search,
  X,
  ExternalLink,
  Eye,
  RotateCcw
} from 'lucide-react'
import { getCourseContents, getAssignments, type MoodleAssignment } from '@/lib/moodle-client'
import { createClient } from '@/utils/supabase/client'
import { Drawer } from '@/components/Drawer'
import { FileViewer } from '@/components/FileViewer'
import { AssignmentDetails } from '@/components/AssignmentDetails'

type CategoryFilter = 'all' | 'assignments' | 'resources' | 'links'

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const courseId = parseInt(unwrappedParams?.id || '0', 10)
  const router = useRouter()
  const searchParams = useSearchParams()
  const modParam = searchParams.get('mod')
  
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedMod, setSelectedMod] = useState<any>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<MoodleAssignment | null>(null)
  const [token, setToken] = useState<string>('')
  const [assignments, setAssignments] = useState<MoodleAssignment[]>([])
  
  // Search & Category states
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  // Keyboard shortcut '/' to focus search input (guarded against inputs, textareas, contenteditable)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null
        const isEditable =
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable

        if (!isEditable) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('profiles').select('is_approved').eq('id', user.id).maybeSingle()
      if (!profile || !profile.is_approved) {
        window.location.href = '/onboarding'
        return
      }

      const tokenRes = await fetch('/api/moodle/token')
      if (tokenRes.status === 401) { window.location.href = '/login'; return }
      if (!tokenRes.ok) { window.location.href = '/onboarding'; return }
      const { token } = await tokenRes.json()
      setToken(token)

      const [contents, courseAssignments] = await Promise.all([
        getCourseContents(token, courseId),
        getAssignments(token, [courseId])
      ])
      
      if (contents?.exception) {
        throw new Error(contents.message || 'Failed to load course contents')
      }
      
      setSections(contents || [])
      setAssignments(courseAssignments)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred loading the course.')
    }
    setLoading(false)
  }

  // Derive course name from assignments or fallback to "Course Library"
  const courseName = useMemo(() => {
    if (assignments.length > 0 && assignments[0].coursename) {
      return assignments[0].coursename
    }
    return 'Course Library'
  }, [assignments])

  // Flatten all modules into a single searchable array
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

  // Count items by category
  const categoryCounts = useMemo(() => {
    let assignmentsCount = 0
    let resourcesCount = 0
    let linksCount = 0

    allModules.forEach(mod => {
      if (mod.modname === 'assign') {
        assignmentsCount++
      } else if (mod.modname === 'resource' || mod.modname === 'folder') {
        resourcesCount++
      } else {
        linksCount++
      }
    })

    return {
      all: allModules.length,
      assignments: assignmentsCount,
      resources: resourcesCount,
      links: linksCount,
    }
  }, [allModules])

  // Filter modules based on both activeCategory and searchQuery
  const filteredModules = useMemo(() => {
    return allModules.filter(m => {
      // Category filter
      if (activeCategory === 'assignments' && m.modname !== 'assign') {
        return false
      }
      if (activeCategory === 'resources' && m.modname !== 'resource' && m.modname !== 'folder') {
        return false
      }
      if (activeCategory === 'links' && (m.modname === 'assign' || m.modname === 'resource' || m.modname === 'folder')) {
        return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchName = m.name?.toLowerCase().includes(query)
        const matchSection = m.sectionName?.toLowerCase().includes(query)
        const matchModname = m.modname?.toLowerCase().includes(query)
        if (!matchName && !matchSection && !matchModname) {
          return false
        }
      }

      return true
    })
  }, [allModules, activeCategory, searchQuery])

  // Helper to determine file extension / type info
  const getResourceMeta = (mod: any) => {
    if (mod.modname === 'assign') {
      return {
        badgeText: 'ASSIGNMENT',
        badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        iconBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        icon: <ClipboardList className="h-5 w-5 stroke-1.5" />,
        actionText: 'View Details',
        actionIcon: <Eye className="h-3.5 w-3.5" />,
      }
    }

    if (mod.modname === 'resource') {
      const filename = mod.contents?.[0]?.filename || ''
      const ext = filename.split('.').pop()?.toUpperCase() || 'FILE'
      const isPdf = ext === 'PDF'

      return {
        badgeText: isPdf ? 'PDF / DOCUMENT' : `${ext} / DOCUMENT`,
        badgeBg: isPdf
          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
          : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
        iconBg: isPdf
          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
          : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
        icon: <FileText className="h-5 w-5 stroke-1.5" />,
        actionText: 'Preview',
        actionIcon: <Eye className="h-3.5 w-3.5" />,
      }
    }

    if (mod.modname === 'folder') {
      return {
        badgeText: 'FOLDER',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        iconBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        icon: <Folder className="h-5 w-5 stroke-1.5" />,
        actionText: 'Open Folder',
        actionIcon: <ExternalLink className="h-3.5 w-3.5" />,
      }
    }

    return {
      badgeText: 'LINK',
      badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
      iconBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
      icon: <LinkIcon className="h-5 w-5 stroke-1.5" />,
      actionText: 'Open Link',
      actionIcon: <ExternalLink className="h-3.5 w-3.5" />,
    }
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setActiveCategory('all')
  }

  const isFiltered = searchQuery.trim().length > 0 || activeCategory !== 'all'

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col relative font-sans">
      {/* Top Header & Breadcrumbs */}
      <header className="border-b border-border bg-background/95 backdrop-blur-md z-10 sticky top-0 px-4 py-4 md:px-8 md:py-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          {/* Breadcrumbs Row */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-secondary">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Dashboard</span>
            </button>
            <span className="text-tertiary">/</span>
            <span className="text-foreground font-semibold truncate max-w-[240px] md:max-w-md">
              {courseName}
            </span>
          </nav>

          {/* Title and Hero Section */}
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl clash-title font-semibold tracking-wide text-foreground truncate">
              {courseName}
            </h1>
          </div>

          {/* Stats Summary Bar */}
          {!loading && !error && (
            <div
              data-testid="stats-summary-bar"
              className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-[11px] font-mono uppercase tracking-wider text-secondary"
            >
              <span className="px-2.5 py-1 rounded-full bg-muted/60 border border-border text-foreground font-medium">
                {allModules.length} {allModules.length === 1 ? 'Material' : 'Materials'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                {categoryCounts.assignments} {categoryCounts.assignments === 1 ? 'Assignment' : 'Assignments'}
              </span>
              {isFiltered && (
                <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-bold ml-auto md:ml-0">
                  {filteredModules.length} Matching
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-background">
        <div className="p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
          
          {/* Unified Search Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 stroke-1.5 text-secondary pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search materials by title, section, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search course materials"
              className="w-full bg-card border border-border pl-12 pr-28 py-3.5 rounded-lg text-sm text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-foreground/40 transition-all shadow-xs"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-secondary hover:text-foreground hover:bg-muted/70 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider text-secondary bg-muted border border-border select-none pointer-events-none">
                Press / to search
              </span>
            </div>
          </div>

          {/* Interactive Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Category filters">
            <button
              role="tab"
              aria-selected={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                  : 'bg-card text-secondary border-border hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <span>All</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeCategory === 'all' ? 'bg-background/20 text-background' : 'bg-muted text-secondary'
              }`}>
                {categoryCounts.all}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeCategory === 'assignments'}
              onClick={() => setActiveCategory('assignments')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer ${
                activeCategory === 'assignments'
                  ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                  : 'bg-card text-secondary border-border hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <span>Assignments</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeCategory === 'assignments' ? 'bg-background/20 text-background' : 'bg-muted text-secondary'
              }`}>
                {categoryCounts.assignments}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeCategory === 'resources'}
              onClick={() => setActiveCategory('resources')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer ${
                activeCategory === 'resources'
                  ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                  : 'bg-card text-secondary border-border hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <span>PDFs & Readings</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeCategory === 'resources' ? 'bg-background/20 text-background' : 'bg-muted text-secondary'
              }`}>
                {categoryCounts.resources}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeCategory === 'links'}
              onClick={() => setActiveCategory('links')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer ${
                activeCategory === 'links'
                  ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                  : 'bg-card text-secondary border-border hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <span>Links & Folders</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeCategory === 'links' ? 'bg-background/20 text-background' : 'bg-muted text-secondary'
              }`}>
                {categoryCounts.links}
              </span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium bg-red-500/5">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-28 gap-4">
              <img src="/notmoodlelogo.png" alt="Loading..." className="h-12 w-auto object-contain animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-secondary animate-pulse">Loading Course Materials...</span>
            </div>
          ) : (
            /* Resource List Card Container */
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-border bg-card flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-secondary">
                  Course Materials
                </h2>
                <span className="text-xs font-mono text-secondary font-medium">
                  {filteredModules.length} {filteredModules.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              
              <div className="divide-y divide-border/60">
                {filteredModules.length > 0 ? (
                  filteredModules.map((mod: any) => {
                    const isFile = mod.modname === 'resource' && mod.contents?.[0]?.fileurl
                    const isAssign = mod.modname === 'assign'
                    const meta = getResourceMeta(mod)

                    const handleClick = () => {
                      if (isFile) {
                        setSelectedMod(mod)
                      } else if (isAssign) {
                        const assignData = assignments.find(a => a.cmid === mod.id)
                        if (assignData) {
                          setSelectedAssignment(assignData)
                        } else if (mod.url) {
                          window.open(mod.url, '_blank')
                        }
                      } else {
                        const externalLink = (mod.modname === 'url' && mod.contents?.[0]?.fileurl)
                          ? mod.contents[0].fileurl
                          : mod.url
                        if (externalLink) {
                          window.open(externalLink, '_blank')
                        }
                      }
                    }

                    return (
                      <div
                        key={mod.id}
                        data-testid={`module-item-${mod.id}`}
                        onClick={handleClick}
                        className="w-full text-left flex items-center justify-between gap-4 p-4 md:px-6 md:py-4.5 hover:bg-muted/40 transition-colors duration-200 group cursor-pointer"
                      >
                        {/* Left icon badge + Details */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`p-3 rounded-lg border ${meta.iconBg} shrink-0 transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105`}>
                            {meta.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg clash-title font-medium text-foreground truncate transition-transform duration-300 motion-reduce:transition-none group-hover:translate-x-1.5">
                              {mod.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${meta.badgeBg}`}>
                                {meta.badgeText}
                              </span>
                              {mod.sectionName && (
                                <span className="text-[11px] font-mono text-secondary border border-border/80 bg-muted/40 px-2 py-0.5 rounded truncate max-w-[220px]">
                                  {mod.sectionName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Action Button */}
                        <div className="shrink-0 flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleClick()
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-secondary hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            <span>{meta.actionText}</span>
                            {meta.actionIcon}
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  /* Friendly Empty State */
                  <div className="p-12 md:p-16 text-center flex flex-col items-center justify-center gap-3" role="status">
                    <div className="h-12 w-12 rounded-full bg-muted/80 flex items-center justify-center text-secondary mb-1">
                      <Search className="h-5 w-5 stroke-1.5" />
                    </div>
                    <h3 className="text-base clash-title font-semibold text-foreground">
                      No matching materials found
                    </h3>
                    <p className="text-xs text-secondary max-w-sm">
                      {searchQuery
                        ? `No items match “${searchQuery}” in the current category.`
                        : 'There are no items matching this category filter.'}
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Clear search & filters</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
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

      {/* Assignment Details Drawer */}
      <Drawer
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title="Assignment Details"
      >
        {selectedAssignment && <AssignmentDetails assignment={selectedAssignment} />}
      </Drawer>
    </main>
  )
}

