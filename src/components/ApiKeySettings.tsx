'use client'

import { useState, useEffect } from 'react'
import { Key } from 'lucide-react'

export function ApiKeySettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [key, setKey] = useState('')

  useEffect(() => {
    setKey(localStorage.getItem('notmoodle_gemini_key') || '')
  }, [])

  const saveKey = () => {
    localStorage.setItem('notmoodle_gemini_key', key)
    setIsOpen(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-gray-400 hover:text-white p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
        title="Set Gemini API Key"
      >
        <Key className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-xl font-semibold text-white mb-2">Bring Your Own Key</h3>
            <p className="text-sm text-gray-400 mb-4">
              Enter your Google Gemini API key to power the AI chat. Your key is stored securely in your browser's LocalStorage and is never saved on our servers.
            </p>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white mb-4 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={saveKey}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
