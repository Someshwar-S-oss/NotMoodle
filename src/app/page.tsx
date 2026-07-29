'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Drawer } from '@/components/Drawer'
import { AssignmentDetails } from '@/components/AssignmentDetails'
import { createClient } from '@/utils/supabase/client'
import { Calendar, BookOpen, Clock, Book, Sparkles, HelpCircle, FileText } from 'lucide-react'
import { getSiteInfo, getCurrentCourses, getTimelineEvents, type MoodleCourse, type MoodleAssignment, type MoodleTimelineEvent } from '@/lib/moodle-client'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<MoodleTimelineEvent[]>([])
  const [courses, setCourses] = useState<MoodleCourse[]>([])
  const [moodleError, setMoodleError] = useState<string | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<MoodleAssignment | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('moodle_connections')
      .select('created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setIsConnected(true)
      
      // 1. Instant load from local cache
      const cached = localStorage.getItem('moodle_dashboard_cache')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setCourses(parsed.courses || [])
          setEvents(parsed.events || [])
          setLoading(false) // Stop loading immediately
        } catch (e) {}
      }

      // 2. Fetch fresh data in the background
      await loadMoodleData(!cached)
    } else {
      setLoading(false)
    }
  }

  const loadMoodleData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true)
    setMoodleError(null)
    try {
      // Get the token from our server (authenticated)
      const tokenRes = await fetch('/api/moodle/token')
      if (tokenRes.status === 401) { window.location.href = '/login'; return }
      if (!tokenRes.ok) { setMoodleError('Not connected to Moodle.'); setLoading(false); return }
      const { token } = await tokenRes.json()

      // All Moodle calls go browser → hselearning.sriher.com (user's IP, not blocked)
      const info = await getSiteInfo(token)
      const currentCourses = await getCurrentCourses(token, info.userid)
      const upcomingEvents = await getTimelineEvents(token)
      
      setCourses(currentCourses)
      setEvents(upcomingEvents)

      // Update local cache
      localStorage.setItem('moodle_dashboard_cache', JSON.stringify({
        courses: currentCourses,
        events: upcomingEvents,
        timestamp: Date.now()
      }))
    } catch (err: any) {
      console.error('Moodle load failed:', err)
      // Only show error banner if we don't already have cached data to show
      if (courses.length === 0) {
        setMoodleError(err.message || 'Failed to load Moodle data.')
      }
    }
    setLoading(false)
  }

  const formatDate = (ts: number) =>
    ts ? new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

  const getDaysUntilDue = (duedate: number) => {
    const diff = Math.ceil((duedate * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: 'Overdue', color: 'text-red-400 bg-red-900/30' }
    if (diff === 0) return { label: 'Due today', color: 'text-orange-400 bg-orange-900/30' }
    if (diff <= 3) return { label: `${diff}d left`, color: 'text-yellow-400 bg-yellow-900/30' }
    return { label: `${diff}d left`, color: 'text-blue-400 bg-blue-900/30' }
  }

  return (
    <main className="w-full">
      <div className="max-w-screen-xl mx-auto px-4 py-8 md:py-16">
        <header className="mb-12 border-b-4 border-border pb-6 flex flex-col md:flex-row justify-between items-baseline gap-4">
          <h1 className="text-5xl sm:text-7xl font-serif font-black tracking-tighter uppercase leading-[0.9]">Dashboard</h1>
          <p className="text-foreground font-mono text-xs uppercase tracking-widest">Your Courses & Deadlines</p>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-12 bg-muted w-64 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 border border-border bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : !isConnected ? (
          <MoodleConnect onConnected={checkConnection} />
        ) : (
          <div className="space-y-10">

            {moodleError && (
              <div className="flex items-center justify-between p-4 bg-background border border-border border-l-4 border-l-accent text-sm">
                <span className="text-foreground font-mono">{moodleError}</span>
                <button onClick={() => loadMoodleData(true)} className="ml-4 px-4 py-2 text-xs font-mono uppercase tracking-widest bg-border text-background hover:bg-background hover:text-border hover:border-border border border-transparent transition-all duration-200">
                  Retry
                </button>
              </div>
            )}

            {/* ── Current Courses ── */}
            <section className="border-b-4 border-border pb-12">
              <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl lg:text-5xl font-serif font-black uppercase">
                Courses
              </h2>
              <div className="flex items-center gap-4">
                <Link
                  href="/chat"
                  className="hidden md:flex items-center gap-2 px-6 py-3 bg-border text-background border border-transparent hover:bg-background hover:text-border hover:border-border text-xs font-mono uppercase tracking-widest transition-all duration-200"
                >
                  <Sparkles className="h-4 w-4" />
                  Global AI Chat
                </Link>
                <div className="text-xs font-mono uppercase tracking-widest bg-muted px-4 py-2 border border-border">
                  {courses.length} Active
                </div>
              </div>
            </div>

              {courses.length === 0 ? (
                <p className="text-muted-foreground text-sm font-mono">No active courses found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map(course => (
                    <Link
                      href={`/course/${course.id}`}
                      key={course.id}
                      className="block p-6 bg-background border border-border hover:bg-neutral-100 hard-shadow-hover group flex flex-col justify-between"
                    >
                      <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3 truncate border-b border-border pb-2">{course.shortname}</p>
                        <h3 className="font-serif font-bold text-2xl leading-tight mb-6 group-hover:text-accent transition-colors">{course.fullname}</h3>
                      </div>

                      <div className="mt-auto border-t border-border pt-4">
                        {course.progress !== null && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs font-mono uppercase tracking-widest text-neutral-600 mb-2">
                              <span>Progress</span>
                              <span>{Math.round(course.progress)}%</span>
                            </div>
                            <div className="h-2 bg-muted border border-border">
                              <div
                                className="h-full bg-border"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-neutral-600">
                          <span>Ends {formatDate(course.enddate)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ── Upcoming Assignments ── */}
            <section>
              <h2 className="text-4xl lg:text-5xl font-serif font-black uppercase mb-8 pb-4 border-b border-border flex items-baseline gap-4">
                Deadlines
                {events.length > 0 && (
                  <span className="text-sm font-mono tracking-widest text-neutral-500">
                    [{events.length}]
                  </span>
                )}
              </h2>

              {events.length === 0 ? (
                <p className="text-neutral-500 text-sm font-mono">No upcoming deadlines found.</p>
              ) : (
                <div className="flex flex-col border-t border-border">
                  {events.map((event: any) => {
                    const due = getDaysUntilDue(event.timestart)
                    // override getDaysUntilDue colors to fit Newsprint
                    const labelColor = due.label.includes('Overdue') ? 'text-background bg-border' : (due.label.includes('today') ? 'text-background bg-accent' : 'text-border bg-muted')
                    return (
                      <button
                        key={event.id}
                        onClick={() => {
                          if (event.eventtype === 'assign') {
                            setSelectedAssignment({
                              id: event.instance,
                              course: event.course.id,
                              name: event.name,
                              intro: event.description || '',
                              duedate: event.timestart,
                              cutoffdate: 0,
                              coursename: event.course.fullname,
                              cmid: 0,
                              allowsubmissionsfromdate: 0,
                              grade: 100
                            } as MoodleAssignment)
                          } else {
                            window.open(event.url, '_blank')
                          }
                        }}
                        className="p-6 border-b border-r border-l border-border bg-background text-left hover:bg-neutral-100 transition-colors group flex flex-col md:flex-row justify-between md:items-center gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1">{event.course.fullname}</p>
                          <h3 className="font-serif font-bold text-2xl truncate flex items-center gap-3 group-hover:text-accent transition-colors">
                            {event.eventtype === 'quiz' ? <HelpCircle className="h-6 w-6 stroke-1" /> : <FileText className="h-6 w-6 stroke-1" />}
                            {event.name}
                          </h3>
                        </div>
                        <div className="shrink-0 flex md:flex-col items-center md:items-end gap-4 md:gap-1">
                          <span className={`text-xs font-mono uppercase tracking-widest px-3 py-1 border border-border ${labelColor}`}>
                            {due.label}
                          </span>
                          <span className="text-sm font-mono text-neutral-600">{formatDate(event.timestart)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

          </div>
        )}
      </div>

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
