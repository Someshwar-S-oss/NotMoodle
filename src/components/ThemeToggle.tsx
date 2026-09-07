'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-label="Toggle theme"
        className={`w-9 h-9 rounded-full border border-border/20 flex items-center justify-center opacity-60 cursor-default ${className}`}
      >
        <span className="w-4 h-4 rounded-full bg-muted/40" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 rounded-full border border-border/20 hover:border-foreground/40 bg-card/50 hover:bg-muted/80 flex items-center justify-center text-foreground/80 hover:text-foreground transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-foreground ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}

export default ThemeToggle;
