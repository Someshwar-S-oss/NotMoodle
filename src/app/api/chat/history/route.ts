import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Map to Vercel AI SDK format
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: new Date(msg.created_at)
  }))

  return NextResponse.json(formattedMessages)
}
