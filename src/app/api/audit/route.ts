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
  const sanitizedDetails = details && typeof details === 'object' ? details : {}

  if (!action || !entityType) {
    return NextResponse.json({ error: 'Missing required fields: action and entityType are required' }, { status: 400 })
  }

  // If client submits an administrative action, ensure user is a superuser
  if (typeof action === 'string' && action.startsWith('admin.')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superuser')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_superuser) {
      return NextResponse.json({ error: 'Forbidden: administrative audit actions require superuser privileges' }, { status: 403 })
    }
  }

  await logServerAuditEvent({
    userId: user.id,
    userEmail: user.email,
    action: String(action).slice(0, 100),
    entityType: String(entityType).slice(0, 100),
    entityId: entityId ? String(entityId).slice(0, 200) : null,
    details: sanitizedDetails,
    req: request,
  })

  return NextResponse.json({ success: true })
}
