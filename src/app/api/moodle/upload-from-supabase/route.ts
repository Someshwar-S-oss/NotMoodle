import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const maxDuration = 60; // Allow enough time for downloading and uploading

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, filepath, filename } = body

    if (!token || !filepath || !filename) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Ensure the user is authenticated (security check)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('submissions')
      .download(filepath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download staged file from Supabase' }, { status: 500 })
    }

    // Prepare form data for Moodle
    const formData = new FormData()
    formData.append('file', fileData, filename)

    // Send the file to Moodle
    const moodleRes = await fetch(`https://hselearning.sriher.com/webservice/upload.php?token=${token}`, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    })

    const text = await moodleRes.text()

    // Clean up: delete the temporary file from Supabase regardless of Moodle's success
    await supabase.storage.from('submissions').remove([filepath])

    if (!moodleRes.ok) {
      return NextResponse.json({ error: `Moodle returned ${moodleRes.status}`, details: text }, { status: moodleRes.status })
    }

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON from Moodle', details: text }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Supabase Proxy Upload Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
