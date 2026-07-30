import { login, signInWithGoogle } from './actions'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error: string; message: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) { redirect('/dashboard') }

  const params = await searchParams;
  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-background text-foreground py-12">
      <form className="flex w-full max-w-md flex-col justify-center gap-6 p-12 border border-border/20 bg-white">
        <h1 className="clash-title text-4xl mb-4 text-center uppercase">Log In</h1>
        {params?.error && <p className="text-[#CC0000] bg-[#CC0000]/10 p-3 text-sm font-medium border border-[#CC0000]/20">{params.error}</p>}
        {params?.message && <p className="text-foreground bg-border/10 p-3 text-sm font-medium border border-border/20">{params.message}</p>}
        
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="email">Email</label>
          <input className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" name="email" type="email" placeholder="you@example.com" required />
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs uppercase tracking-widest font-bold" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-[10px] uppercase tracking-widest font-bold text-foreground/50 hover:text-foreground transition-colors underline underline-offset-4">Forgot Password?</Link>
          </div>
          <input className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" type="password" name="password" placeholder="••••••••" required />
        </div>
        
        <button formAction={login} className="bg-[#111111] text-[#f2f2f2] hover:scale-105 transition-transform duration-300 rounded-full px-4 py-3 mt-4 font-medium uppercase tracking-widest text-sm">Log In</button>
        
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-border/20"></div>
          <span className="flex-shrink-0 mx-4 text-xs uppercase tracking-widest text-foreground/50 font-bold">Or</span>
          <div className="flex-grow border-t border-border/20"></div>
        </div>

        <button formNoValidate formAction={signInWithGoogle} className="flex items-center justify-center gap-3 bg-white text-[#111111] border-2 border-border/20 hover:bg-[#f2f2f2] transition-colors duration-300 rounded-full px-4 py-3 font-medium uppercase tracking-widest text-sm w-full">
          <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm mt-4 text-foreground/60 font-medium">
          Don't have an account? <Link href="/signup" className="text-foreground hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
