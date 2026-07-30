import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assignments } = await request.json()

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Update the moodle_connections table with the cached assignments
    const { error } = await supabase
      .from('moodle_connections')
      .update({ 
        cached_assignments: assignments,
        last_sync: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('Supabase error caching assignments:', error)
      return NextResponse.json({ error: 'Failed to cache assignments' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error syncing assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
