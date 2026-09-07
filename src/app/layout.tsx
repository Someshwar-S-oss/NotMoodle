import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandMenu } from "@/components/CommandMenu";
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/login/actions';
import Link from 'next/link';
import { NavigationDock } from '@/components/NavigationDock';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Not Moodle - Brutalist Academic Dashboard",
  description: "A sophisticated synthesis of academic workflows.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isApproved = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_approved').eq('id', user.id).maybeSingle();
    isApproved = !!profile?.is_approved;
  }

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[100] focus:bg-foreground focus:text-background focus:py-3 focus:px-6 focus:text-sm focus:font-bold focus:uppercase focus:tracking-widest">
            Skip to main content
          </a>
          <div className="cloudy-gradient" aria-hidden="true" />
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 h-[80px] bg-background/80 backdrop-blur-md border-b border-border/10 px-4 md:px-8 flex justify-between items-center relative z-50 transition-colors duration-300">
              <Link href={user ? "/dashboard" : "/"} className="clash-title text-xl md:text-3xl uppercase tracking-tight hover:opacity-85 transition-opacity truncate mr-4">The NotMoodle</Link>
              <div className="flex items-center gap-4 md:gap-8 shrink-0">
                {!user && (
                  <nav className="hidden md:flex items-center gap-6 text-[14px] uppercase tracking-wide font-medium">
                    <Link href="/" className="transition-colors duration-150 hover:text-foreground/70">Platform</Link>
                    <Link href="/" className="transition-colors duration-150 hover:text-foreground/70">Philosophy</Link>
                  </nav>
                )}
                <div className="flex items-center gap-3 md:gap-4">
                  <ThemeToggle />
                  {user ? (
                    <>
                      <NotificationBell />
                      <form action={logout}>
                        <button type="submit" className="px-5 py-2 text-[13px] md:text-[14px] uppercase tracking-wider font-semibold rounded-full border border-border/40 hover:border-foreground bg-card/40 hover:bg-foreground hover:text-background transition-all duration-200 cursor-pointer shadow-xs">
                          Log Out
                        </button>
                      </form>
                    </>
                  ) : (
                    <Link href="/login" className="px-5 py-2 text-[13px] md:text-[14px] uppercase tracking-wider font-semibold rounded-full border border-border/40 hover:border-foreground bg-card/40 hover:bg-foreground hover:text-background transition-all duration-200 shadow-xs">
                      Log In
                    </Link>
                  )}
                </div>
              </div>
            </header>
            <div className="flex-1" id="main-content">
              {children}
            </div>
            {isApproved && <NavigationDock />}
          </div>
          <CommandMenu />
        </ThemeProvider>
      </body>
    </html>
  );
}
