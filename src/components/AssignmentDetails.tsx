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
  const [moodleToken, setMoodleToken] = useState<string>('')

  useEffect(() => {
    loadStatus()
  }, [assignment.id])

  const loadStatus = async () => {
    setStatusLoading(true)
    try {
      const token = await getMoodleToken()
      setMoodleToken(token)
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
    <div className="space-y-8 text-foreground font-sans">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">{assignment.coursename}</p>
        <h3 className="clash-title text-3xl md:text-5xl uppercase tracking-wide leading-none">{assignment.name}</h3>
        <div className="flex flex-wrap gap-4 mt-6">
          {assignment.duedate > 0 && (
            <span className="flex items-center gap-2 bg-[#f2f2f2] px-4 py-2 border-2 border-[#111111] text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_rgba(17,17,17,1)]">
              <Clock className="h-4 w-4 stroke-[2px]" />
              Due: {formatDate(assignment.duedate)}
            </span>
          )}
          {assignment.grade > 0 && (
            <span className="flex items-center gap-2 bg-[#f2f2f2] px-4 py-2 border-2 border-[#111111] text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_rgba(17,17,17,1)]">
              <Star className="h-4 w-4 stroke-[2px]" />
              Max grade: {assignment.grade}
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {(assignment.intro || (assignment.introattachments && assignment.introattachments.length > 0)) && (
        <div className="bg-white p-6 border-2 border-[#111111] shadow-[4px_4px_0px_rgba(17,17,17,1)]">
          <h4 className="font-bold mb-4 pb-2 border-b-2 border-[#111111] text-xs uppercase tracking-widest">Instructions & Attachments</h4>
          {assignment.intro && (
            <div
              className="text-base prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:clash-title prose-headings:uppercase prose-a:text-[#111111] prose-a:font-bold mb-6"
              dangerouslySetInnerHTML={{ __html: assignment.intro }}
            />
          )}
          {assignment.introattachments && assignment.introattachments.length > 0 && (
            <div className="space-y-3">
              {assignment.introattachments.map((attachment: any, i: number) => {
                const url = new URL(attachment.fileurl)
                if (moodleToken) url.searchParams.set('token', moodleToken)
                
                return (
                  <a 
                    key={i} 
                    href={url.toString()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm font-medium bg-[#f2f2f2] hover:bg-[#111111] hover:text-white border-2 border-[#111111] shadow-[2px_2px_0px_rgba(17,17,17,1)] px-4 py-3 transition-colors group"
                  >
                    <FileText className="h-4 w-4 shrink-0 stroke-[2px] group-hover:text-white" />
                    <span className="truncate">{attachment.filename}</span>
                    <span className="ml-auto shrink-0 opacity-60 font-bold text-[10px] uppercase tracking-widest">
                      {formatSize(attachment.filesize)}
                    </span>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Submission status */}
      <div className="bg-white p-6 border-2 border-[#111111] shadow-[4px_4px_0px_rgba(17,17,17,1)]">
        <h4 className="font-bold mb-4 pb-2 border-b-2 border-[#111111] text-xs uppercase tracking-widest">Current Submission</h4>
        {statusLoading ? (
          <div className="flex items-center gap-2 text-[#111111]/50 font-bold text-xs uppercase tracking-widest">
            <Loader2 className="h-4 w-4 animate-spin stroke-[2px]" /> Loading...
          </div>
        ) : !status || status.status === 'new' ? (
          <p className="text-[#111111]/60 font-bold text-xs uppercase tracking-widest">No submission yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 border-2 border-[#111111] ${
                status.submitted
                  ? 'bg-[#111111] text-white shadow-[2px_2px_0px_rgba(17,17,17,1)]'
                  : 'bg-[#f2f2f2] text-[#111111]'
              }`}>
                {status.submitted ? 'Submitted' : 'Draft'}
              </span>
              {status.graded && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 bg-white text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_rgba(17,17,17,1)]">
                  Graded
                </span>
              )}
            </div>
            {status.timemodified && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/60">Last modified: {formatDate(status.timemodified)}</p>
            )}
            {status.files.length > 0 && (
              <div className="mt-4 space-y-2 border-t-2 border-[#111111] pt-4">
                {status.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-medium bg-[#f2f2f2] border-2 border-[#111111] shadow-[2px_2px_0px_rgba(17,17,17,1)] px-4 py-3">
                    <FileText className="h-4 w-4 shrink-0 stroke-[2px]" />
                    <span className="truncate">{f.filename}</span>
                    <span className="ml-auto shrink-0 text-[#111111]/60 font-bold text-[10px] uppercase tracking-widest">{formatSize(f.filesize)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit new file */}
      <div className="bg-white p-6 border-2 border-[#111111] shadow-[4px_4px_0px_rgba(17,17,17,1)]">
        <h4 className="font-bold mb-6 pb-2 border-b-2 border-[#111111] text-xs uppercase tracking-widest">
          {status?.submitted ? 'Resubmit' : 'Submit Assignment'}
        </h4>

        {success ? (
          <div className="flex items-center gap-3 text-[#111111] bg-white border-2 border-[#111111] border-l-8 border-l-[#111111] p-4 shadow-[4px_4px_0px_rgba(17,17,17,1)]">
            <CheckCircle className="h-5 w-5 shrink-0 stroke-[2px]" />
            <span className="font-bold uppercase tracking-widest text-[10px]">Submission recorded in Moodle!</span>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs font-medium text-[#111111]/70 file:mr-4 file:py-3 file:px-6 file:border-2 file:border-[#111111] file:text-[10px] file:uppercase file:tracking-widest file:font-bold file:bg-[#f2f2f2] file:text-[#111111] hover:file:bg-[#111111] hover:file:text-white cursor-pointer transition-colors"
            />
            {file && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/70">{file.name} ({formatSize(file.size)})</p>
            )}
            {error && <p className="text-white text-[10px] font-bold uppercase tracking-widest bg-red-600 p-3 border-2 border-[#111111] shadow-[2px_2px_0px_rgba(17,17,17,1)]">{error}</p>}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex w-full justify-center items-center gap-3 py-4 px-6 bg-[#111111] border-2 border-[#111111] shadow-[4px_4px_0px_rgba(17,17,17,1)] text-white hover:bg-white hover:text-[#111111] active:translate-y-1 active:shadow-none disabled:bg-[#f2f2f2] disabled:border-transparent disabled:shadow-none disabled:text-[#111111]/30 disabled:cursor-not-allowed font-bold uppercase tracking-widest text-xs transition-all duration-200 mt-6"
            >
              {uploading
                ? <><Loader2 className="h-5 w-5 animate-spin stroke-[2px]" /> Submitting...</>
                : <><UploadCloud className="h-5 w-5 stroke-[2px]" /> Submit File</>}
            </button>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 text-center mt-6 pt-4 border-t-2 border-[#111111] border-dashed">
              Files uploaded directly to Moodle server.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
