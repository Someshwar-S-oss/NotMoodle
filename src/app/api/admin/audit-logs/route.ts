import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superuser')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_superuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limitParam = parseInt(searchParams.get('limit') || '50', 10)
  const offsetParam = parseInt(searchParams.get('offset') || '0', 10)
  const action = searchParams.get('action')
  const search = searchParams.get('search')

  const limit = isNaN(limitParam) || limitParam <= 0 ? 50 : limitParam
  const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (action) {
    query = query.ilike('action', action.includes('%') ? action : `${action}%`)
  }

  if (search) {
    query = query.or(`user_email.ilike.%${search}%,entity_id.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('[admin/audit-logs] Query failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    auditLogs: data || [],
    totalCount: count ?? (data?.length || 0),
  })
}
