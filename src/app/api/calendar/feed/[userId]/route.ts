import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  // We use the service role key because this endpoint is hit by external calendar apps (like Google Calendar)
  // which won't have the user's auth token headers.
  // The UUID itself acts as the "secret link" (v4 UUIDs are unguessable).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { userId } = await params
  
  const { data: conn } = await supabase.from('moodle_connections').select('cached_assignments').eq('user_id', userId).single()
  
  if (!conn) {
    return new NextResponse('User not found or not connected to Moodle', { status: 404 })
  }

  const assignments = conn.cached_assignments || []

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NotMoodle//Deadlines Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  for (const assignment of assignments) {
    if (assignment.duedate > 0) {
      const startDate = new Date(assignment.duedate * 1000)
      
      // ICS requires YYYYMMDDTHHMMSSZ format
      const startFormat = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      
      // Set end time to 1 hour after due date so it shows up as a block
      const endDate = new Date((assignment.duedate + 3600) * 1000)
      const endFormat = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:assign_${assignment.id}@notmoodle.com`,
        `SUMMARY:[Due] ${assignment.name}`,
        `DESCRIPTION:Course: ${assignment.coursename}`,
        `DTSTAMP:${startFormat}`,
        `DTSTART:${startFormat}`,
        `DTEND:${endFormat}`,
        'END:VEVENT'
      )
    }
  }

  icsContent.push('END:VCALENDAR')

  return new NextResponse(icsContent.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="notmoodle-deadlines.ics"`,
    },
  })
}
