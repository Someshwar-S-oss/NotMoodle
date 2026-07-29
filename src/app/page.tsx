'use client'

import { useEffect, useState } from 'react'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Drawer } from '@/components/Drawer'
import { AssignmentDetails } from '@/components/AssignmentDetails'
import { createClient } from '@/utils/supabase/client'
import { Calendar } from 'lucide-react'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)

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
      fetchAssignments()
    } else {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/moodle/assignments')
      const contentType = res.headers.get('content-type') || ''
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      } else if (res.status === 401) {
        // Session expired — middleware will handle redirect on next navigation
        window.location.href = '/login'
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-2">Your cross-course timeline and upcoming deadlines.</p>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-800 rounded-lg"></div>
            <div className="h-16 bg-gray-800 rounded-lg"></div>
          </div>
        ) : !isConnected ? (
          <MoodleConnect onConnected={checkConnection} />
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center">
              <Calendar className="mr-2 h-5 w-5" /> Upcoming Deadlines
            </h2>
            <div className="flex flex-col gap-3">
              {assignments.map((assignment: any) => (
                <button 
                  key={assignment.id} 
                  onClick={() => setSelectedAssignment(assignment)}
                  className="p-4 border border-gray-700 bg-gray-800 rounded-lg text-left hover:bg-gray-750 transition-colors hover:border-gray-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{assignment.name}</h3>
                      <p className="text-sm text-gray-400">{assignment.coursename}</p>
                    </div>
                    <span className="text-sm font-medium text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full">
                      {new Date(assignment.duedate * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
              {assignments.length === 0 && <p className="text-gray-500">No upcoming assignments found.</p>}
            </div>
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
