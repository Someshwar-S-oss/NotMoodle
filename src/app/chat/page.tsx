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
    <main className="min-h-screen h-screen bg-background text-foreground p-4 md:p-6 flex flex-col items-center overflow-hidden">
      <div className="w-full max-w-[1400px] flex items-center justify-between gap-6 mb-4 pb-4 border-b-4 border-foreground shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="p-2 border-2 border-foreground bg-card hover:bg-foreground hover:text-background transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2px]" />
          </button>
          <h1 className="clash-title text-2xl md:text-4xl uppercase tracking-wide flex items-center gap-3">
            <Sparkles className="h-6 w-6 stroke-[2px]" />
            Global Study Chat
          </h1>
        </div>
        <p className="hidden md:block text-xs font-bold uppercase tracking-widest text-foreground/60">Select a module to begin.</p>
      </div>

      <div className="w-full max-w-[1400px] flex-1 flex flex-col md:flex-row bg-card border-2 border-foreground shadow-[8px_8px_0px_var(--color-foreground)] min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/50 bg-background">
            <Loader2 className="h-10 w-10 animate-spin mb-6 text-foreground" strokeWidth={2} />
            <p className="font-bold text-xs uppercase tracking-widest">Loading your courses...</p>
          </div>
        ) : (
          <>
            {/* Sidebar Course Selector */}
            <div className="w-full md:w-64 lg:w-80 bg-background border-b-2 md:border-b-0 md:border-r-2 border-foreground flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0 custom-scrollbar">
              <div className="p-4 border-b-2 border-foreground hidden md:flex items-center gap-2 bg-foreground text-background">
                <Book className="h-5 w-5 stroke-[2px]" />
                <span className="clash-title text-sm uppercase tracking-wide">Modules</span>
              </div>
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c.id.toString())}
                  className={`p-4 text-left border-b border-foreground/20 border-r md:border-r-0 font-bold text-xs uppercase tracking-wider shrink-0 md:shrink transition-colors ${
                    selectedCourse === c.id.toString() 
                      ? 'bg-foreground text-background' 
                      : 'bg-transparent text-foreground hover:bg-card'
                  }`}
                >
                  {c.fullname}
                </button>
              ))}
            </div>

            {/* Chat Area */}
            <div className="flex-1 relative flex flex-col min-w-0 h-full">
              {selectedCourse ? (
                <ChatBox key={selectedCourse} courseId={selectedCourse} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-foreground/50 bg-card">
                  <Sparkles className="h-12 w-12 mb-6 text-foreground" strokeWidth={2} />
                  <p className="clash-title text-2xl text-foreground uppercase">Select a module to start</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
