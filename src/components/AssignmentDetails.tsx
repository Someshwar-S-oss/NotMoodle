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
    <div className="space-y-8 text-foreground font-body">
      {/* Header */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">{assignment.coursename}</p>
        <h3 className="text-3xl md:text-4xl font-serif font-black">{assignment.name}</h3>
        <div className="flex flex-wrap gap-4 mt-6">
          {assignment.duedate > 0 && (
            <span className="flex items-center gap-2 bg-muted px-4 py-2 border border-border text-xs font-mono uppercase tracking-widest">
              <Clock className="h-4 w-4 stroke-1" />
              Due: {formatDate(assignment.duedate)}
            </span>
          )}
          {assignment.grade > 0 && (
            <span className="flex items-center gap-2 bg-muted px-4 py-2 border border-border text-xs font-mono uppercase tracking-widest">
              <Star className="h-4 w-4 stroke-1" />
              Max grade: {assignment.grade}
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {assignment.intro && (
        <div className="bg-background p-6 border border-border">
          <h4 className="font-mono font-bold mb-4 pb-2 border-b border-border text-xs uppercase tracking-widest">Instructions</h4>
          <div
            className="text-base prose prose-neutral max-w-none font-body leading-relaxed"
            dangerouslySetInnerHTML={{ __html: assignment.intro }}
          />
        </div>
      )}

      {/* Submission status */}
      <div className="bg-background p-6 border border-border">
        <h4 className="font-mono font-bold mb-4 pb-2 border-b border-border text-xs uppercase tracking-widest">Current Submission</h4>
        {statusLoading ? (
          <div className="flex items-center gap-2 text-neutral-500 font-mono text-sm uppercase tracking-widest">
            <Loader2 className="h-4 w-4 animate-spin stroke-1" /> Loading...
          </div>
        ) : !status || status.status === 'new' ? (
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">No submission yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono uppercase tracking-widest px-4 py-1.5 border border-border ${
                status.submitted
                  ? 'bg-background text-foreground border-l-4 border-l-accent'
                  : 'bg-muted text-foreground'
              }`}>
                {status.submitted ? 'Submitted' : 'Draft'}
              </span>
              {status.graded && (
                <span className="text-xs font-mono uppercase tracking-widest px-4 py-1.5 bg-background text-foreground border border-border border-l-4 border-l-black">
                  Graded
                </span>
              )}
            </div>
            {status.timemodified && (
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">Last modified: {formatDate(status.timemodified)}</p>
            )}
            {status.files.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                {status.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-mono bg-muted border border-border px-4 py-3">
                    <FileText className="h-4 w-4 shrink-0 stroke-1" />
                    <span className="truncate">{f.filename}</span>
                    <span className="ml-auto shrink-0 text-neutral-500">{formatSize(f.filesize)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit new file */}
      <div className="bg-background p-6 border border-border">
        <h4 className="font-mono font-bold mb-6 pb-2 border-b border-border text-xs uppercase tracking-widest">
          {status?.submitted ? 'Resubmit' : 'Submit Assignment'}
        </h4>

        {success ? (
          <div className="flex items-center gap-3 text-foreground bg-muted border border-border border-l-4 border-l-foreground p-4">
            <CheckCircle className="h-5 w-5 shrink-0 stroke-1" />
            <span className="font-mono uppercase tracking-widest text-sm">Submission recorded in Moodle!</span>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm font-mono text-neutral-600 file:mr-4 file:py-3 file:px-6 file:border file:border-border file:text-xs file:uppercase file:tracking-widest file:font-mono file:bg-muted file:text-foreground hover:file:bg-foreground hover:file:text-background cursor-pointer transition-colors"
            />
            {file && (
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">{file.name} ({formatSize(file.size)})</p>
            )}
            {error && <p className="text-background text-xs font-mono uppercase tracking-widest bg-accent p-3 border border-border">{error}</p>}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex w-full justify-center items-center gap-3 py-4 px-6 bg-foreground hover:bg-background hover:text-foreground border border-transparent hover:border-border disabled:bg-muted disabled:border-border disabled:text-neutral-500 disabled:cursor-not-allowed text-background font-mono uppercase tracking-widest text-sm transition-all duration-200 mt-6"
            >
              {uploading
                ? <><Loader2 className="h-5 w-5 animate-spin stroke-1" /> Submitting...</>
                : <><UploadCloud className="h-5 w-5 stroke-1" /> Submit File</>}
            </button>
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 text-center mt-4 pt-4 border-t border-border border-dashed">
              Files uploaded directly to Moodle server.

            </p>
          </div>
        )}
      </div>
    </div>
  )
}
