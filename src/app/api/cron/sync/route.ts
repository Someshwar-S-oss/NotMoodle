import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: connections, error } = await supabase.from('moodle_connections').select('user_id, encrypted_token')
  if (error || !connections) return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })

  let notificationsGenerated = 0

  await Promise.all(connections.map(async (conn) => {
    try {
      const msgRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_message_get_messages&moodlewsrestformat=json&type=conversations&read=0`)
      const msgData = await msgRes.json()
      
      if (msgData && msgData.messages && msgData.messages.length > 0) {
        for (const msg of msgData.messages) {
          const moodleRef = `msg_${msg.id}`
          const { data: existing } = await supabase.from('notifications').select('id').eq('moodle_ref_id', moodleRef).single()
          
          if (!existing) {
            await supabase.from('notifications').insert({
              user_id: conn.user_id,
              type: 'message',
              title: `New Message from ${msg.userfromfullname}`,
              message: msg.text,
              moodle_ref_id: moodleRef
            })
            notificationsGenerated++
          }
        }
      }
    } catch (e) {
      console.error(`Failed to sync for user ${conn.user_id}`, e)
    }
  }))

  return NextResponse.json({ success: true, notificationsGenerated })
}
