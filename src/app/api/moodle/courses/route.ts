import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const MOODLE_BASE = 'https://hselearning.sriher.com'

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

  const token = conn.encrypted_token

  try {
    // Step 1: get userid from site info
    const infoRes = await fetch(
      `${MOODLE_BASE}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`
    )
    const info = await infoRes.json()
    if (info.exception) return NextResponse.json({ error: 'Moodle token invalid or expired' }, { status: 401 })

    // Step 2: get all enrolled courses
    const coursesRes = await fetch(
      `${MOODLE_BASE}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json&userid=${info.userid}`
    )
    const allCourses: any[] = await coursesRes.json()

    if (!Array.isArray(allCourses)) {
      return NextResponse.json({ error: 'Unexpected response from Moodle' }, { status: 502 })
    }

    // Step 3: filter to current courses only
    // A course is "current" if: now >= startdate AND (enddate == 0 OR now <= enddate)
    const nowSec = Math.floor(Date.now() / 1000)
    const currentCourses = allCourses.filter((c: any) => {
      const started = c.startdate === 0 || nowSec >= c.startdate
      const notEnded = c.enddate === 0 || nowSec <= c.enddate
      return started && notEnded
    })

    // Return key fields only
    const courses = currentCourses.map((c: any) => ({
      id: c.id,
      fullname: c.fullname,
      shortname: c.shortname,
      progress: c.progress ?? null,
      lastaccess: c.lastaccess ?? null,
      startdate: c.startdate,
      enddate: c.enddate,
      courseimage: c.courseimage ?? null,
    }))

    return NextResponse.json({ courses, total: allCourses.length })
  } catch (e) {
    console.error('[courses] fetch failed:', e)
    return NextResponse.json({ error: 'Failed to fetch courses from Moodle' }, { status: 502 })
  }
}
