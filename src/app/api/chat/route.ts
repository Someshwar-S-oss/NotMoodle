import { createClient } from '@/utils/supabase/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, embed } from 'ai'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages, courseId } = await req.json()
    if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lastMessage = messages[messages.length - 1]

    // 1. Save user message to DB
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      course_id: courseId,
      role: 'user',
      content: lastMessage.content
    })

    const userApiKey = req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || ''
    const customGoogle = createGoogleGenerativeAI({
      apiKey: userApiKey,
    })

    // 2. Generate embedding for the user's question
    const { embedding } = await embed({
      model: customGoogle.textEmbeddingModel('gemini-embedding-2'),
      value: lastMessage.content,
    })

    // 3. Search Supabase for context chunks
    const { data: documents } = await supabase.rpc('match_course_embeddings', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 5,
      filter_course_id: courseId.toString()
    })

    const contextText = documents?.map((doc: any) => `[Source: ${doc.file_path}]\n${Buffer.from(doc.chunk_text, 'base64').toString('utf8')}`).join('\n\n---\n\n') || 'No direct course materials found.'
    
    const systemPrompt = `You are a helpful AI teaching assistant for a university course.
Use the following context extracted from the course documents to answer the student's question.
If the answer is not in the context, you can use your general knowledge, but clarify that it wasn't found in the course materials.
Format your answer nicely with Markdown.

Course Context:
${contextText}
`

    // 4. Generate AI response stream
    const result = await streamText({
      model: customGoogle('gemini-3.6-flash'),
      system: systemPrompt,
      messages,
      async onFinish({ text }) {
        // Save assistant message when the stream completes
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          course_id: courseId,
          role: 'assistant',
          content: text
        })
      }
    })

    return result.toDataStreamResponse()
    
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 })
  }
}
