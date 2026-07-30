import { updatePassword } from '../login/actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // If no user is authenticated via the callback token, they shouldn't be here
  if (!user) { redirect('/login?error=Invalid or expired password reset link') }

  const params = await searchParams;
  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-background text-foreground py-12">
      <form className="flex w-full max-w-md flex-col justify-center gap-6 p-12 border border-border/20 bg-white shadow-[8px_8px_0px_rgba(17,17,17,1)]">
        <div className="flex flex-col items-center gap-2 mb-4">
          <h1 className="clash-title text-4xl text-center uppercase">New Password</h1>
          <p className="text-center text-sm font-medium text-foreground/60 uppercase tracking-widest">
            Enter your new password below
          </p>
        </div>
        
        {params?.error && <p className="text-[#CC0000] bg-[#CC0000]/10 p-3 text-sm font-medium border border-[#CC0000]/20">{params.error}</p>}
        
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="password">New Password</label>
          <input className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" name="password" type="password" placeholder="••••••••" required />
        </div>
        
        <button formAction={updatePassword} className="bg-[#111111] text-[#f2f2f2] hover:-translate-y-1 hover:shadow-[4px_4px_0px_rgba(17,17,17,1)] transition-all duration-300 rounded-none px-4 py-3 mt-4 font-bold uppercase tracking-widest text-sm border-2 border-transparent hover:border-[#111111] hover:bg-white hover:text-[#111111]">
          Update Password
        </button>
      </form>
    </div>
  )
}
