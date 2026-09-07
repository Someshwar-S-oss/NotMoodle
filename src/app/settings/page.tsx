'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Copy, Check, Sun, Moon, Monitor, Calendar, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [calendarCopied, setCalendarCopied] = useState(false)
  const [moodleConnected, setMoodleConnected] = useState<boolean | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    const checkUserAndConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          try {
            const { data } = await supabase
              .from('moodle_connections')
              .select('last_sync, encrypted_token')
              .eq('user_id', user.id)
              .maybeSingle()

            if (data?.encrypted_token) {
              setMoodleConnected(true)
              setLastSync(data.last_sync || null)
              return
            }
          } catch {
            // Fall through to API check
          }

          // Also check token endpoint fallback
          try {
            const res = await fetch('/api/moodle/token')
            setMoodleConnected(res.ok)
          } catch {
            setMoodleConnected(false)
          }
        }
      } catch {
        // User not logged in
      }
    }

    checkUserAndConnection()
  }, [])

  const calendarUrl = userId && typeof window !== 'undefined'
    ? `${window.location.origin}/api/calendar/feed/${userId}`
    : ''

  const copyCalendarUrl = () => {
    if (calendarUrl) {
      navigator.clipboard.writeText(calendarUrl)
      setCalendarCopied(true)
      setTimeout(() => setCalendarCopied(false), 2000)
    }
  }

  const handleManualResync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/moodle/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: [] }),
      })
      if (res.ok) {
        setLastSync(new Date().toISOString())
      }
    } catch {
      // Ignored
    }
    setSyncing(false)
  }

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-background text-foreground py-12 px-6 md:px-12 flex justify-center">
      <div className="w-full max-w-3xl flex flex-col gap-10">
        <div>
          <h1 className="clash-title text-4xl md:text-5xl uppercase tracking-tight mb-2">Settings</h1>
          <p className="text-secondary font-medium text-sm">Manage appearance, external calendar subscriptions, and university portal integrations.</p>
          <div className="hairline-divider w-full h-px mt-6 bg-border/15"></div>
        </div>

        {/* Appearance Section: Visual Segmented Controller */}
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="clash-title text-2xl uppercase tracking-wide mb-1">Appearance</h2>
            <p className="text-secondary text-sm font-medium">Select your interface theme preference or synchronize with your operating system.</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border/20 shadow-xs space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-tertiary block">Theme Preference</span>
            {mounted ? (
              <div 
                role="radiogroup" 
                aria-label="Theme selection" 
                className="grid grid-cols-3 gap-3 p-1.5 bg-muted/50 rounded-xl border border-border/20"
              >
                {themeOptions.map(({ value, label, icon: Icon }) => {
                  const isActive = theme === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => setTheme(value)}
                      className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-foreground text-background shadow-xs ring-1 ring-foreground'
                          : 'text-foreground/80 hover:text-foreground hover:bg-background/60'
                      }`}
                    >
                      <Icon className="w-4 h-4 stroke-[2px]" />
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="h-12 bg-muted/40 animate-pulse rounded-xl" />
            )}
          </div>
        </section>

        <div className="hairline-divider w-full h-px bg-border/15"></div>

        {/* Google Calendar Sync Section */}
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="clash-title text-2xl uppercase tracking-wide mb-1">Google Calendar Sync</h2>
            <p className="text-secondary text-sm font-medium">Subscribe to this secure feed in Google Calendar or Apple Calendar to keep coursework synchronized in real time.</p>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border/20 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-muted/70 text-foreground">
                <Calendar className="w-5 h-5 stroke-[2px]" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-foreground">Personal iCal Feed</h3>
                <p className="text-xs text-secondary">Auto-updates whenever new assignments or quizzes are scheduled.</p>
              </div>
            </div>

            {/* URL input + Copy Button */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input 
                readOnly 
                value={calendarUrl || 'Loading calendar feed...'} 
                aria-label="Google Calendar Feed URL"
                className="flex-1 rounded-lg border border-border/30 bg-background px-4 py-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground select-all"
              />
              <button 
                onClick={copyCalendarUrl}
                disabled={!calendarUrl}
                aria-label="Copy calendar feed URL"
                className="bg-foreground text-background hover:bg-foreground/85 active:scale-[0.99] disabled:opacity-50 transition-all px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
              >
                {calendarCopied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5px] text-green-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 stroke-[2px]" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>

            {/* 3-Step Setup Guide */}
            <div className="pt-4 border-t border-border/20 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-tertiary block">
                Quick 3-Step Setup
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-background border border-border/20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background font-mono text-xs font-bold flex items-center justify-center">1</span>
                    <h4 className="font-bold text-xs text-foreground">Copy Feed URL</h4>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">Click the copy button above to put your private subscribe link on your clipboard.</p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border/20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background font-mono text-xs font-bold flex items-center justify-center">2</span>
                    <h4 className="font-bold text-xs text-foreground">Add from URL</h4>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">In Google Calendar, go to &quot;Other calendars +&quot; and choose &quot;From URL&quot;.</p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border/20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background font-mono text-xs font-bold flex items-center justify-center">3</span>
                    <h4 className="font-bold text-xs text-foreground">Paste &amp; Sync</h4>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">Paste the URL and click &quot;Add calendar&quot;. Deadlines appear automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="hairline-divider w-full h-px bg-border/15"></div>

        {/* Moodle Connection Section */}
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="clash-title text-2xl uppercase tracking-wide mb-1">Moodle Integration</h2>
            <p className="text-secondary text-sm font-medium">Link your Sriher Moodle account to enable real-time timeline extraction, grade tracking, and assignment submission.</p>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border/20 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-muted/70 text-foreground">
                  <Sparkles className="w-5 h-5 stroke-[2px]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Connection Status</h3>
                  <p className="text-xs text-secondary">hselearning.sriher.com</p>
                </div>
              </div>

              {/* Status badge */}
              {moodleConnected === null ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-muted text-tertiary border border-border/20 animate-pulse">
                  Checking...
                </span>
              ) : moodleConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/30">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--urgency-overdue-bg)] text-[var(--urgency-overdue)] border border-[var(--urgency-overdue-border)]">
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5px]" />
                  Disconnected
                </span>
              )}
            </div>

            {/* Last synced metadata & manual sync button */}
            {moodleConnected && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-background border border-border/20">
                <div className="text-xs">
                  <span className="text-tertiary font-bold uppercase tracking-widest block text-[10px]">Last Sync</span>
                  <span className="font-mono text-secondary font-medium">
                    {lastSync ? new Date(lastSync).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Active session connected'}
                  </span>
                </div>
                <button
                  onClick={handleManualResync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border/40 hover:border-foreground text-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-card hover:bg-muted/40 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 stroke-[2px] ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            )}

            {/* Connect / Reconnect Component */}
            <div className="w-full">
              <MoodleConnect onConnected={() => window.location.reload()} />
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

