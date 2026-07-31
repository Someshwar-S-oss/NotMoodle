'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [isSuperuser, setIsSuperuser] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    
    const { data: profile } = await supabase.from('profiles').select('is_superuser').eq('id', user.id).maybeSingle()
    if (profile?.is_superuser) {
      setIsSuperuser(true)
      fetchProfiles()
    } else {
      window.location.href = '/dashboard'
    }
  }

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setProfiles(data || [])
    setLoading(false)
  }

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_approved: !currentStatus }).eq('id', id)
    if (!error) {
      setProfiles(profiles.map(p => p.id === id ? { ...p, is_approved: !currentStatus } : p))
    }
  }

  if (loading) return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-foreground/50" /></div>

  if (!isSuperuser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <h1 className="clash-title text-4xl uppercase mb-4">Unauthorized</h1>
        <p className="font-medium text-foreground/70">You do not have superuser privileges to view this page.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto p-6 md:p-12 min-h-[calc(100vh-80px)]">
      <h1 className="clash-title text-4xl uppercase tracking-widest mb-8 border-b-2 border-border/20 pb-4">User Administration</h1>
      
      <div className="flex flex-col gap-4">
        {profiles.map(profile => (
          <div key={profile.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border-2 border-foreground bg-card shadow-[4px_4px_0px_var(--color-foreground)] gap-4 transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_var(--color-foreground)]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{profile.full_name || 'No Name Provided'}</span>
                <span className="text-sm font-medium text-foreground/50 border border-border/20 px-2 py-0.5">{profile.email}</span>
              </div>
              <span className="text-xs font-medium text-foreground/50 uppercase tracking-widest mt-2">
                Joined: {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {profile.is_superuser && (
                <span className="text-xs uppercase tracking-widest font-bold bg-foreground text-background px-3 py-1">Superuser</span>
              )}
              <button
                onClick={() => toggleApproval(profile.id, profile.is_approved)}
                className={`flex items-center gap-2 px-4 py-2 border-2 border-foreground text-xs font-bold uppercase tracking-widest transition-colors ${
                  profile.is_approved 
                    ? 'bg-card text-foreground hover:bg-[#ff4444] hover:text-background hover:border-[#ff4444]' 
                    : 'bg-foreground text-background hover:bg-card hover:text-foreground'
                }`}
              >
                {profile.is_approved ? <XCircle size={16} /> : <CheckCircle size={16} />}
                {profile.is_approved ? 'Revoke Access' : 'Approve Access'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
