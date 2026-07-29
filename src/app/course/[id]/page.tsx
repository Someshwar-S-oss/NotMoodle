'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Link as LinkIcon, ClipboardList, Folder, Loader2 } from 'lucide-react'
import { getSiteInfo, getCourseContents, type MoodleCourse } from '@/lib/moodle-client'

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params)
  const courseId = parseInt(unwrappedParams.id, 10)
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get token
      const tokenRes = await fetch('/api/moodle/token')
      if (tokenRes.status === 401) { window.location.href = '/login'; return }
      if (!tokenRes.ok) throw new Error('Not connected to Moodle')
      const { token } = await tokenRes.json()

      // Fetch course contents directly from browser to Moodle
      const contents = await getCourseContents(token, courseId)
      
      if (contents?.exception) {
        throw new Error(contents.message || 'Failed to load course contents')
      }
      
      setSections(contents || [])

      // TODO: Background sync trigger for AI RAG indexing
      // triggerBackgroundFileSync(contents, token)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred loading the course.')
    }
    setLoading(false)
  }

  const getModuleIcon = (modname: string) => {
    switch (modname) {
      case 'resource': return <FileText className="h-5 w-5 text-green-400 shrink-0" />
      case 'url': return <LinkIcon className="h-5 w-5 text-gray-400 shrink-0" />
      case 'assign': return <ClipboardList className="h-5 w-5 text-orange-400 shrink-0" />
      case 'folder': return <Folder className="h-5 w-5 text-blue-400 shrink-0" />
      default: return <FileText className="h-5 w-5 text-gray-500 shrink-0" />
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.push('/')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Course Content</h1>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-8">
            {sections.filter(s => s.modules && s.modules.length > 0 || s.summary).map((section) => (
              <section key={section.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="bg-gray-850 px-5 py-4 border-b border-gray-700">
                  <h2 className="text-xl font-semibold text-indigo-300">{section.name}</h2>
                  {section.summary && (
                    <div 
                      className="text-sm text-gray-400 mt-2 prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.summary }}
                    />
                  )}
                </div>
                
                <div className="divide-y divide-gray-700/50">
                  {section.modules?.map((mod: any) => (
                    <a
                      key={mod.id}
                      href={mod.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-750 transition-colors group"
                    >
                      {getModuleIcon(mod.modname)}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium group-hover:text-indigo-300 transition-colors truncate">
                          {mod.name}
                        </h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
                          {mod.modname}
                        </p>
                      </div>
                    </a>
                  ))}
                  {(!section.modules || section.modules.length === 0) && (
                    <div className="px-5 py-4 text-sm text-gray-500">No content in this section.</div>
                  )}
                </div>
              </section>
            ))}

            {sections.length === 0 && !error && (
              <div className="text-center py-20 text-gray-500">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>This course is empty.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
