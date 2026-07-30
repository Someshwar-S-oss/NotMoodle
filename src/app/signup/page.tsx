import { signup } from '@/app/login/actions'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) { redirect('/dashboard') }

  const params = await searchParams;
  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-background text-foreground py-12">
      <form className="flex w-full max-w-md flex-col justify-center gap-6 p-12 border border-border/20 bg-white">
        <h1 className="clash-title text-4xl mb-4 text-center uppercase">Sign Up</h1>
        {params?.error && <p className="text-[#CC0000] bg-[#CC0000]/10 p-3 text-sm font-medium border border-[#CC0000]/20">{params.error}</p>}
        
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="name">Full Name</label>
          <input className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" name="name" type="text" placeholder="John Doe" required />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="email">Email</label>
          <input className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" name="email" type="email" placeholder="you@example.com" required />
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="password">Password</label>
          <input className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" type="password" name="password" placeholder="••••••••" required />
        </div>
        
        <button formAction={signup} className="bg-[#111111] text-[#f2f2f2] hover:scale-105 transition-transform duration-300 rounded-full px-4 py-3 mt-4 font-medium uppercase tracking-widest text-sm">Sign Up</button>
        
        <p className="text-center text-sm mt-4 text-foreground/60 font-medium">
          Already have an account? <Link href="/login" className="text-foreground hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  )
}
