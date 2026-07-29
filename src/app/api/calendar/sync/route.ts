import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { google } from 'googleapis'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Fetch user's stored Google Provider Token from Supabase
  // Note: To make this work fully, the user must log in via Google OAuth
  // and we must capture the provider_token and refresh_token in Supabase.
  const { data: profile } = await supabase.from('profiles').select('google_refresh_token').eq('id', user.id).single()
  
  if (!profile?.google_refresh_token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_SITE_URL
  )
  
  oauth2Client.setCredentials({
    refresh_token: profile.google_refresh_token
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // 2. Fetch assignments from Moodle (or our DB cache)
  const { data: conn } = await supabase.from('moodle_connections').select('encrypted_token').eq('user_id', user.id).single()
  if (!conn) return NextResponse.json({ error: 'Moodle not connected' }, { status: 404 })

  const assignRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json`)
  const assignData = await assignRes.json()

  let eventsCreated = 0

  if (assignData.courses) {
    for (const course of assignData.courses) {
      for (const assignment of course.assignments) {
        if (assignment.duedate > 0) {
          try {
            await calendar.events.insert({
              calendarId: 'primary',
              requestBody: {
                summary: `[Moodle] ${assignment.name}`,
                description: `Course: ${course.fullname}\n\nDue Date: ${new Date(assignment.duedate * 1000).toLocaleString()}`,
                start: { dateTime: new Date(assignment.duedate * 1000).toISOString() },
                end: { dateTime: new Date((assignment.duedate + 3600) * 1000).toISOString() },
                reminders: {
                  useDefault: false,
                  overrides: [{ method: 'popup', minutes: 24 * 60 }], // 1 day before
                },
              },
            })
            eventsCreated++
          } catch (err) {
            console.error('Failed to create calendar event', err)
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, eventsCreated })
}
