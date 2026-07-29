import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conn } = await supabase.from('moodle_connections').select('encrypted_token').eq('user_id', user.id).single()
  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  // 1. Get info
  const infoRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`)
  const info = await infoRes.json()
  
  if (info.exception) return NextResponse.json({ error: 'Token invalid' }, { status: 401 })

  // 2. Get courses
  const coursesRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${info.userid}`)
  const courses = await coursesRes.json()

  let searchItems: any[] = []

  // 3. For each course, get contents
  for (const course of courses) {
    searchItems.push({
      id: `course_${course.id}`,
      type: 'course',
      title: course.fullname,
      course: course.fullname,
      url: `/course/${course.id}`
    })

    const contentsRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${course.id}`)
    const contents = await contentsRes.json()

    if (Array.isArray(contents)) {
      for (const section of contents) {
        for (const module of section.modules || []) {
          searchItems.push({
            id: `mod_${module.id}`,
            type: module.modname, // 'resource', 'forum', 'assign', etc.
            title: module.name,
            course: course.fullname,
            url: module.url || `/mod/${module.id}`
          })
        }
      }
    }
  }

  return NextResponse.json({ items: searchItems })
}
