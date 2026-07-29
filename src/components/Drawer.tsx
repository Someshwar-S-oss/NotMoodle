'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Drawer({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/90 newsprint-texture backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-4xl max-h-full bg-background border border-border flex flex-col hard-shadow-hover animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 md:p-8 border-b-4 border-border">
          <h2 className="text-3xl md:text-5xl font-serif font-black uppercase truncate">{title}</h2>
          <button onClick={onClose} className="p-2 border border-transparent hover:border-border hover:bg-muted text-foreground transition-all duration-200">
            <X size={24} className="stroke-1" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
