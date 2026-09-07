'use client'

import Dock from './Dock'
import { Home, Settings, Bell } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function NavigationDock() {
  const router = useRouter()
  const pathname = usePathname()
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

  const currentPath = pathname || ''
  const isDashboardActive = currentPath === '/dashboard' || currentPath.startsWith('/dashboard/') || currentPath.startsWith('/course')
  const isNotificationsActive = currentPath === '/notifications' || currentPath.startsWith('/notifications/')
  const isSettingsActive = currentPath === '/settings' || currentPath.startsWith('/settings/')

  const items = [
    {
      icon: (
        <div className="relative flex flex-col items-center justify-center">
          <Home size={18} className={isDashboardActive ? 'text-foreground' : 'text-foreground/75'} />
          {isDashboardActive && (
            <span
              className="absolute -bottom-2.5 w-1.5 h-1.5 rounded-full bg-foreground transition-all duration-300"
              aria-hidden="true"
            />
          )}
        </div>
      ),
      label: 'Dashboard',
      onClick: () => router.push('/dashboard'),
      isActive: isDashboardActive,
    },
    {
      icon: (
        <div className="relative flex flex-col items-center justify-center">
          <Bell size={18} className={isNotificationsActive ? 'text-foreground' : 'text-foreground/75'} />
          {isNotificationsActive && (
            <span
              className="absolute -bottom-2.5 w-1.5 h-1.5 rounded-full bg-foreground transition-all duration-300"
              aria-hidden="true"
            />
          )}
        </div>
      ),
      label: 'Notifications',
      onClick: () => router.push('/notifications'),
      isActive: isNotificationsActive,
    },
    {
      icon: (
        <div className="relative flex flex-col items-center justify-center">
          <Settings size={18} className={isSettingsActive ? 'text-foreground' : 'text-foreground/75'} />
          {isSettingsActive && (
            <span
              className="absolute -bottom-2.5 w-1.5 h-1.5 rounded-full bg-foreground transition-all duration-300"
              aria-hidden="true"
            />
          )}
        </div>
      ),
      label: 'Settings',
      onClick: () => router.push('/settings'),
      isActive: isSettingsActive,
    },
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
