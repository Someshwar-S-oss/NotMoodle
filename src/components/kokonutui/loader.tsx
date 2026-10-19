"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface LoaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  title?: string;
  /** Pass an empty string to show the title alone. */
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CONFIG = {
  sm: {
    container: "size-16",
    titleClass: "text-xs font-medium",
    subtitleClass: "text-[11px]",
    spacing: "space-y-1.5",
    maxWidth: "max-w-44",
  },
  md: {
    container: "size-24",
    titleClass: "text-sm font-medium",
    subtitleClass: "text-xs",
    spacing: "space-y-2",
    maxWidth: "max-w-56",
  },
  lg: {
    container: "size-32",
    titleClass: "text-base font-medium",
    subtitleClass: "text-sm",
    spacing: "space-y-2.5",
    maxWidth: "max-w-64",
  },
} as const;

const ringMask = (stops: string) =>
  `radial-gradient(circle at 50% 50%, ${stops})`;

const RINGS: { id: string; style: CSSProperties }[] = [
  {
    id: "outer",
    style: {
      background:
        "conic-gradient(from 0deg, transparent 0deg, currentColor 90deg, transparent 180deg)",
      mask: ringMask("transparent 35%, black 37%, black 39%, transparent 41%"),
      WebkitMask: ringMask(
        "transparent 35%, black 37%, black 39%, transparent 41%"
      ),
      opacity: 0.8,
      animationDuration: "3s",
    },
  },
  {
    id: "primary",
    style: {
      background:
        "conic-gradient(from 0deg, transparent 0deg, currentColor 120deg, color-mix(in srgb, currentColor 50%, transparent) 240deg, transparent 360deg)",
      mask: ringMask("transparent 42%, black 44%, black 48%, transparent 50%"),
      WebkitMask: ringMask(
        "transparent 42%, black 44%, black 48%, transparent 50%"
      ),
      opacity: 0.9,
      animationDuration: "1.2s",
    },
  },
  {
    id: "counter",
    style: {
      background:
        "conic-gradient(from 180deg, transparent 0deg, color-mix(in srgb, currentColor 60%, transparent) 45deg, transparent 90deg)",
      mask: ringMask("transparent 52%, black 54%, black 56%, transparent 58%"),
      WebkitMask: ringMask(
        "transparent 52%, black 54%, black 56%, transparent 58%"
      ),
      opacity: 0.35,
      animationDuration: "4s",
      animationDirection: "reverse",
    },
  },
  {
    id: "accent",
    style: {
      background:
        "conic-gradient(from 270deg, transparent 0deg, color-mix(in srgb, currentColor 40%, transparent) 20deg, transparent 40deg)",
      mask: ringMask("transparent 61%, black 62%, black 63%, transparent 64%"),
      WebkitMask: ringMask(
        "transparent 61%, black 62%, black 63%, transparent 64%"
      ),
      opacity: 0.5,
      animationDuration: "3.5s",
    },
  },
];

export function Loader({
  title = "loading your workspace...",
  subtitle = "syncing your coursework and data",
  size = "md",
  className,
  ...props
}: LoaderProps) {
  const config = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 p-4",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn("relative text-foreground", config.container)}
      >
        {RINGS.map((ring) => (
          <div
            className="absolute inset-0 rounded-full motion-safe:animate-spin motion-reduce:animate-pulse"
            key={ring.id}
            style={ring.style}
          />
        ))}
      </div>

      {(title || subtitle) && (
        <output
          aria-live="polite"
          className={cn(
            "block text-center transition-opacity duration-200 ease-out",
            config.spacing,
            config.maxWidth
          )}
        >
          {title && (
            <span
              className={cn(
                config.titleClass,
                "block text-foreground lowercase leading-[1.2] antialiased"
              )}
            >
              {title}
            </span>
          )}
          {subtitle && (
            <span
              className={cn(
                config.subtitleClass,
                "block font-normal text-muted-foreground lowercase leading-[1.4] antialiased"
              )}
            >
              {subtitle}
            </span>
          )}
        </output>
      )}
    </div>
  );
}

export default Loader;
