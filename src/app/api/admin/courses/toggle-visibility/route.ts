import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { recordAuditLog } from '@/lib/audit-logger'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superuser')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_superuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { courseId, isHidden } = await req.json()
    if (typeof courseId !== 'number' || typeof isHidden !== 'boolean') {
      return NextResponse.json({ error: 'Invalid courseId or isHidden parameter' }, { status: 400 })
    }

    const { error } = await supabase
      .from('course_visibility')
      .update({
        is_hidden: isHidden,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('course_id', courseId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      action: 'admin.course_visibility',
      entityType: 'course',
      entityId: String(courseId),
      details: {
        courseId,
        isHidden,
      },
    })

    return NextResponse.json({ success: true, courseId, isHidden })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update visibility' }, { status: 500 })
  }
}
