'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Stepper, { Step } from '@/components/Stepper'
import { createClient } from '@/utils/supabase/client'
import { MoodleConnect } from '@/components/MoodleConnect'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [geminiKey, setGeminiKey] = useState('')
  const [hasMoodle, setHasMoodle] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile(prof)

    const { data: conn } = await supabase.from('moodle_connections').select('id').eq('user_id', user.id).maybeSingle()
    setHasMoodle(!!conn)
    setGeminiKey(localStorage.getItem('notmoodle_gemini_key') || '')
    
    setLoading(false)
  }

  const handleGeminiSave = () => {
    localStorage.setItem('notmoodle_gemini_key', geminiKey)
  }

  if (loading) {
    return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-foreground/50" /></div>
  }

  if (!profile || !profile.is_approved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <h1 className="clash-title text-4xl md:text-6xl uppercase tracking-widest text-center mb-6">Request Raised</h1>
        <p className="text-foreground/70 font-medium text-center max-w-lg mb-8">
          Your request has been raised, admins will shortly approve your access.
        </p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#111111] text-white border-2 border-[#111111] uppercase tracking-widest font-bold text-xs shadow-[4px_4px_0px_rgba(17,17,17,1)] hover:bg-white hover:text-[#111111] transition-all">
          Refresh Status
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] w-full items-center justify-center bg-background py-12 px-4">
      <div className="w-full max-w-2xl">
        <Stepper
          initialStep={1}
          onFinalStepCompleted={() => {
            handleGeminiSave();
            router.push('/dashboard');
          }}
          backButtonText="PREVIOUS"
          nextButtonText="CONTINUE"
        >
          <Step>
            <div className="flex flex-col gap-4 text-center">
              <h2 className="clash-title text-3xl uppercase tracking-widest mb-4">Welcome to NotMoodle</h2>
              <p className="text-foreground/70 font-medium">
                You've been approved! Let's get your academic workspace configured. We need two things to power your dashboard: your Gemini API key and your Moodle credentials.
              </p>
            </div>
          </Step>
          <Step>
            <div className="flex flex-col gap-6">
              <h2 className="clash-title text-3xl uppercase tracking-widest mb-2 text-center">Gemini API Key</h2>
              <p className="text-foreground/70 font-medium text-sm text-center mb-4">
                NotMoodle uses Google's Gemini to power the Course AI assistant. Your key is stored securely in your browser's local storage.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest font-bold">API Key</label>
                <input 
                  value={geminiKey} 
                  onChange={(e) => setGeminiKey(e.target.value)} 
                  placeholder="AIzaSy..." 
                  className="rounded-none border-2 border-[#111111] bg-white px-4 py-3 focus:outline-none focus:translate-y-1 focus:shadow-none shadow-[4px_4px_0px_rgba(17,17,17,1)] transition-all font-medium"
                />
              </div>
            </div>
          </Step>
          <Step>
            <div className="flex flex-col gap-6 items-center">
              <h2 className="clash-title text-3xl uppercase tracking-widest mb-2 text-center">Moodle Integration</h2>
              <p className="text-foreground/70 font-medium text-sm text-center mb-4">
                Connect your university Moodle account. We encrypt your token and communicate directly with the server.
              </p>
              {hasMoodle ? (
                <div className="w-full p-4 bg-[#111111] text-white font-bold uppercase tracking-widest text-center border-2 border-[#111111] shadow-[4px_4px_0px_rgba(17,17,17,1)]">
                  Moodle Connected Successfully!
                </div>
              ) : (
                <MoodleConnect onConnected={() => setHasMoodle(true)} />
              )}
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  )
}
