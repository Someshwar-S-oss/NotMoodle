'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, BookOpen, MessageCircle, Clock } from 'lucide-react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications || [])
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], read: true })
    })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'grade': return <BookOpen className="text-[#111111]" strokeWidth={1.5} />
      case 'message': return <MessageCircle className="text-[#111111]" strokeWidth={1.5} />
      case 'deadline': return <Clock className="text-[#111111]" strokeWidth={1.5} />
      default: return <Bell className="text-[#111111]" strokeWidth={1.5} />
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 md:px-12 py-24 flex flex-col items-center">
      <div className="w-full max-w-[1000px]">
        <header className="mb-16">
          <h1 className="clash-title uppercase text-[6vw] leading-[0.8] tracking-tight">
            Notifications
          </h1>
          <div className="flex items-center gap-6 mt-12">
            <p className="text-xs uppercase tracking-widest font-bold">Inbox Overview</p>
            <div className="flex-1 hairline-divider h-px w-full"></div>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-white border border-border/20 animate-pulse"></div>
            <div className="h-24 bg-white border border-border/20 animate-pulse"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24 bg-white border border-border/20 flex flex-col items-center">
            <Bell className="h-12 w-12 mb-6 text-[#111111]/30" strokeWidth={1} />
            <p className="clash-title text-2xl uppercase">All caught up</p>
            <p className="text-foreground/70 font-medium mt-2">Zero pending items in the queue.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notifications.map(n => (
              <div 
                key={n.id} 
                className={`flex flex-col sm:flex-row sm:items-start p-6 border transition-colors duration-300 ${
                  n.is_read 
                    ? 'bg-transparent border-border/20 opacity-60 hover:opacity-100' 
                    : 'bg-white border-[#111111] shadow-[4px_4px_0px_rgba(17,17,17,0.1)]'
                }`}
              >
                <div className="mr-6 mb-4 sm:mb-0 w-12 h-12 bg-[#f2f2f2] border border-border/20 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`clash-title text-xl uppercase tracking-wide ${!n.is_read ? 'text-[#111111]' : 'text-foreground/80'}`}>
                      {n.title}
                    </h3>
                    {!n.is_read && (
                      <span className="bg-[#111111] text-[#f2f2f2] text-[10px] uppercase font-bold tracking-widest px-2 py-0.5">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-foreground/80 font-medium text-sm max-w-2xl">{n.message}</p>
                  <p className="text-xs uppercase tracking-widest font-bold text-foreground/50 mt-4">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && (
                  <button 
                    onClick={() => markAsRead(n.id)} 
                    className="mt-4 sm:mt-0 sm:ml-6 px-4 py-2 bg-transparent border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#f2f2f2] transition-colors uppercase tracking-widest text-xs font-bold shrink-0 flex items-center gap-2"
                  >
                    Acknowledge <Check size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
