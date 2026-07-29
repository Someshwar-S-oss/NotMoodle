import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conn } = await supabase
    .from('moodle_connections')
    .select('encrypted_token')
    .eq('user_id', user.id)
    .single()

  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  // 1. Get info to find userid
  const infoRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`)
  const info = await infoRes.json()
  if (info.exception) return NextResponse.json({ error: 'Moodle token invalid' }, { status: 401 })

  // 2. Get enrolled courses
  const coursesRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${info.userid}`)
  const courses = await coursesRes.json()
  
  if (!courses.length) return NextResponse.json({ assignments: [] })

  // 3. Get assignments for all courses
  const courseIds = courses.map((c: any) => `courseids[]=${c.id}`).join('&')
  const assignRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json&${courseIds}`)
  const assignData = await assignRes.json()

  // Flatten assignments
  const assignments = []
  for (const course of (assignData.courses || [])) {
    for (const assignment of course.assignments) {
      assignments.push({ ...assignment, coursename: course.fullname })
    }
  }

  // Sort by due date (ascending)
  assignments.sort((a, b) => a.duedate - b.duedate)

  return NextResponse.json({ assignments })
}
