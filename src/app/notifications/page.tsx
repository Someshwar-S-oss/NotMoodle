'use client'

import { useEffect, useState, useMemo } from 'react'
import { Bell, Check, BookOpen, MessageCircle, Clock, Award, CheckCircle2, Sparkles } from 'lucide-react'

type FilterCategory = 'all' | 'unread' | 'deadlines' | 'grades'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterCategory>('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {
      // Fallback to empty
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], read: true })
      })
    } catch {
      // Non-fatal
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds, read: true })
      })
    } catch {
      // Non-fatal
    }
  }

  // Calculate category counts
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      deadlines: notifications.filter(n => n.type === 'deadline' || n.type === 'assign').length,
      grades: notifications.filter(n => n.type === 'grade' || n.type === 'feedback').length,
    }
  }, [notifications])

  // Filtered notifications based on active tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.is_read)
      case 'deadlines':
        return notifications.filter(n => n.type === 'deadline' || n.type === 'assign')
      case 'grades':
        return notifications.filter(n => n.type === 'grade' || n.type === 'feedback')
      case 'all':
      default:
        return notifications
    }
  }, [notifications, activeTab])

  // Relative timestamp calculation ("5m ago", "2h ago", "Yesterday", etc.)
  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = Date.now()
    const diffMs = now - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'grade':
      case 'feedback':
        return <Award className="text-foreground w-5 h-5" strokeWidth={1.75} />
      case 'message':
        return <MessageCircle className="text-foreground w-5 h-5" strokeWidth={1.75} />
      case 'deadline':
      case 'assign':
        return <Clock className="text-foreground w-5 h-5" strokeWidth={1.75} />
      default:
        return <Bell className="text-foreground w-5 h-5" strokeWidth={1.75} />
    }
  }

  const tabs = [
    { id: 'all' as const, label: 'All', count: counts.all },
    { id: 'unread' as const, label: 'Unread', count: counts.unread },
    { id: 'deadlines' as const, label: 'Deadlines', count: counts.deadlines },
    { id: 'grades' as const, label: 'Grades', count: counts.grades },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground px-6 md:px-12 py-16 flex flex-col items-center">
      <div className="w-full max-w-[1000px]">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
            <div>
              <h1 className="clash-title uppercase text-4xl md:text-5xl leading-tight tracking-tight">
                Notifications
              </h1>
              <p className="text-secondary text-sm font-medium mt-1">Course deadlines, submitted feedback, and academic alerts.</p>
            </div>
            {counts.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-bold uppercase tracking-wider text-tertiary hover:text-foreground transition-colors cursor-pointer py-1"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="hairline-divider h-px w-full bg-border/20 mt-4"></div>
        </header>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none" role="tablist" aria-label="Notification categories">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-foreground text-background shadow-xs ring-1 ring-foreground'
                    : 'bg-card text-foreground/75 hover:text-foreground hover:bg-muted/60 border border-border/25'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive
                    ? 'bg-background text-foreground'
                    : 'bg-muted text-secondary'
                }`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 bg-card border border-border/20 rounded-xl animate-pulse"></div>
            <div className="h-28 bg-card border border-border/20 rounded-xl animate-pulse"></div>
            <div className="h-28 bg-card border border-border/20 rounded-xl animate-pulse"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Friendly Empty State with Ambient Cloudy Glow Background */
          <div className="relative overflow-hidden text-center py-20 px-6 rounded-2xl border border-border/30 bg-card/60 flex flex-col items-center justify-center shadow-xs">
            {/* Ambient subtle glow within the card */}
            <div className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-30">
              <div className="absolute -top-1/2 -left-1/4 w-[400px] h-[400px] rounded-full bg-amber-200/40 blur-3xl dark:bg-sky-900/30" />
              <div className="absolute -bottom-1/2 -right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-200/35 blur-3xl dark:bg-indigo-950/40" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center mb-5 text-foreground shadow-xs border border-border/30">
                <CheckCircle2 className="h-7 w-7 stroke-[1.75px] text-[var(--status-success)]" />
              </div>
              <h3 className="clash-title text-2xl uppercase tracking-wide text-foreground mb-2">
                All clear — you&apos;re fully up to date!
              </h3>
              <p className="text-secondary text-sm font-medium max-w-sm">
                {activeTab === 'all'
                  ? 'No notifications found. Check back later for assignment due reminders or grade releases.'
                  : `No ${activeTab} notifications right now.`}
              </p>
              {activeTab !== 'all' && (
                <button
                  onClick={() => setActiveTab('all')}
                  className="mt-6 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground bg-background hover:bg-muted/60 border border-border/40 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  View all notifications
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredNotifications.map(n => (
              <div
                key={n.id}
                className={`relative flex flex-col sm:flex-row sm:items-start p-5 md:p-6 rounded-xl border transition-all duration-200 ${
                  n.is_read
                    ? 'bg-card/40 border-border/20 opacity-75 hover:opacity-100 hover:bg-card/70'
                    : 'bg-card border-foreground/30 shadow-xs ring-1 ring-border/20'
                }`}
              >
                {/* Unread Indicator Dot */}
                {!n.is_read && (
                  <span
                    aria-label="Unread notification"
                    className="absolute top-4 right-4 sm:top-6 sm:left-3 sm:right-auto w-2.5 h-2.5 rounded-full bg-foreground shrink-0 shadow-xs"
                  />
                )}

                {/* Type-Specific Icon Badge */}
                <div className="mr-5 mb-4 sm:mb-0 sm:ml-4 w-12 h-12 rounded-xl bg-muted/70 border border-border/30 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                    <h3 className={`clash-title text-lg md:text-xl uppercase tracking-wide ${!n.is_read ? 'text-foreground font-semibold' : 'text-foreground/80'}`}>
                      {n.title}
                    </h3>
                    {!n.is_read && (
                      <span className="bg-foreground text-background text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>

                  <p className="text-foreground/80 font-medium text-sm leading-relaxed max-w-2xl">
                    {n.message}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs font-mono text-tertiary">
                      {formatRelativeTime(n.created_at)}
                    </span>
                    {n.created_at && (
                      <span className="text-[10px] text-tertiary/70 hidden md:inline">
                        • {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action button */}
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    aria-label={`Mark "${n.title}" as read`}
                    className="mt-4 sm:mt-0 sm:ml-4 px-3.5 py-2 bg-background hover:bg-foreground hover:text-background border border-border/40 hover:border-foreground text-foreground rounded-lg transition-all uppercase tracking-wider text-xs font-bold shrink-0 flex items-center gap-2 cursor-pointer shadow-xs self-start"
                  >
                    <span>Acknowledge</span>
                    <Check size={14} className="stroke-[2.5px]" />
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

