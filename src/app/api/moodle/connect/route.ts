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

  const res = await fetch('https://hselearning.sriher.com/login/token.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  })

  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 })
  }

  if (data.token) {
    // For MVP we just store the plaintext token, encryption should be added here
    // using pgp_sym_encrypt or edge crypto.
    const { error: dbError } = await supabase.from('moodle_connections').upsert({
      user_id: user.id,
      encrypted_token: data.token, // TODO: Add actual symmetric encryption
      last_sync: null
    })

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Failed to authenticate with Moodle' }, { status: 500 })
}
