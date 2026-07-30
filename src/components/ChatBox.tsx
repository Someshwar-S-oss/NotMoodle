'use client'

import { useEffect, useState, useRef } from 'react'
import { useChat, type Message } from 'ai/react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ChatBox({ courseId, courseName }: { courseId: string; courseName?: string }) {
  const [initialMessages, setInitialMessages] = useState<Message[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    setApiKey(localStorage.getItem('notmoodle_gemini_key') || '')
    // Fetch chat history for this course
    fetch(`/api/chat/history?courseId=${courseId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setInitialMessages(data)
      })
      .finally(() => setLoadingHistory(false))
  }, [courseId])

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { courseId },
    headers: { 'x-gemini-api-key': apiKey },
    initialMessages,
  })

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[400px] text-neutral-500 font-mono text-sm uppercase tracking-widest">
        <Loader2 className="h-6 w-6 animate-spin mr-3 stroke-1 text-foreground" />
        Loading chat history...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-white relative min-h-0">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/10 shrink-0 bg-background">
        <div className="flex items-center gap-4">
          <div className="p-2 border border-border/20 bg-[#f2f2f2] text-[#111111]">
            <Sparkles className="h-5 w-5 stroke-1" />
          </div>
          <div>
            <h3 className="clash-title text-xl uppercase tracking-wide">Course AI Assistant</h3>
            {courseName && <p className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/70 mt-1">{courseName}</p>}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Bot className="h-12 w-12 stroke-[1.5] text-[#111111]/40" />
            <p className="font-bold text-sm uppercase tracking-widest max-w-sm text-[#111111]/60">
              Ask me any questions about the course materials, syllabus, or topics.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 bg-[#f2f2f2] border border-border/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 stroke-1 text-[#111111]" />
                </div>
              )}
              
              <div className={`px-5 py-4 max-w-[85%] text-sm leading-relaxed border border-border/20 ${
                m.role === 'user' 
                  ? 'bg-[#111111] text-white' 
                  : 'bg-white text-[#111111]'
              }`}>
                <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#111111] prose-pre:text-white prose-pre:border-2 prose-pre:border-border prose-pre:rounded-none prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wide">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 bg-[#f2f2f2] border border-border/20 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 stroke-1 text-[#111111]" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
             <div className="w-8 h-8 bg-[#f2f2f2] border border-border/20 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 stroke-1 text-[#111111] animate-pulse" />
            </div>
            <div className="px-5 py-4 bg-white text-[#111111] border border-border/20 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#111111] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-[#111111] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-[#111111] rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-background border-t border-border/10 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-4 relative">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="TYPE YOUR INQUIRY..."
            className="flex-1 bg-white border border-border/20 px-4 py-3 text-sm uppercase tracking-widest text-[#111111] placeholder-[#111111]/50 focus:outline-none focus:bg-[#f2f2f2] transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-[#111111] border border-[#111111] text-white hover:bg-white hover:text-[#111111] transition-colors duration-300 disabled:bg-[#e5e5e5] disabled:text-[#111111]/30 disabled:border-transparent"
          >
            <Send className="h-4 w-4 stroke-1" />
          </button>
        </form>
        <div className="text-center mt-3 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50">
          AI MAY PRODUCE INACCURACIES. VERIFY ALL INFORMATION.
        </div>
      </div>
    </div>
  )
}
