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
      <div className="flex items-center justify-center h-full w-full min-h-[400px] text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-indigo-500" />
        Loading chat history...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gray-950 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100 leading-tight">Course AI Assistant</h3>
            {courseName && <p className="text-xs text-gray-500">{courseName}</p>}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
            <Bot className="h-12 w-12 text-indigo-400" />
            <p className="text-sm text-gray-400 max-w-xs">
              Hi! I'm your AI assistant for this course. Ask me any questions about the course materials, syllabus, or topics!
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-indigo-400" />
                </div>
              )}
              
              <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-sm' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm'
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
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-gray-300" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
             <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-indigo-400 animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chat Input */}
      <div className="p-3 bg-gray-900 border-t border-gray-800 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question about this course..."
            className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="text-center mt-2 text-[10px] text-gray-600 font-medium tracking-wide">
          AI CAN MAKE MISTAKES. VERIFY IMPORTANT INFO.
        </div>
      </div>
    </div>
  )
}
