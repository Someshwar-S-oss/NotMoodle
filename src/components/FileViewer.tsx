'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { Loader } from '@/components/kokonutui/loader'

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
      <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-border/40 bg-card/60 p-8 text-secondary shadow-xs" aria-live="polite" aria-busy="true">
        <Loader size="md" title="Loading file preview..." subtitle="fetching the latest version from storage" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-border/40 bg-card/60 p-8 text-center shadow-xs">
        <AlertCircle className="h-10 w-10 mb-3 text-destructive/80 stroke-[2px]" />
        <p className="text-lg font-semibold tracking-tight text-foreground mb-1">{error}</p>
        <p className="text-xs text-secondary mb-6">could not load preview</p>
        {fallbackUrl && (
          <a 
            href={fallbackUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/40 hover:bg-muted/70 transition-colors text-foreground text-xs font-medium cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 stroke-[2px]" />
            download original file
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full gap-2 sm:gap-3">
      {/* Sleek Lowkey Reader Toolbar */}
      <div className="flex justify-between items-center text-xs font-mono lowercase tracking-wider border-b border-border/40 pb-2.5 px-1 text-secondary">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isPdf ? 'Native Browser Preview' : 'Office Document Preview'}</span>
        </span>
        <div className="flex items-center gap-2">
          <a 
            href={fallbackUrl || previewUrl!} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:bg-muted/70 transition-colors text-foreground text-xs font-medium"
          >
            <ExternalLink className="h-3.5 w-3.5 stroke-[2px]" />
            <span>Download Direct</span>
          </a>
        </div>
      </div>

      {/* Maximized Full-Bleed Document Canvas */}
      <div className="w-full flex-1 h-[calc(100vh-140px)] rounded-lg md:rounded-xl border border-border/40 overflow-hidden shadow-sm bg-card relative">
        <iframe 
          src={previewUrl!} 
          className="w-full h-full border-0 bg-card relative z-10" 
          title={mod.name}
        />
      </div>
    </div>
  )
}
