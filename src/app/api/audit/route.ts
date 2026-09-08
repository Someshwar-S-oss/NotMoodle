import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logServerAuditEvent } from '@/lib/audit-logger'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, entityType, entityId, details } = body || {}

  if (!action || !entityType) {
    return NextResponse.json({ error: 'Missing required fields: action and entityType are required' }, { status: 400 })
  }

  await logServerAuditEvent({
    userId: user.id,
    userEmail: user.email,
    action,
    entityType,
    entityId,
    details,
    req: request,
  })

  return NextResponse.json({ success: true })
}
