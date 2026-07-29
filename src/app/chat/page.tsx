'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Sparkles, Book } from 'lucide-react'
import { getSiteInfo, getCurrentCourses, type MoodleCourse } from '@/lib/moodle-client'
import { ChatBox } from '@/components/ChatBox'

export default function GlobalChatPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<MoodleCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const tokenRes = await fetch('/api/moodle/token')
      if (tokenRes.status === 401) { window.location.href = '/login'; return }
      if (!tokenRes.ok) throw new Error('Failed to get token')
      
      const { token } = await tokenRes.json()
      const info = await getSiteInfo(token)
      const data = await getCurrentCourses(token, info.userid)
      setCourses(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center newsprint-texture">
      <div className="w-full max-w-screen-xl flex flex-col md:flex-row md:items-baseline justify-between gap-6 mb-8 border-b-4 border-border pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="p-3 border border-border bg-background hover:bg-muted text-foreground transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 stroke-1" />
          </button>
          <h1 className="text-4xl md:text-6xl font-serif font-black uppercase tracking-tighter flex items-center gap-4">
            <Sparkles className="h-8 w-8 stroke-1" />
            Global Study Chat
          </h1>
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">Select a course to ask questions based on its materials.</p>
      </div>

      <div className="w-full max-w-screen-xl flex-1 flex flex-col bg-background border-4 border-border relative z-10 hard-shadow-hover">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 bg-muted">
            <Loader2 className="h-10 w-10 animate-spin mb-6 stroke-1 text-foreground" />
            <p className="font-mono text-sm uppercase tracking-widest">Loading your courses...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            {/* Course Selector Header */}
            <div className="p-6 bg-background border-b-4 border-border flex items-center gap-4 shrink-0 overflow-x-auto custom-scrollbar">
              <Book className="h-6 w-6 stroke-1 shrink-0" />
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c.id.toString())}
                  className={`px-6 py-3 border border-border text-xs font-mono uppercase tracking-widest whitespace-nowrap transition-colors shrink-0 ${
                    selectedCourse === c.id.toString() 
                      ? 'bg-foreground text-background' 
                      : 'bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {c.fullname}
                </button>
              ))}
            </div>

            {/* Chat Area */}
            <div className="flex-1 relative min-h-[500px] bg-muted">
              {selectedCourse ? (
                // We use key={selectedCourse} to force unmount/remount when course changes, ensuring it re-fetches history
                <ChatBox key={selectedCourse} courseId={selectedCourse} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
                  <Sparkles className="h-12 w-12 mb-6 stroke-1 text-foreground" />
                  <p className="font-serif font-bold text-3xl text-foreground">Select a course above to start studying!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
