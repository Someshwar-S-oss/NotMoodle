import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Returns the stored Moodle token to the authenticated user so the browser
// can call Moodle APIs directly (bypassing Vercel's IP block).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conn } = await supabase
    .from('moodle_connections')
    .select('encrypted_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  return NextResponse.json({ token: conn.encrypted_token })
}
