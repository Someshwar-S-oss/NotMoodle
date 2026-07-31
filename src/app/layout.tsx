import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandMenu } from "@/components/CommandMenu";
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/login/actions';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { NavigationDock } from '@/components/NavigationDock';
import { ThemeProvider } from '@/components/ThemeProvider';

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

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 h-[80px] bg-background/90 backdrop-blur-[12px] border-b border-border/10 px-4 md:px-8 flex justify-between items-center relative z-50">
              <Link href={user ? "/dashboard" : "/"} className="clash-title text-xl md:text-3xl uppercase hover:opacity-80 transition-opacity truncate mr-4">The NotMoodle</Link>
              <div className="flex items-center gap-4 md:gap-8 shrink-0">
                {!user && (
                  <nav className="hidden md:flex items-center gap-6 text-[14px] uppercase tracking-wide font-medium">
                    <Link href="/" className="transition-colors duration-120 hover:text-[#b6b5b5]">Platform</Link>
                    <Link href="/" className="transition-colors duration-120 hover:text-[#b6b5b5]">Philosophy</Link>
                  </nav>
                )}
                <div className="flex items-center gap-4">
                  {user ? (
                    <>
                      <NotificationBell />
                      <form action={logout}>
                        <button type="submit" className="px-5 py-2 text-[14px] uppercase tracking-wide font-medium rounded-full border border-border transition-colors duration-300 hover:bg-foreground hover:text-background cursor-pointer">
                          Log Out
                        </button>
                      </form>
                    </>
                  ) : (
                    <Link href="/login" className="px-5 py-2 text-[14px] uppercase tracking-wide font-medium rounded-full border border-border transition-colors duration-300 hover:bg-foreground hover:text-background">
                      Log In
                    </Link>
                  )}
                </div>
              </div>
            </header>
            <div className="flex-1">
              {children}
            </div>
            {user && <NavigationDock />}
          </div>
          <CommandMenu />
        </ThemeProvider>
      </body>
    </html>
  );
}
