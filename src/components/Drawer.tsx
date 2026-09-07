'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export function Drawer({ isOpen, onClose, title, children, fullScreen }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, fullScreen?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('drawer-state', { detail: { isOpen: true, fullScreen } }))
      previousFocusRef.current = document.activeElement as HTMLElement
      panelRef.current?.focus()
    } else {
      window.dispatchEvent(new CustomEvent('drawer-state', { detail: { isOpen: false, fullScreen } }))
    }

    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
      if (isOpen) {
        window.dispatchEvent(new CustomEvent('drawer-state', { detail: { isOpen: false, fullScreen } }))
        previousFocusRef.current?.focus()
      }
    }
  }, [isOpen, onClose, fullScreen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${fullScreen ? 'p-0' : 'p-4 sm:p-6 md:p-12'}`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/60 dark:bg-background/70 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`relative bg-card flex flex-col animate-in fade-in zoom-in-95 motion-reduce:animate-none duration-200 outline-none overflow-hidden ${
          fullScreen 
            ? 'w-full h-full max-w-none rounded-none' 
            : 'w-full max-w-4xl max-h-full rounded-2xl border border-border/60 shadow-2xl'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 bg-card/90 backdrop-blur-sm">
          <h2 className="clash-title text-2xl md:text-3xl uppercase tracking-wide truncate">{title}</h2>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-secondary hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer" 
            aria-label="Close drawer"
          >
            <X size={20} className="stroke-[2px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-card custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  )
}