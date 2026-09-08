import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logServerAuditEvent } from '@/lib/audit-logger'

// Token is obtained client-side (browser → Moodle) to avoid server IP blocks.
// This route only stores the already-obtained token in Supabase.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body = await request.json()
  const { token } = body

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const { error: dbError } = await supabase
    .from('moodle_connections')
    .upsert(
      { user_id: user.id, encrypted_token: token, last_sync: null },
      { onConflict: 'user_id' }
    )

  if (dbError) {
    console.error('[connect] DB upsert failed:', dbError)
    return NextResponse.json({ error: `Failed to save connection: ${dbError.message}` }, { status: 500 })
  }

  await logServerAuditEvent({
    userId: user.id,
    userEmail: user.email,
    action: 'moodle.connect',
    entityType: 'moodle_token',
    entityId: user.id,
    req: request,
  })

  return NextResponse.json({ success: true })
}


