'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UploadCloud, CheckCircle } from 'lucide-react'

export function AssignmentDetails({ assignment }: { assignment: any }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setSuccess(false)

    // Using 4MB threshold to safely stay under Vercel's 4.5MB limit
    const isSmallFile = file.size <= 4 * 1024 * 1024

    let res;

    if (isSmallFile) {
      // Hybrid Optimization: Vercel Direct Proxy (No Supabase egress used)
      const formData = new FormData()
      formData.append('assignmentId', assignment.id.toString())
      formData.append('file', file)
      
      res = await fetch('/api/moodle/submit', {
        method: 'POST',
        body: formData
      })
    } else {
      // Fallback: Supabase Storage Staging for large files
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Not authenticated')
        setUploading(false)
        return
      }

      const ext = file.name.split('.').pop()
      const filePath = `${user.id}/${assignment.id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file)

      if (uploadError) {
        setError('Failed to stage large file: ' + uploadError.message)
        setUploading(false)
        return
      }

      res = await fetch('/api/moodle/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assignmentId: assignment.id, 
          supabaseFilePath: filePath,
          filename: file.name
        })
      })
    }

    const data = await res.json()
    if (res.ok) {
      setSuccess(true)
      setFile(null)
    } else {
      setError(data.error || 'Submission transfer failed')
    }
    
    setUploading(false)
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h3 className="text-xl font-bold">{assignment.name}</h3>
        <p className="text-gray-400 text-sm mt-1">{assignment.coursename}</p>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h4 className="font-semibold mb-2">Instructions</h4>
        <div className="text-sm prose prose-invert" dangerouslySetInnerHTML={{ __html: assignment.intro }} />
      </div>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h4 className="font-semibold mb-4">Submit Assignment</h4>
        
        {success ? (
          <div className="flex items-center text-green-400 bg-green-900/30 p-3 rounded">
            <CheckCircle className="mr-2 h-5 w-5" />
            Submission recorded in Moodle!
          </div>
        ) : (
          <div className="space-y-4">
            <input 
              type="file" 
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button 
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex w-full justify-center items-center py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
            >
              {uploading ? 'Submitting...' : <><UploadCloud className="mr-2 h-5 w-5" /> Submit File</>}
            </button>
            {file && file.size > 4 * 1024 * 1024 && (
              <p className="text-xs text-gray-500 text-center">Large file detected. This will use our optimized staging server.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
