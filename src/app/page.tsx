'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Drawer } from '@/components/Drawer'
import { AssignmentDetails } from '@/components/AssignmentDetails'
import { createClient } from '@/utils/supabase/client'
import { Calendar, BookOpen, Clock, Book, Sparkles, HelpCircle, FileText, AlertTriangle, ClipboardList } from 'lucide-react'
import { getSiteInfo, getCurrentCourses, getTimelineEvents, getAssignments, type MoodleCourse, type MoodleAssignment, type MoodleTimelineEvent } from '@/lib/moodle-client'

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
      
      const cached = localStorage.getItem('moodle_dashboard_cache')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setCourses(parsed.courses || [])
          setEvents(parsed.events || [])
          setLoading(false)
        } catch (e) {}
      }

      await loadMoodleData(!cached)
    } else {
      setLoading(false)
    }
  }

  const loadMoodleData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true)
    setMoodleError(null)
    try {
      const tokenRes = await fetch('/api/moodle/token')
      if (tokenRes.status === 401) { window.location.href = '/login'; return }
      if (!tokenRes.ok) { setMoodleError('Not connected to Moodle.'); setLoading(false); return }
      const { token } = await tokenRes.json()

      const info = await getSiteInfo(token)
      const currentCourses = await getCurrentCourses(token, info.userid)
      const upcomingEvents = await getTimelineEvents(token)
      
      const assignments = await getAssignments(token, currentCourses.map(c => c.id))
      const existingAssignInstances = new Set(upcomingEvents.filter(e => e.eventtype === 'assign').map(e => e.instance))
      const newAssignmentEvents = assignments
        .filter(a => !existingAssignInstances.has(a.id))
        .map(a => ({
          id: -a.id, // Negative to avoid collision with calendar events
          name: a.name,
          description: a.intro,
          eventtype: 'assign',
          course: { id: a.course, fullname: a.coursename, shortname: '' },
          timestart: a.duedate,
          timeduration: 0,
          instance: a.id,
          url: ''
        }))

      const allEvents = [...upcomingEvents, ...newAssignmentEvents].sort((a, b) => a.timestart - b.timestart)
      
      setCourses(currentCourses)
      setEvents(allEvents)

      localStorage.setItem('moodle_dashboard_cache', JSON.stringify({
        courses: currentCourses,
        events: allEvents,
        timestamp: Date.now()
      }))
    } catch (err: any) {
      console.error('Moodle load failed:', err)
      setMoodleError(err.message || 'Failed to load Moodle data.')
    }
    setLoading(false)
  }

  const formatDate = (ts: number) =>
    ts ? new Date(ts * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'

  // Anki-style bucket computation
  const { overdue, today, upcoming } = useMemo(() => {
    const now = Date.now()
    const buckets = { overdue: [] as any[], today: [] as any[], upcoming: [] as any[] }
    
    events.forEach(e => {
      const diff = Math.ceil((e.timestart * 1000 - now) / (1000 * 60 * 60 * 24))
      if (diff < 0) buckets.overdue.push(e)
      else if (diff === 0) buckets.today.push(e)
      else buckets.upcoming.push(e)
    })
    
    return buckets
  }, [events])

  return (
    <main className="h-screen bg-background text-foreground newsprint-texture flex flex-col md:flex-row overflow-hidden">
      {!isConnected && !loading ? (
        <div className="w-full flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <MoodleConnect onConnected={checkConnection} />
        </div>
      ) : (
        <>
          {/* Sidebar (Notion-style navigation) */}
          <aside className="w-full md:w-64 lg:w-80 border-b-4 md:border-b-0 md:border-r-4 border-border bg-background flex flex-col shrink-0 h-auto md:h-full z-10">
            <div className="p-6 border-b-4 border-border">
              <h1 className="text-3xl font-serif font-black uppercase tracking-tighter">Workspace</h1>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4 px-2">Quick Actions</h2>
                <Link href="/chat" className="flex items-center gap-3 px-3 py-2 bg-background hover:bg-foreground hover:text-background border border-transparent font-mono text-sm uppercase tracking-widest transition-colors group">
                  <Sparkles className="h-4 w-4 stroke-1 group-hover:text-background text-foreground" />
                  Global AI Chat
                </Link>
              </div>

              <div className="flex-1">
                <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4 px-2 flex justify-between">
                  Courses <span>{courses.length}</span>
                </h2>
                {loading && courses.length === 0 ? (
                  <div className="space-y-2 px-2">
                    {[1,2,3,4].map(i => <div key={i} className="h-8 bg-muted animate-pulse border border-border" />)}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {courses.map(course => (
                      <Link key={course.id} href={`/course/${course.id}`} className="block px-3 py-2 hover:bg-muted border border-transparent hover:border-border transition-colors">
                        <p className="font-serif font-bold text-sm truncate" title={course.fullname}>{course.fullname}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content Area (Anki-style Action Hub) */}
          <section className="flex-1 bg-background/50 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-6 md:p-12 w-full max-w-6xl mx-auto flex-1 flex flex-col">
              
              <header className="mb-12 border-b-4 border-border pb-6 flex flex-col md:flex-row justify-between items-baseline gap-4">
                <h2 className="text-5xl sm:text-7xl font-serif font-black tracking-tighter uppercase leading-[0.9]">Action Hub</h2>
                {loading && <p className="text-foreground font-mono text-xs uppercase tracking-widest animate-pulse">Syncing...</p>}
              </header>

              {moodleError && (
                <div className="flex items-center justify-between p-6 bg-accent border-4 border-border text-background mb-8 font-mono text-sm uppercase tracking-widest font-bold">
                  <span>{moodleError}</span>
                  <button onClick={() => loadMoodleData(true)} className="ml-4 px-4 py-2 border-2 border-background hover:bg-background hover:text-accent transition-colors">
                    Retry
                  </button>
                </div>
              )}

              {/* Anki-style priority stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                <div className="border-4 border-border bg-background p-6 hard-shadow-hover flex flex-col items-center text-center justify-center gap-2">
                  <span className="text-6xl font-serif font-black">{overdue.length}</span>
                  <span className="text-xs font-mono uppercase tracking-widest bg-foreground text-background px-3 py-1">Overdue</span>
                </div>
                <div className="border-4 border-border bg-background p-6 hard-shadow-hover flex flex-col items-center text-center justify-center gap-2">
                  <span className="text-6xl font-serif font-black">{today.length}</span>
                  <span className="text-xs font-mono uppercase tracking-widest bg-accent text-background px-3 py-1">Due Today</span>
                </div>
                <div className="border-4 border-border bg-background p-6 hard-shadow-hover flex flex-col items-center text-center justify-center gap-2">
                  <span className="text-6xl font-serif font-black">{upcoming.length}</span>
                  <span className="text-xs font-mono uppercase tracking-widest bg-muted text-foreground border border-border px-3 py-1">Upcoming</span>
                </div>
              </div>

              {/* Timeline Action Items */}
              <div className="flex-1">
                <h3 className="text-2xl font-serif font-black uppercase mb-6 flex items-center gap-4">
                  Timeline
                  <span className="h-px flex-1 bg-border block"></span>
                </h3>

                {events.length === 0 && !loading ? (
                  <div className="p-12 border-4 border-border bg-background text-center text-neutral-500 font-mono uppercase tracking-widest">
                    You're all caught up. No upcoming deadlines.
                  </div>
                ) : (
                  <div className="flex flex-col border-t-4 border-border">
                    {events.map((event: any) => {
                      const diff = Math.ceil((event.timestart * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
                      const isOverdue = diff < 0
                      const isToday = diff === 0

                      return (
                        <button
                          key={event.id}
                          onClick={() => {
                            if (event.eventtype === 'assign') {
                              setSelectedAssignment({
                                id: event.instance,
                                course: event.course?.id || 0,
                                name: event.name,
                                intro: event.description || '',
                                duedate: event.timestart,
                                cutoffdate: 0,
                                coursename: event.course?.fullname || '',
                                cmid: 0,
                                allowsubmissionsfromdate: 0,
                                grade: 100
                              } as MoodleAssignment)
                            } else {
                              window.open(event.url, '_blank')
                            }
                          }}
                          className={`w-full p-6 border-b-4 border-l-4 border-r-4 border-border bg-background text-left transition-colors group flex flex-col md:flex-row justify-between md:items-center gap-6 ${isOverdue ? 'hover:bg-muted' : (isToday ? 'hover:bg-muted' : 'hover:bg-muted')}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 border-2 border-border ${isOverdue ? 'bg-foreground text-background' : (isToday ? 'bg-accent text-background' : 'bg-background group-hover:bg-foreground group-hover:text-background')} transition-colors`}>
                              {event.eventtype === 'quiz' ? <HelpCircle className="h-6 w-6 stroke-1" /> : <ClipboardList className="h-6 w-6 stroke-1" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1 border-b border-border pb-1 inline-block">{event.course?.fullname || 'Global Event'}</p>
                              <h4 className="font-serif font-bold text-xl md:text-2xl mt-1 truncate group-hover:underline decoration-2">
                                {event.name}
                              </h4>
                            </div>
                          </div>
                          
                          <div className="shrink-0 flex md:flex-col items-center md:items-end gap-3 md:gap-2">
                            <span className={`text-xs font-mono uppercase tracking-widest px-3 py-1 border border-border ${isOverdue ? 'bg-foreground text-background' : (isToday ? 'bg-accent text-background' : 'bg-muted text-foreground')}`}>
                              {isOverdue ? 'Overdue' : (isToday ? 'Due Today' : `In ${diff} Days`)}
                            </span>
                            <span className="text-sm font-mono text-neutral-600">{formatDate(event.timestart)}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

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
