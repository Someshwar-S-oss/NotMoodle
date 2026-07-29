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
      case 'grade': return <BookOpen className="text-green-400" />
      case 'message': return <MessageCircle className="text-blue-400" />
      case 'deadline': return <Clock className="text-orange-400" />
      default: return <Bell className="text-gray-400" />
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-gray-400 mt-2">All your alerts in one place.</p>
          </div>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-800 rounded-lg"></div>
            <div className="h-20 bg-gray-800 rounded-lg"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-800 rounded-lg border border-gray-700">
            <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start p-4 border rounded-lg transition-colors ${n.is_read ? 'bg-gray-900 border-gray-800' : 'bg-gray-800 border-gray-700 shadow-sm'}`}>
                <div className="mr-4 mt-1 bg-gray-900 p-2 rounded-full border border-gray-700">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg ${!n.is_read ? 'font-bold' : 'font-medium text-gray-300'}`}>{n.title}</h3>
                  <p className="text-gray-400 mt-1">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markAsRead(n.id)} className="ml-4 p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-full transition-colors" title="Mark as read">
                    <Check size={20} />
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
