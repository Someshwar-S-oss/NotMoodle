import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assignmentId, supabaseFilePath, filename } = await request.json()
  if (!assignmentId || !supabaseFilePath || !filename) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // 1. Get Moodle Token
  const { data: conn } = await supabase.from('moodle_connections').select('encrypted_token').eq('user_id', user.id).single()
  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  let success = false
  let errorMessage = ''

  try {
    // 2. Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage.from('submissions').download(supabaseFilePath)
    if (downloadError || !fileData) throw new Error('Failed to retrieve file from staging')

    // 3. Upload to Moodle upload.php
    const formData = new FormData()
    formData.append('file', fileData as Blob, filename)

    const uploadRes = await fetch(`https://hselearning.sriher.com/webservice/upload.php?token=${conn.encrypted_token}`, {
      method: 'POST',
      body: formData
    })
    
    // Moodle upload.php returns an array of file records
    const uploadJson = await uploadRes.json()
    if (uploadJson.error) throw new Error(uploadJson.error)
    if (!Array.isArray(uploadJson) || !uploadJson[0]?.itemid) throw new Error('Upload to Moodle failed - no itemid returned')
    
    const itemid = uploadJson[0].itemid

    // 4. Save Submission
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
    // 5. AGGRESSIVE CLEANUP: Always delete from Supabase staging
    await supabase.storage.from('submissions').remove([supabaseFilePath])
  }

  if (success) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
