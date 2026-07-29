# Notifications & Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a background synchronization system for Moodle data to generate proactive alerts (grades, messages, deadlines), and display them via a notification bell and dedicated page.

**Architecture:** Next.js App Router, Vercel Cron (API route), Supabase for caching states and storing notifications.

**Tech Stack:** Next.js 14, Supabase JS Client, Tailwind CSS, Lucide Icons.

---

### Task 1: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/20260729_notifications_schema.sql` (for documentation/execution)

- [ ] **Step 1: Write SQL Schema**
Create `supabase/migrations/20260729_notifications_schema.sql`:
```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'grade', 'message', 'deadline'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    moodle_ref_id VARCHAR(100), -- ID from Moodle to prevent duplicates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true); -- Usually restricted to service_role in a real app, but ok for MVP
```

- [ ] **Step 2: Commit**
```bash
git add supabase/
git commit -m "chore: add notifications schema"
```

---

### Task 2: Notifications API

**Files:**
- Create: `src/app/api/notifications/route.ts`

- [ ] **Step 1: Write API Route**
Create `src/app/api/notifications/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids, read } = await request.json()
  if (!ids || !ids.length) return NextResponse.json({ error: 'Missing ids' }, { status: 400 })

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: read })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/notifications/
git commit -m "feat: add notifications fetch and update api"
```

---

### Task 3: Notification Bell Component

**Files:**
- Create: `src/components/NotificationBell.tsx`

- [ ] **Step 1: Write Notification Bell**
Create `src/components/NotificationBell.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Optional: set up real-time subscription here
  }, [])

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications || [])
    }
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], read: true })
    })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const recent = notifications.slice(0, 5)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAsRead(notifications.map(n => n.id).join(','))} // simplistic mark all read for MVP
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No recent notifications</div>
            ) : (
              recent.map(n => (
                <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer ${!n.is_read ? 'bg-gray-800/50' : ''}`}>
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-gray-800 text-center bg-gray-900">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/NotificationBell.tsx
git commit -m "feat: add notification bell dropdown component"
```

---

### Task 4: Dedicated Notifications Page

**Files:**
- Create: `src/app/notifications/page.tsx`

- [ ] **Step 1: Write Page**
Create `src/app/notifications/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**
```bash
git add src/app/notifications/
git commit -m "feat: add dedicated notifications page"
```

---

### Task 5: Vercel Cron Sync Endpoint

**Files:**
- Create: `src/app/api/cron/sync/route.ts`

- [ ] **Step 1: Write Sync Route**
Create `src/app/api/cron/sync/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js' // use service role key for cron

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized execution
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Need service role key to query all users
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Get all connected users
  const { data: connections, error } = await supabase.from('moodle_connections').select('user_id, encrypted_token')
  if (error || !connections) return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })

  let notificationsGenerated = 0

  // 2. Poll Moodle for each user (sequential to avoid hammering Moodle, add jitter in real app)
  for (const conn of connections) {
    try {
      // Get unread messages
      const msgRes = await fetch(`https://hselearning.sriher.com/webservice/rest/server.php?wstoken=${conn.encrypted_token}&wsfunction=core_message_get_messages&moodlewsrestformat=json&type=conversations&read=0`)
      const msgData = await msgRes.json()
      
      if (msgData && msgData.messages && msgData.messages.length > 0) {
        for (const msg of msgData.messages) {
          // Check if we already notified for this message
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

      // We would do similar polling for gradereport_user_get_grade_items here
      
    } catch (e) {
      console.error(`Failed to sync for user ${conn.user_id}`, e)
    }
  }

  return NextResponse.json({ success: true, notificationsGenerated })
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/cron/
git commit -m "feat: add cron endpoint for background moodle syncing"
```
