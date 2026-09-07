'use client'

import { useState, useEffect, useRef } from 'react'
import { UploadCloud, CheckCircle, Loader2, FileText, Clock, Star, Download, ExternalLink, AlertTriangle, AlertCircle, X } from 'lucide-react'
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
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0])
      setError('')
    }
  }

  const formatDate = (ts: number) =>
    ts ? new Date(ts * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Calculate remaining time or overdue status
  const getTimeRemaining = (duedate: number) => {
    if (!duedate || duedate <= 0) return null
    const now = Date.now()
    const diffMs = duedate * 1000 - now
    if (diffMs < 0) {
      const overdueHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
      if (overdueHours < 24) {
        return `Overdue by ${Math.max(1, overdueHours)}h`
      }
      const overdueDays = Math.floor(overdueHours / 24)
      return `Overdue by ${overdueDays}d`
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 24) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      if (diffHours < 1) return `${Math.max(1, diffMins)}m left`
      return `${diffHours}h ${diffMins % 60}m left`
    }
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d left`
  }

  const isSubmitted = status?.submitted ?? false
  const timeRemaining = assignment.duedate ? getTimeRemaining(assignment.duedate) : null
  const isOverdue = assignment.duedate && assignment.duedate * 1000 < Date.now()

  // Construct Moodle direct assignment URL
  const moodleAssignUrl = assignment.cmid
    ? `https://hselearning.sriher.com/mod/assign/view.php?id=${assignment.cmid}`
    : assignment.url
      ? assignment.url
      : `https://hselearning.sriher.com/mod/assign/view.php?id=${assignment.id}`

  return (
    <div className="space-y-8 text-foreground font-sans">
      {/* Prominent Submission Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border/20">
        <div>
          {statusLoading ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-card text-tertiary border border-border/30 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking submission status...
            </div>
          ) : isSubmitted ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/30 shadow-xs">
              <CheckCircle className="h-4 w-4 shrink-0 stroke-[2.5px]" />
              <span>Submitted for grading</span>
            </div>
          ) : (
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border shadow-xs ${
              isOverdue
                ? 'bg-[var(--urgency-overdue-bg)] text-[var(--urgency-overdue)] border-[var(--urgency-overdue-border)]'
                : 'bg-[var(--urgency-today-bg)] text-[var(--urgency-today)] border-[var(--urgency-today-border)]'
            }`}>
              {isOverdue ? (
                <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5px]" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5px]" />
              )}
              <span>Pending submission</span>
              {timeRemaining && (
                <span className="opacity-90 font-mono text-[11px] font-semibold">
                  • {timeRemaining}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Button: Open in Moodle */}
        <a
          href={moodleAssignUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs shadow-xs inline-flex items-center gap-2 transition-all group"
        >
          <span>Open in Moodle</span>
          <ExternalLink className="h-3.5 w-3.5 stroke-[2px] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>

      {/* Assignment Title & Clean Monospace Due Date Hierarchy */}
      <div className="space-y-4">
        <div>
          {assignment.coursename && (
            <p className="text-xs font-bold uppercase tracking-widest text-tertiary mb-2">
              {assignment.coursename}
            </p>
          )}
          <h3 className="clash-title text-2xl md:text-4xl uppercase tracking-wide leading-tight text-foreground">
            {assignment.name}
          </h3>
        </div>

        {/* Due date and Grade Meta Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {assignment.duedate > 0 && (
            <div className="rounded-xl border border-border/30 bg-card/50 p-4 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted/60 text-foreground shrink-0">
                <Clock className="h-4 w-4 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-tertiary">Due Date</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {formatDate(assignment.duedate)}
                </span>
                {timeRemaining && (
                  <span className={`block text-xs font-medium mt-0.5 ${isOverdue ? 'text-[var(--urgency-overdue)]' : 'text-secondary'}`}>
                    {timeRemaining}
                  </span>
                )}
              </div>
            </div>
          )}

          {assignment.grade > 0 && (
            <div className="rounded-xl border border-border/30 bg-card/50 p-4 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted/60 text-foreground shrink-0">
                <Star className="h-4 w-4 stroke-[2px]" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-tertiary">Grading</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  Max grade: {assignment.grade}
                </span>
                {assignment.cutoffdate > 0 && (
                  <span className="block text-xs font-medium text-tertiary mt-0.5">
                    Cutoff: {formatDate(assignment.cutoffdate)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions & Elevated Attachment Cards */}
      {(assignment.intro || (assignment.introattachments && assignment.introattachments.length > 0)) && (
        <div className="bg-card p-6 border border-border/30 rounded-xl shadow-xs space-y-5">
          <h4 className="font-bold pb-2 border-b border-border/20 text-xs uppercase tracking-widest text-foreground">
            Instructions & Attachments
          </h4>

          {assignment.intro && (
            <div
              className="text-sm md:text-base prose prose-sm max-w-none text-foreground/90 prose-p:leading-relaxed prose-headings:clash-title prose-headings:uppercase prose-a:text-foreground prose-a:underline"
              dangerouslySetInnerHTML={{ __html: assignment.intro }}
            />
          )}

          {assignment.introattachments && assignment.introattachments.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-tertiary block">
                Assignment Files ({assignment.introattachments.length})
              </span>
              <div className="grid grid-cols-1 gap-3">
                {assignment.introattachments.map((attachment: any, i: number) => {
                  let fileUrlStr = attachment.fileurl
                  try {
                    const parsed = new URL(attachment.fileurl)
                    if (moodleToken) parsed.searchParams.set('token', moodleToken)
                    fileUrlStr = parsed.toString()
                  } catch {
                    // Fallback to raw fileurl if relative
                  }

                  return (
                    <a
                      key={i}
                      href={fileUrlStr}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-background/50 hover:bg-muted/40 border border-border/30 hover:border-border transition-all shadow-xs group cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-muted text-foreground shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
                        <FileText className="h-4 w-4 stroke-[2px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground truncate group-hover:text-foreground">
                          {attachment.filename}
                        </span>
                        <span className="block text-[11px] font-mono text-tertiary">
                          {formatSize(attachment.filesize)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg text-tertiary group-hover:text-foreground transition-colors shrink-0">
                        <Download className="h-4 w-4 stroke-[2px]" />
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Submission status */}
      <div className="bg-card p-6 border border-border/30 rounded-xl shadow-xs">
        <h4 className="font-bold mb-4 pb-2 border-b border-border/20 text-xs uppercase tracking-widest text-foreground">
          Current Submission
        </h4>
        {statusLoading ? (
          <div className="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-widest py-4">
            <Loader2 className="h-4 w-4 animate-spin stroke-[2px]" /> Loading submission info...
          </div>
        ) : !status || status.status === 'new' ? (
          <p className="text-secondary font-medium text-sm py-2">No submission recorded on Moodle yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full ${
                status.submitted
                  ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/30'
                  : 'bg-muted text-foreground border border-border/40'
              }`}>
                {status.submitted ? 'Submitted' : 'Draft'}
              </span>
              {status.graded && (
                <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-card text-foreground border border-border/40 shadow-xs">
                  Graded
                </span>
              )}
            </div>
            {status.timemodified && (
              <p className="text-xs font-mono text-tertiary">Last modified: {formatDate(status.timemodified)}</p>
            )}
            {status.files.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border/20 pt-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-tertiary block">Submitted Files</span>
                {status.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-medium bg-background border border-border/30 rounded-xl p-3 shadow-xs">
                    <FileText className="h-4 w-4 shrink-0 stroke-[2px] text-tertiary" />
                    <span className="truncate text-foreground">{f.filename}</span>
                    <span className="ml-auto shrink-0 text-tertiary font-mono text-[11px]">{formatSize(f.filesize)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit or Resubmit new file */}
      <div className="bg-card p-6 border border-border/30 rounded-xl shadow-xs">
        <h4 className="font-bold mb-4 pb-2 border-b border-border/20 text-xs uppercase tracking-widest text-foreground">
          {status?.submitted ? 'Resubmit Assignment' : 'Submit Assignment'}
        </h4>

        {success ? (
          <div className="flex items-center gap-3 text-foreground bg-[var(--status-success-bg)] border border-[var(--status-success)]/40 p-4 rounded-xl shadow-xs">
            <CheckCircle className="h-5 w-5 shrink-0 stroke-[2px] text-[var(--status-success)]" />
            <span className="font-bold tracking-wide text-xs text-[var(--status-success)]">Submitted successfully to Moodle!</span>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => {
                setFile(e.target.files?.[0] || null)
                setError('')
              }}
              className="hidden"
              aria-label="Upload assignment file"
            />

            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDragging
                    ? 'border-foreground bg-muted/60 scale-[1.01]'
                    : 'border-border/40 hover:border-border hover:bg-muted/30 bg-background/50'
                }`}
              >
                <div className="p-3.5 rounded-2xl bg-muted text-foreground mb-3 transition-transform duration-200 hover:scale-105">
                  <UploadCloud className="h-6 w-6 stroke-[2px]" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Drag and drop your assignment file here, or <span className="underline underline-offset-4 decoration-border hover:decoration-foreground font-semibold">click to browse</span>
                </p>
                <p className="text-xs text-tertiary mt-1.5 font-sans">
                  Supports PDF, DOCX, ZIP up to university file limit
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border/40 bg-card flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-muted text-foreground shrink-0">
                    <FileText className="h-5 w-5 stroke-[2px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-muted/80 text-tertiary mt-0.5">
                      {formatSize(file.size)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  aria-label="Remove selected file"
                  className="p-1.5 rounded-lg text-tertiary hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-[2px]" />
                </button>
              </div>
            )}

            {error && <p className="text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">{error}</p>}
            
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full rounded-xl py-3 px-6 bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin stroke-[2px]" /> Submitting...</>
                : <><UploadCloud className="h-4 w-4 stroke-[2px]" /> Submit File</>}
            </button>
            <p className="text-[11px] text-tertiary text-center mt-4 pt-3 border-t border-dashed border-border/30">
              Direct submission to university Moodle servers.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
