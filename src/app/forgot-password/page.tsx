import { forgotPassword } from '../login/actions'
import Link from 'next/link'

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center bg-background text-foreground py-12 px-4">
      <form className="flex w-full max-w-md flex-col justify-center gap-6 p-6 sm:p-12 border border-border/20 bg-card shadow-[8px_8px_0px_var(--color-foreground)]">
        <div className="flex flex-col items-center gap-2 mb-4">
          <h1 className="clash-title text-4xl text-center uppercase">Reset Password</h1>
          <p className="text-center text-sm font-medium text-foreground/60 uppercase tracking-widest">
            Enter your email to receive a reset link
          </p>
        </div>
        
        {params?.error && <p className="text-[#CC0000] bg-[#CC0000]/10 p-3 text-sm font-medium border border-[#CC0000]/20">{params.error}</p>}
        {params?.message && <p className="text-foreground bg-foreground/10 p-3 text-sm font-medium border border-foreground/20">{params.message}</p>}
        
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest font-bold" htmlFor="email">Email Address</label>
          <input className="rounded-none border border-border/20 bg-background px-4 py-3 focus:outline-none focus:border-border transition-colors font-medium" name="email" type="email" placeholder="you@example.com" required />
        </div>
        
        <button formAction={forgotPassword} className="bg-foreground text-background hover:-translate-y-1 hover:shadow-[4px_4px_0px_var(--color-foreground)] transition-all duration-300 rounded-none px-4 py-3 mt-4 font-bold uppercase tracking-widest text-sm border-2 border-transparent hover:border-foreground hover:bg-card hover:text-foreground">
          Send Reset Link
        </button>
        
        <div className="flex justify-center mt-4">
          <Link href="/login" className="text-xs uppercase tracking-widest font-bold text-foreground/50 hover:text-foreground transition-colors underline underline-offset-4">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  )
}
