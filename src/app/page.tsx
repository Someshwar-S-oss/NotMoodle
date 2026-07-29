'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Drawer } from '@/components/Drawer'
import { AssignmentDetails } from '@/components/AssignmentDetails'
import { createClient } from '@/utils/supabase/client'
import { Calendar, BookOpen, Clock } from 'lucide-react'
import { getSiteInfo, getCurrentCourses, getAssignments, type MoodleCourse, type MoodleAssignment } from '@/lib/moodle-client'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [assignments, setAssignments] = useState<MoodleAssignment[]>([])
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
          setAssignments(parsed.assignments || [])
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
      const courseIds = currentCourses.map(c => c.id)
      const upcomingAssignments = await getAssignments(token, courseIds)
      
      setCourses(currentCourses)
      setAssignments(upcomingAssignments)

      // Update local cache
      localStorage.setItem('moodle_dashboard_cache', JSON.stringify({
        courses: currentCourses,
        assignments: upcomingAssignments,
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
    <main className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">Your courses and upcoming deadlines.</p>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-8 bg-gray-800 rounded w-40 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : !isConnected ? (
          <MoodleConnect onConnected={checkConnection} />
        ) : (
          <div className="space-y-10">

            {moodleError && (
              <div className="flex items-center justify-between p-4 bg-red-900/30 border border-red-700 rounded-xl text-sm">
                <span className="text-red-300">{moodleError}</span>
                <button onClick={() => loadMoodleData(true)} className="ml-4 px-3 py-1 text-xs bg-red-700 hover:bg-red-600 rounded-lg">
                  Retry
                </button>
              </div>
            )}

            {/* ── Current Courses ── */}
            <section>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Current Courses
                {courses.length > 0 && (
                  <span className="ml-1 text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {courses.length}
                  </span>
                )}
              </h2>

              {courses.length === 0 ? (
                <p className="text-gray-500 text-sm">No active courses found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map(course => (
                    <Link
                      href={`/course/${course.id}`}
                      key={course.id}
                      className="block p-4 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-750 hover:border-indigo-500/50 transition-colors group"
                    >
                      <p className="text-xs font-mono text-indigo-400 mb-1 truncate">{course.shortname}</p>
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-3 group-hover:text-indigo-100 transition-colors">{course.fullname}</h3>

                      {course.progress !== null && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(course.progress)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>Ends {formatDate(course.enddate)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ── Upcoming Assignments ── */}
            <section>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-blue-400" />
                Upcoming Deadlines
                {assignments.length > 0 && (
                  <span className="ml-1 text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {assignments.length}
                  </span>
                )}
              </h2>

              {assignments.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming assignments found.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {assignments.map((assignment: any) => {
                    const due = getDaysUntilDue(assignment.duedate)
                    return (
                      <button
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment)}
                        className="p-4 border border-gray-700 bg-gray-800 rounded-xl text-left hover:bg-gray-750 hover:border-gray-500 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{assignment.name}</h3>
                            <p className="text-sm text-gray-400 mt-0.5">{assignment.coursename}</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${due.color}`}>
                              {due.label}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(assignment.duedate)}</span>
                          </div>
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
