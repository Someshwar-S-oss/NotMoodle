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
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push('/')}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            Global Study Chat
          </h1>
          <p className="text-sm text-gray-400 mt-1">Select a course to ask questions based on its materials.</p>
        </div>
      </div>

      <div className="w-full max-w-4xl flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
            <p>Loading your courses...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            {/* Course Selector Header */}
            <div className="p-4 bg-gray-950 border-b border-gray-800 flex items-center gap-4 shrink-0 overflow-x-auto custom-scrollbar">
              <Book className="h-5 w-5 text-gray-500 shrink-0" />
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c.id.toString())}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                    selectedCourse === c.id.toString() 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  {c.shortname}
                </button>
              ))}
            </div>

            {/* Chat Area */}
            <div className="flex-1 relative min-h-[500px]">
              {selectedCourse ? (
                // We use key={selectedCourse} to force unmount/remount when course changes, ensuring it re-fetches history
                <ChatBox key={selectedCourse} courseId={selectedCourse} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-900/50">
                  <Sparkles className="h-12 w-12 mb-4 text-gray-700" />
                  <p className="text-lg font-medium">Select a course above to start studying!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
