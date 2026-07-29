'use client'

import { useEffect, useState, useRef } from 'react'
import { useChat, type Message } from 'ai/react'
import { Send, Bot, User, Loader2, Sparkles, History } from 'lucide-react'

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
    <div className="flex flex-col h-full w-full bg-background relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-background border-b-4 border-border shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 border border-border text-foreground">
            <Sparkles className="h-6 w-6 stroke-1" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-2xl uppercase tracking-tight">Course AI Assistant</h3>
            {courseName && <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mt-1">{courseName}</p>}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-muted">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <Bot className="h-16 w-16 stroke-1 text-foreground" />
            <p className="font-serif text-xl max-w-sm text-foreground">
              "All the news that's fit to print." Ask me any questions about the course materials, syllabus, or topics.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-12 h-12 bg-background border border-border flex items-center justify-center shrink-0">
                  <Bot className="h-6 w-6 stroke-1" />
                </div>
              )}
              
              <div className={`px-6 py-4 max-w-[85%] text-base font-body leading-relaxed border border-border ${
                m.role === 'user' 
                  ? 'bg-foreground text-background' 
                  : 'bg-background text-foreground'
              }`}>
                {/* Minimal markdown rendering just for bold and breaks */}
                {m.content.split('\n').map((line, i) => (
                  <span key={i}>
                    {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                    {i !== m.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>

              {m.role === 'user' && (
                <div className="w-12 h-12 bg-background border border-border flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 stroke-1" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 justify-start">
             <div className="w-12 h-12 bg-background border border-border flex items-center justify-center shrink-0">
              <Bot className="h-6 w-6 stroke-1 animate-pulse" />
            </div>
            <div className="px-6 py-4 bg-background text-foreground border border-border flex items-center gap-2">
              <span className="w-2 h-2 bg-foreground animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-foreground animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-foreground animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat Input */}
      <div className="p-6 bg-background border-t-4 border-border shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-4 relative">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="TYPE YOUR INQUIRY..."
            className="flex-1 bg-background border border-border px-6 py-4 text-base font-mono uppercase tracking-widest text-foreground placeholder-neutral-500 focus:outline-none focus:bg-muted transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-4 bg-foreground border border-transparent hover:border-border hover:bg-background hover:text-foreground text-background transition-all duration-200 disabled:bg-muted disabled:border-border disabled:text-neutral-500"
          >
            <Send className="h-6 w-6 stroke-1" />
          </button>
        </form>
        <div className="text-center mt-4 text-xs font-mono uppercase tracking-widest text-neutral-500">
          AI MAY PRODUCE INACCURACIES. VERIFY ALL INFORMATION.
        </div>
      </div>
    </div>
  )
}
