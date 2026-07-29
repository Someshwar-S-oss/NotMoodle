import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Moodle requires URL encoded form data
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)
  formData.append('service', 'moodle_mobile_app')

  let moodleData: { token?: string; error?: string; errorcode?: string }
  try {
    const res = await fetch('https://hselearning.sriher.com/login/token.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const rawText = await res.text()
      console.error('[connect] Moodle returned non-JSON:', res.status, rawText.slice(0, 300))
      return NextResponse.json(
        { error: `Moodle server returned an unexpected response (HTTP ${res.status}). The server may be blocking requests from this region.` },
        { status: 502 }
      )
    }

    moodleData = await res.json()
  } catch (e) {
    console.error('[connect] Moodle fetch failed:', e)
    return NextResponse.json({ error: 'Could not reach Moodle server' }, { status: 502 })
  }

  if (moodleData.error) {
    // Surface the real Moodle error (e.g. "Invalid login, please try again")
    return NextResponse.json({ error: moodleData.error }, { status: 400 })
  }

  if (moodleData.token) {
    const { error: dbError } = await supabase
      .from('moodle_connections')
      .upsert(
        { user_id: user.id, encrypted_token: moodleData.token, last_sync: null },
        { onConflict: 'user_id' }
      )

    if (dbError) {
      console.error('[connect] DB upsert failed:', dbError)
      return NextResponse.json({ error: `Failed to save connection: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Failed to authenticate with Moodle' }, { status: 500 })
}

