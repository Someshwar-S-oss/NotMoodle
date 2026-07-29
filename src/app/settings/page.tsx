'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Copy, Check } from 'lucide-react'

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiSaved, setGeminiSaved] = useState(false)
  const [calendarCopied, setCalendarCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    setGeminiKey(localStorage.getItem('notmoodle_gemini_key') || '')
  }, [])

  const saveGeminiKey = () => {
    localStorage.setItem('notmoodle_gemini_key', geminiKey)
    setGeminiSaved(true)
    setTimeout(() => setGeminiSaved(false), 2000)
  }

  const calendarUrl = userId ? `${window.location.origin}/api/calendar/feed/${userId}` : ''

  const copyCalendarUrl = () => {
    if (calendarUrl) {
      navigator.clipboard.writeText(calendarUrl)
      setCalendarCopied(true)
      setTimeout(() => setCalendarCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-background text-foreground py-12 px-6 md:px-12 flex justify-center">
      <div className="w-full max-w-3xl flex flex-col gap-12">
        <div>
          <h1 className="clash-title text-5xl uppercase mb-2">Settings</h1>
          <div className="hairline-divider w-full h-px mt-6 bg-border/10"></div>
        </div>

        {/* Calendar Sync Section */}
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="clash-title text-2xl uppercase mb-2">Google Calendar Sync</h2>
            <p className="text-foreground/70 font-medium">Subscribe to this URL in Google Calendar or Apple Calendar to sync your Moodle deadlines automatically.</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              readOnly 
              value={calendarUrl || 'Loading...'} 
              className="flex-1 rounded-none border border-border/20 bg-white px-4 py-3 focus:outline-none font-mono text-sm text-foreground/60"
            />
            <button 
              onClick={copyCalendarUrl}
              disabled={!calendarUrl}
              className="bg-[#111111] text-[#f2f2f2] hover:bg-[#111111]/80 transition-colors duration-300 px-6 py-3 font-medium uppercase tracking-widest text-sm flex items-center justify-center gap-2 h-full"
            >
              {calendarCopied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
        </section>

        <div className="hairline-divider w-full h-px bg-border/10"></div>

        {/* BYOK Section */}
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="clash-title text-2xl uppercase mb-2">AI Configuration (BYOK)</h2>
            <p className="text-foreground/70 font-medium">Enter your Google Gemini API key to power the AI chat. Stored securely in your browser's local storage.</p>
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <label className="text-xs uppercase tracking-widest font-bold" htmlFor="gemini-key">Gemini API Key</label>
            <div className="flex items-center gap-2">
              <input 
                id="gemini-key"
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 rounded-none border border-border/20 bg-white px-4 py-3 focus:outline-none focus:border-border transition-colors font-mono text-sm"
              />
              <button 
                onClick={saveGeminiKey}
                className="bg-transparent border border-[#1e1e1e] text-[#111111] hover:bg-[#111111] hover:text-[#f2f2f2] transition-colors duration-300 px-6 py-3 font-medium uppercase tracking-widest text-sm whitespace-nowrap"
              >
                {geminiSaved ? 'Saved' : 'Save Key'}
              </button>
            </div>
          </div>
        </section>

        <div className="hairline-divider w-full h-px bg-border/10"></div>

        {/* Moodle Connection Section */}
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="clash-title text-2xl uppercase mb-2">Moodle Integration</h2>
            <p className="text-foreground/70 font-medium">Connect your university Moodle account to enable timeline syncing and assignment extraction.</p>
          </div>
          <div className="w-full max-w-md">
            <MoodleConnect onConnected={() => window.location.reload()} />
          </div>
        </section>

      </div>
    </div>
  )
}
