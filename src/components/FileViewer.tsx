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
      const isPdfFile = filename.toLowerCase().endsWith('.pdf')
      setIsPdf(isPdfFile)

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
           if (isPdfFile) {
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
      if (isPdfFile) {
        setPreviewUrl(finalPublicUrl)
      } else {
        // Use Microsoft Office Online Viewer for PPTX, DOCX, XLSX
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
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin mb-6 text-indigo-500" />
        <p className="font-medium text-white">Syncing file securely...</p>
        <p className="text-xs mt-2 text-gray-500">Checking local cache and Moodle.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-400">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p className="font-semibold">{error}</p>
        <p className="text-xs text-gray-500 mt-2 mb-6">Could not load preview.</p>
        {fallbackUrl && (
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <ExternalLink className="h-4 w-4" />
            Download Original File
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-400">
          {isPdf ? 'PDF Preview' : 'Office Document Preview'}
        </span>
        <a 
          href={fallbackUrl || previewUrl!} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
        >
          <ExternalLink className="h-3 w-3" />
          Download Direct
        </a>
      </div>
      <div className="w-full h-[70vh] bg-gray-950 rounded-xl overflow-hidden border border-gray-800 shadow-inner">
        <iframe 
          src={previewUrl!} 
          className="w-full h-full border-0 bg-white" // bg-white necessary for some transparent PDFs/docs
          title={mod.name}
        />
      </div>
    </div>
  )
}
