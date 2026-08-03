import Link from 'next/link'
import { ArrowRight, Hexagon, Circle, Triangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) { redirect('/dashboard') }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-[1440px] px-4 md:px-12 pb-24">
        
        {/* Header */}
        <header className="w-full py-4 md:py-8 flex justify-between items-center">
          <img src="/notmoodlelogo.png" alt="NotMoodle Logo" className="h-8 md:h-12 w-auto object-contain" />
        </header>

        {/* Hero Section */}
        <section className="h-[70vh] md:h-[90vh] w-full flex flex-col items-center justify-center relative overflow-hidden border-b border-border/10 mb-16">
          <h1 className="clash-title uppercase leading-[0.8] text-center" style={{ fontSize: 'clamp(40px, 13vw, 180px)' }}>
            <span className="echo-stack" data-text="NOT MOODLE">
              NOT MOODLE
            </span>
          </h1>
          <p className="mt-6 md:mt-8 text-foreground/70 max-w-lg text-center font-medium text-sm md:text-base px-4">
            A sophisticated synthesis of academic workflows, emphasizing typographic clarity and minimal resistance.
          </p>
          <div className="mt-8 md:mt-12 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
            <Link href="/login" className="px-8 py-3 bg-foreground text-background font-medium uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform duration-300 text-center w-full sm:w-auto">
              Log In
            </Link>
            <Link href="/signup" className="px-8 py-3 border border-border text-foreground font-medium uppercase tracking-widest text-sm rounded-full hover:bg-foreground hover:text-background transition-colors duration-300 text-center w-full sm:w-auto">
              Sign Up
            </Link>
          </div>
        </section>

        {/* Philosophy / Narrative Section */}
        <section className="flex flex-col items-center mb-20 md:mb-32 relative px-2">
          <div className="hairline-divider h-16 md:h-24 mb-8 md:mb-12"></div>
          <h2 className="clash-title text-3xl md:text-6xl text-center max-w-4xl mb-16 md:mb-24 leading-tight">
            Your academic life, <br className="md:hidden" /><span className="font-serif italic font-normal">synthesized.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
            <div className="flex flex-col gap-4 border-t border-border/20 pt-6">
              <h3 className="clash-title text-2xl uppercase">Minimalist Design</h3>
              <p className="text-foreground/70 font-medium">
                Eliminate the visual noise of traditional Learning Management Systems. Focus purely on the data that drives execution.
              </p>
            </div>
            <div className="flex flex-col gap-4 border-t border-border/20 pt-6">
              <h3 className="clash-title text-2xl uppercase">Instant Sync</h3>
              <p className="text-foreground/70 font-medium">
                Seamlessly bridges with your existing university infrastructure. Never miss a deadline with automated timeline synchronization.
              </p>
            </div>
            <div className="flex flex-col gap-4 border-t border-border/20 pt-6">
              <h3 className="clash-title text-2xl uppercase">Focus Driven</h3>
              <p className="text-foreground/70 font-medium">
                Built around Anki-style overdue, today, and upcoming assignment buckets, prioritizing what matters most.
              </p>
            </div>
          </div>
        </section>

        {/* Asymmetrical Showcase Grid */}
        <section className="mb-32">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="clash-title text-3xl uppercase">The Interface</h2>
            <div className="flex-1 hairline-divider h-px w-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
            {/* 1. Large 8-column rectangular card */}
            <div className="md:col-span-8 rounded-sm overflow-hidden relative group reveal-transition bg-[#e5e5e5]">
              <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover grayscale-hover hover-scale opacity-80" alt="Showcase" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-background/90 to-transparent pointer-events-none">
                <h3 className="clash-title text-3xl mb-2 z-10 text-background mix-blend-difference">Action Hub</h3>
                <p className="font-medium text-background/80 z-10 mix-blend-difference">Your centralized command center.</p>
              </div>
            </div>

            {/* 2. Vertical 4-column pill-shaped card */}
            <div className="md:col-span-4 md:row-span-2 rounded-[9999px] overflow-hidden relative group reveal-transition bg-[#d1d1d1]">
              <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover grayscale-hover hover-scale opacity-80" alt="Showcase" />
              <div className="absolute inset-0 bg-background/40 group-hover:bg-transparent transition-colors duration-500 z-0"></div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10">
                <div className="w-32 h-32 rounded-full border border-background/20 backdrop-blur-md flex flex-col items-center justify-center text-center p-4">
                  <span className="text-xs uppercase tracking-widest font-bold text-background">Explore</span>
                </div>
              </div>
            </div>

            {/* 3. Circular 5-column aspect-square */}
            <div className="md:col-span-5 rounded-full overflow-hidden relative group reveal-transition bg-[#c9c9c9] aspect-square md:aspect-auto">
              <img src="https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=1974&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover grayscale-hover hover-scale opacity-80" alt="Showcase" />
              <div className="absolute inset-0 p-8 flex flex-col items-center justify-center text-center bg-background/20 pointer-events-none">
                <h3 className="clash-title text-2xl z-10 text-background mix-blend-difference">Analytics</h3>
              </div>
            </div>

            {/* 4. Wide 7-column rectangle */}
            <div className="md:col-span-7 rounded-sm overflow-hidden relative group reveal-transition bg-[#bfbfbf]">
              <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover grayscale-hover hover-scale opacity-80" alt="Showcase" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-background/90 to-transparent pointer-events-none">
                <h3 className="clash-title text-2xl z-10 text-background mix-blend-difference">Timeline Sync</h3>
              </div>
            </div>
          </div>
        </section>

      </div>

    </main>
  )
}
