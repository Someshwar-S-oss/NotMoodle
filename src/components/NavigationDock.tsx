'use client'

import Dock from './Dock'
import { Home, Settings, LogOut, Bell, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useEffect, useState } from 'react'

export function NavigationDock() {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    let isFileViewerOpen = false

    const handleScroll = () => {
      if (isFileViewerOpen) return
      setIsVisible(false)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        if (!isFileViewerOpen) setIsVisible(true)
      }, 500)
    }

    const handleDrawerState = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.fullScreen) {
        if (customEvent.detail?.isOpen) {
          isFileViewerOpen = true
          setIsVisible(false)
        } else {
          isFileViewerOpen = false
          setIsVisible(true)
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('drawer-state', handleDrawerState)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('drawer-state', handleDrawerState)
      clearTimeout(scrollTimeout)
    }
  }, [])

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
      className={`transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0 pointer-events-none'}`}
    />
  )
}
