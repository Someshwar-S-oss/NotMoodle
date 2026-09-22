import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: courses, error } = await supabase
    .from('course_visibility')
    .select('course_id, fullname, shortname, is_hidden, updated_at')
    .order('fullname', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ courses: courses || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const inputCourses = body.courses || []
    if (!Array.isArray(inputCourses) || inputCourses.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Fetch existing records to avoid overwriting is_hidden
    const courseIds = inputCourses.map((c: any) => Number(c.id)).filter(id => !isNaN(id))
    const { data: existing } = await supabase
      .from('course_visibility')
      .select('course_id, is_hidden')
      .in('course_id', courseIds)

    const existingMap = new Map((existing || []).map((r: any) => [r.course_id, r.is_hidden]))

    const rows = inputCourses.map((c: any) => ({
      course_id: Number(c.id),
      fullname: String(c.fullname || ''),
      shortname: c.shortname ? String(c.shortname) : '',
      is_hidden: existingMap.has(Number(c.id)) ? existingMap.get(Number(c.id)) : false,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('course_visibility')
      .upsert(rows, { onConflict: 'course_id', ignoreDuplicates: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 })
  }
}
