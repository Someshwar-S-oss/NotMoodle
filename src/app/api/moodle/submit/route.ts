import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conn } = await supabase.from('moodle_connections').select('encrypted_token').eq('user_id', user.id).single()
  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  const contentType = request.headers.get('content-type') || ''
  
  let fileData: Blob | null = null
  let filename = ''
  let assignmentId = ''
  let supabaseFilePath = ''
  let success = false
  let errorMessage = ''

  try {
    // Determine if hybrid direct upload (FormData) or Supabase Staging (JSON)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as Blob
      assignmentId = formData.get('assignmentId') as string
      if (!file || !assignmentId) throw new Error('Missing file or assignmentId')
      fileData = file
      filename = (file as File).name || 'submission.file'
    } else {
      const body = await request.json()
      assignmentId = body.assignmentId
      supabaseFilePath = body.supabaseFilePath
      filename = body.filename
      if (!assignmentId || !supabaseFilePath || !filename) throw new Error('Missing parameters')
      
      const { data: downloaded, error: downloadError } = await supabase.storage.from('submissions').download(supabaseFilePath)
      if (downloadError || !downloaded) throw new Error('Failed to retrieve file from staging')
      fileData = downloaded
    }

    // Upload to Moodle upload.php
    const moodleFormData = new FormData()
    moodleFormData.append('file', fileData, filename)

    const uploadRes = await fetch(`https://hselearning.sriher.com/webservice/upload.php?token=${conn.encrypted_token}`, {
      method: 'POST',
      body: moodleFormData
    })
    
    const uploadJson = await uploadRes.json()
    if (uploadJson.error) throw new Error(uploadJson.error)
    if (!Array.isArray(uploadJson) || !uploadJson[0]?.itemid) throw new Error('Upload to Moodle failed')
    
    const itemid = uploadJson[0].itemid

    // Save Submission
    const submitForm = new URLSearchParams()
    submitForm.append('assignmentid', assignmentId.toString())
    submitForm.append('plugindata[files_filemanager]', itemid.toString())

    const saveRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=mod_assign_save_submission&moodlewsrestformat=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: submitForm.toString()
    })
    
    const saveJson = await saveRes.json()
    if (saveJson && saveJson.exception) throw new Error(saveJson.message || 'Save submission failed')

    success = true
  } catch (error: any) {
    errorMessage = error.message || 'An unknown error occurred'
  } finally {
    // AGGRESSIVE CLEANUP: If we staged in Supabase, always delete it now
    if (supabaseFilePath) {
      await supabase.storage.from('submissions').remove([supabaseFilePath])
    }
  }

  if (success) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
