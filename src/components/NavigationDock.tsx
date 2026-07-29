'use client'

import Dock from './Dock'
import { Home, Settings, LogOut, Bell, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function NavigationDock() {
  const router = useRouter()

  const items = [
    { icon: <Home size={18} />, label: 'Dashboard', onClick: () => router.push('/dashboard') },
    { icon: <MessageSquare size={18} />, label: 'Chat', onClick: () => router.push('/chat') },
    { icon: <Bell size={18} />, label: 'Notifications', onClick: () => router.push('/notifications') },
    { icon: <Settings size={18} />, label: 'Settings', onClick: () => router.push('/settings') },
  ]

  return (
    <Dock 
      items={items}
      panelHeight={68}
      baseItemSize={50}
      magnification={70}
    />
  )
}
