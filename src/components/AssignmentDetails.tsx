'use client'

import { useState, useEffect } from 'react'
import { UploadCloud, CheckCircle, Loader2, FileText, Clock, Star } from 'lucide-react'
import { uploadFileToDraft, saveSubmission, getSubmissionStatus, type MoodleSubmissionStatus } from '@/lib/moodle-client'

async function getMoodleToken(): Promise<string> {
  const res = await fetch('/api/moodle/token')
  if (!res.ok) throw new Error('Not authenticated or not connected to Moodle')
  const { token } = await res.json()
  return token
}

export function AssignmentDetails({ assignment }: { assignment: any }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [status, setStatus] = useState<MoodleSubmissionStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    loadStatus()
  }, [assignment.id])

  const loadStatus = async () => {
    setStatusLoading(true)
    try {
      const token = await getMoodleToken()
      const s = await getSubmissionStatus(token, assignment.id)
      setStatus(s)
    } catch {
      // Non-fatal: status panel just won't show
    }
    setStatusLoading(false)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setSuccess(false)

    try {
      const token = await getMoodleToken()

      // Step 1: upload file directly from browser to Moodle draft area
      const itemid = await uploadFileToDraft(token, file)

      // Step 2: save submission
      await saveSubmission(token, assignment.id, itemid)

      setSuccess(true)
      setFile(null)
      // Refresh status
      await loadStatus()
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.')
    }
    setUploading(false)
  }

  const formatDate = (ts: number) =>
    ts ? new Date(ts * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold">{assignment.name}</h3>
        <p className="text-gray-400 text-sm mt-1">{assignment.coursename}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          {assignment.duedate > 0 && (
            <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
              <Clock className="h-3 w-3 text-orange-400" />
              Due: {formatDate(assignment.duedate)}
            </span>
          )}
          {assignment.grade > 0 && (
            <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
              <Star className="h-3 w-3 text-yellow-400" />
              Max grade: {assignment.grade}
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {assignment.intro && (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <h4 className="font-semibold mb-2 text-sm text-gray-300 uppercase tracking-wider">Instructions</h4>
          <div
            className="text-sm prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: assignment.intro }}
          />
        </div>
      )}

      {/* Submission status */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h4 className="font-semibold mb-3 text-sm text-gray-300 uppercase tracking-wider">Current Submission</h4>
        {statusLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : !status || status.status === 'new' ? (
          <p className="text-gray-500 text-sm">No submission yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                status.submitted
                  ? 'bg-green-900/40 text-green-400 border border-green-700'
                  : 'bg-yellow-900/40 text-yellow-400 border border-yellow-700'
              }`}>
                {status.submitted ? 'Submitted' : 'Draft'}
              </span>
              {status.graded && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-400 border border-blue-700">
                  Graded
                </span>
              )}
            </div>
            {status.timemodified && (
              <p className="text-xs text-gray-500">Last modified: {formatDate(status.timemodified)}</p>
            )}
            {status.files.length > 0 && (
              <div className="mt-2 space-y-1">
                {status.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-700/50 px-3 py-2 rounded-lg">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f.filename}</span>
                    <span className="ml-auto shrink-0 text-gray-500">{formatSize(f.filesize)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit new file */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h4 className="font-semibold mb-4 text-sm text-gray-300 uppercase tracking-wider">
          {status?.submitted ? 'Resubmit' : 'Submit Assignment'}
        </h4>

        {success ? (
          <div className="flex items-center gap-2 text-green-400 bg-green-900/30 border border-green-700 p-3 rounded-lg">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>Submission recorded in Moodle!</span>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
            {file && (
              <p className="text-xs text-gray-500">{file.name} ({formatSize(file.size)})</p>
            )}
            {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</p>}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex w-full justify-center items-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 rounded-lg font-medium transition-colors text-sm"
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                : <><UploadCloud className="h-4 w-4" /> Submit File</>}
            </button>
            <p className="text-xs text-gray-600 text-center">
              File uploads go directly to Moodle — nothing is stored on our servers.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
