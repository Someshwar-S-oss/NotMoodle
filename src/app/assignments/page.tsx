'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Clock,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle2,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Drawer } from '@/components/Drawer'
import { AssignmentDetails } from '@/components/AssignmentDetails'
import {
  getRelativeTimeBadge,
  extractCourseCode,
  extractCourseDisplayName,
  getCourseAccent,
} from '@/lib/dashboard-utils'
import { getAssignments, type MoodleAssignment, type MoodleCourse } from '@/lib/moodle-client'

type FilterCategory = 'all' | 'overdue' | 'today' | 'upcoming'

function getAssignmentCategory(assignment: { duedate: number }): 'overdue' | 'today' | 'upcoming' {
  const badge = getRelativeTimeBadge(assignment.duedate)
  return badge.variant
}

function AssignmentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [assignments, setAssignments] = useState<MoodleAssignment[]>([])
  const [courses, setCourses] = useState<MoodleCourse[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAssignment, setSelectedAssignment] = useState<MoodleAssignment | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [filterOverride, setFilterOverride] = useState<FilterCategory | null>(null)

  // Determine active filter from URL or state override
  const urlFilter = searchParams.get('filter')
  const activeFilter: FilterCategory = useMemo(() => {
    if (filterOverride) return filterOverride
    if (urlFilter && ['all', 'overdue', 'today', 'upcoming'].includes(urlFilter)) {
      return urlFilter as FilterCategory
    }
    return 'all'
  }, [filterOverride, urlFilter])

  // Reset override and index if URL param changes
  useEffect(() => {
    setFilterOverride(null)
    setCurrentIndex(0)
  }, [urlFilter])

  // Load cache on mount and optionally sync fresh
  useEffect(() => {
    try {
      const cached = localStorage.getItem('moodle_dashboard_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed.assignments)) {
          setAssignments(parsed.assignments)
        }
        if (Array.isArray(parsed.courses)) {
          setCourses(parsed.courses)
        }
      }
    } catch (e) {
      console.warn('Failed to parse moodle cache:', e)
    }

    const syncFresh = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const tokenRes = await fetch('/api/moodle/token')
        if (!tokenRes.ok) return
        const { token } = await tokenRes.json()
        if (!token) return

        const cached = localStorage.getItem('moodle_dashboard_cache')
        let courseIds: number[] = []
        if (cached) {
          const parsed = JSON.parse(cached)
          courseIds = (parsed.courses || []).map((c: any) => c.id)
        }
        if (courseIds.length > 0) {
          const fresh = await getAssignments(token, courseIds)
          if (fresh && fresh.length > 0) {
            setAssignments(fresh)
            if (cached) {
              const parsed = JSON.parse(cached)
              parsed.assignments = fresh
              localStorage.setItem('moodle_dashboard_cache', JSON.stringify(parsed))
            }
          }
        }
      } catch {
        // Non-fatal background sync failure
      }
    }

    syncFresh()
  }, [])

  // Course map for quick lookups
  const courseMap = useMemo(() => {
    const map = new Map<number, MoodleCourse>()
    courses.forEach(c => map.set(c.id, c))
    return map
  }, [courses])

  // Live count badges for tabs
  const counts = useMemo(() => {
    const tally: Record<FilterCategory, number> = {
      all: assignments.length,
      overdue: 0,
      today: 0,
      upcoming: 0,
    }
    assignments.forEach(a => {
      const cat = getAssignmentCategory(a)
      tally[cat] = (tally[cat] || 0) + 1
    })
    return tally
  }, [assignments])

  // Filtered assignments list
  const filteredAssignments = useMemo(() => {
    if (activeFilter === 'all') return assignments
    return assignments.filter(a => getAssignmentCategory(a) === activeFilter)
  }, [assignments, activeFilter])

  // Safe index within bounds
  const safeIndex = filteredAssignments.length > 0
    ? Math.min(currentIndex, filteredAssignments.length - 1)
    : 0

  const currentAssignment = filteredAssignments[safeIndex]

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if (isDrawerOpen) return
      if (filteredAssignments.length <= 1) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex(prev => Math.min(filteredAssignments.length - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredAssignments.length, isDrawerOpen])

  const handleFilterChange = (filter: FilterCategory) => {
    setFilterOverride(filter)
    setCurrentIndex(0)
    router.push(`/assignments?filter=${filter}`)
  }

  const categories: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'today', label: 'Due Today' },
    { id: 'upcoming', label: 'Upcoming' },
  ]

  // Sanitized description snippet
  const cleanSnippet = useMemo(() => {
    if (!currentAssignment?.intro) return 'No detailed instructions provided.'
    const stripped = currentAssignment.intro.replace(/<[^>]*>?/gm, '').trim()
    return stripped || 'No detailed instructions provided.'
  }, [currentAssignment?.intro])

  const matchedCourse = currentAssignment ? courseMap.get(currentAssignment.course) : undefined
  const courseCode = currentAssignment
    ? extractCourseCode(matchedCourse?.shortname || currentAssignment.coursename, matchedCourse?.fullname)
    : ''
  const courseDisplayName = currentAssignment
    ? extractCourseDisplayName(matchedCourse?.fullname || currentAssignment.coursename)
    : ''
  const accent = currentAssignment
    ? getCourseAccent(currentAssignment.course, safeIndex)
    : { name: 'Slate', hex: '#4f46e5', bgClass: 'bg-[#4f46e5]' }
  const timeBadge = currentAssignment
    ? getRelativeTimeBadge(currentAssignment.duedate)
    : null

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 pt-6 px-4 sm:px-6 md:px-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lowercase">assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            interactive deck of coursework and upcoming deadlines
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 backdrop-blur-md rounded-2xl border border-border/30 overflow-x-auto">
          {categories.map(cat => {
            const isActive = activeFilter === cat.id
            const count = counts[cat.id] ?? 0
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleFilterChange(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                    isActive
                      ? 'bg-foreground/10 text-foreground font-semibold'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Carousel Area */}
      {filteredAssignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center max-w-md mx-auto my-12 bg-card/40">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground lowercase">no assignments found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no assignments matching the &ldquo;{activeFilter}&rdquo; filter.
          </p>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              className="mt-5 px-4 py-2 text-sm font-medium rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              View All Assignments
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Deck Controls (Pagination & Arrow Buttons) */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
              Assignment {safeIndex + 1} of {filteredAssignments.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous assignment"
                disabled={safeIndex <= 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next assignment"
                disabled={safeIndex >= filteredAssignments.length - 1}
                onClick={() => setCurrentIndex(prev => Math.min(filteredAssignments.length - 1, prev + 1))}
                className="p-2.5 rounded-xl border border-border/40 bg-card hover:bg-muted text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Card */}
          <div className="relative rounded-3xl border border-border/40 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-sm overflow-hidden transition-all duration-300">
            {/* Top Accent Strip */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: accent.hex }}
            />

            {/* Header: Course Code + Countdown Badge */}
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold"
                  style={{ backgroundColor: `${accent.hex}18`, color: accent.hex }}
                >
                  {courseCode}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                  {courseDisplayName}
                </span>
              </div>

              {timeBadge && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    timeBadge.variant === 'overdue'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                      : timeBadge.variant === 'today'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeBadge.label}</span>
                </div>
              )}
            </div>

            {/* Assignment Title */}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight lowercase text-foreground mb-3">
              {currentAssignment.name}
            </h2>

            {/* Description Snippet */}
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-6 bg-muted/20 p-4 rounded-2xl border border-border/20">
              {cleanSnippet}
            </p>

            {/* Metadata Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/40 border border-border/30 mb-8">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Due Date</div>
                  <div className="text-sm font-medium text-foreground">
                    {new Date(currentAssignment.duedate * 1000).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Award className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Grade</div>
                  <div className="text-sm font-medium text-foreground">
                    {currentAssignment.grade ? `${currentAssignment.grade} pts` : 'Ungraded'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Cutoff</div>
                  <div className="text-sm font-medium text-foreground">
                    {currentAssignment.cutoffdate && currentAssignment.cutoffdate > 0
                      ? new Date(currentAssignment.cutoffdate * 1000).toLocaleDateString()
                      : 'None'}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedAssignment(currentAssignment)
                  setIsDrawerOpen(true)
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
              >
                <FileText className="w-4 h-4" />
                <span>Open Dossier &amp; Submit</span>
              </button>

              <a
                href={`https://hselearning.sriher.com/mod/assign/view.php?id=${currentAssignment.cmid || currentAssignment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 hover:bg-muted/50 font-medium transition-colors text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Moodle</span>
              </a>
            </div>
          </div>

          {/* Quick Jump Strip */}
          {filteredAssignments.length > 1 && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Quick Jump Strip
                </span>
                <span className="text-xs text-muted-foreground">{filteredAssignments.length} cards</span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
                {filteredAssignments.map((a, idx) => {
                  const isCurrent = idx === safeIndex
                  const aBadge = getRelativeTimeBadge(a.duedate)
                  const aMatched = courseMap.get(a.course)
                  const aCourseCode = extractCourseCode(aMatched?.shortname || a.coursename, aMatched?.fullname)
                  const aAccent = getCourseAccent(a.course, idx)

                  return (
                    <button
                      key={a.id}
                      type="button"
                      aria-label={`Jump to assignment ${idx + 1}: ${a.name}`}
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex-shrink-0 text-left p-3 rounded-2xl border transition-all w-52 snap-start ${
                        isCurrent
                          ? 'border-foreground bg-card shadow-sm ring-1 ring-foreground/20'
                          : 'border-border/40 bg-card/60 hover:bg-muted/40 hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${aAccent.hex}18`, color: aAccent.hex }}
                        >
                          {aCourseCode}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            aBadge.variant === 'overdue'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : aBadge.variant === 'today'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {aBadge.label}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground line-clamp-1">
                        #{idx + 1} · {a.name}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignment Dossier Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedAssignment?.name || 'Assignment Dossier'}
      >
        {selectedAssignment && <AssignmentDetails assignment={selectedAssignment} />}
      </Drawer>
    </div>
  )
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-center text-muted-foreground">Loading assignments...</div>}>
      <AssignmentsContent />
    </Suspense>
  )
}
