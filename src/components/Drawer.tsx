'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Drawer({ isOpen, onClose, title, children, fullScreen }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, fullScreen?: boolean }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${fullScreen ? 'p-0' : 'p-4 sm:p-6 md:p-12'}`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#111111]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Panel */}
      <div className={`relative bg-white border-2 flex flex-col shadow-[8px_8px_0px_rgba(17,17,17,1)] animate-in zoom-in-95 duration-200 ${fullScreen ? 'w-full h-full border-[#111111] max-w-none' : 'w-full max-w-4xl max-h-full border-[#111111]'}`}>
        <div className="flex items-center justify-between p-6 border-b-2 border-[#111111] bg-[#f2f2f2]">
          <h2 className="clash-title text-2xl md:text-3xl uppercase tracking-wide truncate">{title}</h2>
          <button onClick={onClose} className="p-2 border-2 border-transparent hover:border-[#111111] hover:bg-white text-[#111111] transition-all duration-200">
            <X size={24} className="stroke-[2px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  )
}
