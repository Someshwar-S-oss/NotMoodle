'use client'

import { useEffect, useState } from 'react'
import { MoodleConnect } from '@/components/MoodleConnect'
import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [courses, setCourses] = useState<any[]>([])

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
      .single()

    if (data) {
      setIsConnected(true)
      fetchCourses()
    } else {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    setLoading(true)
    const res = await fetch('/api/moodle/courses')
    if (res.ok) {
      const data = await res.json()
      setCourses(data.courses || [])
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-2">Your cross-course timeline and updates.</p>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-800 rounded-lg"></div>
            <div className="h-24 bg-gray-800 rounded-lg"></div>
            <div className="h-24 bg-gray-800 rounded-lg"></div>
          </div>
        ) : !isConnected ? (
          <MoodleConnect onConnected={checkConnection} />
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Your Courses</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course: any) => (
                <div key={course.id} className="p-4 border border-gray-700 bg-gray-800 rounded-lg">
                  <h3 className="font-bold text-lg">{course.fullname}</h3>
                  <p className="text-sm text-gray-400">{course.shortname}</p>
                </div>
              ))}
              {courses.length === 0 && <p className="text-gray-500">No courses found.</p>}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
