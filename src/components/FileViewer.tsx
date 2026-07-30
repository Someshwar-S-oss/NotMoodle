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

        // 3. Upload to Supabase (this also serves as the trigger for our AI RAG worker later)
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
      <div className="flex flex-col items-center justify-center py-32 text-foreground/50 border-2 border-[#111111] bg-white shadow-[4px_4px_0px_rgba(17,17,17,1)]">
        <Loader2 className="h-10 w-10 animate-spin mb-6 stroke-[2px] text-[#111111]" />
        <p className="font-bold text-[#111111] uppercase tracking-widest text-sm">Syncing file securely...</p>
        <p className="text-[10px] mt-2 font-bold uppercase tracking-widest text-[#111111]/50">Checking local cache and Moodle.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#111111] text-white border-2 border-[#111111] shadow-[8px_8px_0px_rgba(17,17,17,1)] p-6">
        <AlertCircle className="h-12 w-12 mb-6 stroke-[2px]" />
        <p className="clash-title text-2xl uppercase text-center">{error}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-2 mb-8 text-white/50">Could not load preview.</p>
        {fallbackUrl && (
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white text-[#111111] hover:bg-[#f2f2f2] border-2 border-[#111111] transition-colors font-bold text-xs uppercase tracking-widest shadow-[4px_4px_0px_rgba(242,242,242,0.2)]">
            <ExternalLink className="h-4 w-4 stroke-[2px]" />
            Download Original File
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest border-b-2 border-[#111111] pb-3">
        <span className="text-[#111111]/60">
          {isPdf ? 'Native Browser Preview' : 'Office Document Preview'}
        </span>
        <a 
          href={fallbackUrl || previewUrl!} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[#111111] hover:text-[#111111]/70 transition-colors"
        >
          <ExternalLink className="h-4 w-4 stroke-[2px]" />
          Download Direct
        </a>
      </div>
      <div className="w-full h-[calc(100vh-180px)] bg-white border-2 border-[#111111] shadow-[8px_8px_0px_rgba(17,17,17,1)] relative overflow-hidden">
        <iframe 
          src={previewUrl!} 
          className="w-full h-full border-0 bg-white relative z-10" 
          title={mod.name}
        />
      </div>
    </div>
  )
}
