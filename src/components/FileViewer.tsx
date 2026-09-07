'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'

export function FileViewer({ mod, courseId, token }: { mod: any, courseId: number, token: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  useEffect(() => {
    handleFile()
  }, [mod.id])

  const handleFile = async () => {
    setLoading(true)
    setError(null)
    try {
      const fileContent = mod.contents?.[0]
      if (!fileContent?.fileurl) throw new Error("No file URL found in module")

      const filename = fileContent.filename || 'document.pdf'
      const ext = filename.toLowerCase().split('.').pop() || ''
      const isNativeFile = ['pdf', 'csv', 'txt', 'png', 'jpg', 'jpeg'].includes(ext)
      setIsPdf(isNativeFile)

      const moodleUrl = fileContent.fileurl.includes('?') 
        ? `${fileContent.fileurl}&token=${token}` 
        : `${fileContent.fileurl}?token=${token}`
        
      setFallbackUrl(moodleUrl) // Just in case user needs to download it directly

      const supabase = createClient()
      const bucket = 'course_files'
      
      // Sanitize filename to avoid Supabase upload/URL encoding issues with spaces or special chars
      const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `course_${courseId}_mod_${mod.id}_${safeFilename}`

      // 1. Check if we already have this file in Supabase
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      let finalPublicUrl = publicData.publicUrl

      // Check if it's actually there by doing a quick HEAD request (optional, but robust)
      const headCheck = await fetch(finalPublicUrl, { method: 'HEAD' })
      
      if (!headCheck.ok) {
        // 2. If it doesn't exist, we download it via the user's browser
        const response = await fetch(moodleUrl)
        if (!response.ok) throw new Error("Failed to download file from Moodle")
        const blob = await response.blob()

        // 3. Upload to Supabase for caching and fast preview reuse
        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false // Don't overwrite if it was just uploaded by someone else
        })

        if (uploadError && uploadError.message !== 'The resource already exists') {
           console.error("Supabase upload error:", uploadError)
           // If Supabase upload fails (e.g. bucket doesn't exist yet), fallback to local preview for PDFs
           if (isNativeFile) {
             // For PDFs we can just use the blob URL directly in the browser!
             setPreviewUrl(URL.createObjectURL(blob))
             setLoading(false)
             return
           } else {
             throw new Error(`Upload failed: ${uploadError.message}`)
           }
        }
      }

      // 4. Generate the preview URL
      if (isNativeFile) {
        setPreviewUrl(finalPublicUrl)
      } else {
        // Use Microsoft Office Online Viewer for PPTX, DOCX, XLSX, PPT, DOC, XLS
        // Note: Office Viewer requires the URL to be fully public
        setPreviewUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(finalPublicUrl)}`)
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 rounded-xl border border-border/30 bg-card/60 p-8 text-secondary shadow-xs" aria-live="polite" aria-busy="true">
        <Loader2 className="h-9 w-9 animate-spin mb-4 text-foreground/80" />
        <p className="font-semibold text-foreground text-sm tracking-wide">Loading file preview...</p>
        <p className="text-xs mt-1 text-secondary">Fetching the latest version from storage.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border/30 bg-card/60 p-8 text-center shadow-xs">
        <AlertCircle className="h-10 w-10 mb-4 text-destructive/80 stroke-[2px]" />
        <p className="clash-title text-xl uppercase tracking-wide text-foreground mb-1">{error}</p>
        <p className="text-xs text-secondary mt-1 mb-6">Could not load preview.</p>
        {fallbackUrl && (
          <a 
            href={fallbackUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors text-foreground text-xs font-medium cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 stroke-[2px]" />
            Download Original File
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full">
      <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider border-b border-border/30 pb-3 text-secondary">
        <span>
          {isPdf ? 'Native Browser Preview' : 'Office Document Preview'}
        </span>
        <a 
          href={fallbackUrl || previewUrl!} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors text-foreground text-xs font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5 stroke-[2px]" />
          Download Direct
        </a>
      </div>
      <div className="w-full h-[calc(100vh-180px)] rounded-xl border border-border/40 overflow-hidden shadow-md bg-card relative">
        <iframe 
          src={previewUrl!} 
          className="w-full h-full border-0 bg-card relative z-10" 
          title={mod.name}
        />
      </div>
    </div>
  )
}
