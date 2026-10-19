"use client";

/**
 * @author: @kokonutui
 * @description: Command Palette with ⌘K, nested pages, fuzzy matching and in-row action progress
 * @version: 2.0.0
 * @date: 2026-10-14
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  FilePlus,
  FolderInput,
  History,
  Keyboard,
  Link2,
  LoaderCircle,
  Search,
  SunMoon,
  UserPlus,
} from "lucide-react";
import { animate, useReducedMotion } from "motion/react";
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  icon?: ReactNode;
  group?: string;
  keywords?: string[];
  shortcut?: string[];
  href?: string;
  children?: CommandItem[];
  placeholder?: string;
  onSelect?: () => void;
}

export type Action = CommandItem;

export interface ActionSearchBarProps {
  items?: CommandItem[];
  defaultRecent?: string[];
  onSelect?: (item: CommandItem, path: CommandItem[]) => unknown;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  defaultOpen?: boolean;
  shortcut?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

interface Entry {
  item: CommandItem;
  path: CommandItem[];
}

interface Row extends Entry {
  key: string;
  matches: number[];
  score: number;
}

interface Section {
  key: string;
  label?: string;
  rows: Row[];
}

type InputSource = "keyboard" | "pointer";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const HOLD_MS = 400;
const RECENT_LIMIT = 3;
const ICON = "size-4";

const sampleItems: CommandItem[] = [
  {
    id: "search-courses",
    label: "search courses",
    icon: <BookOpen className={ICON} />,
    group: "navigation",
    keywords: ["courses", "modules"],
  },
  {
    id: "shortcuts",
    label: "keyboard shortcuts",
    icon: <Keyboard className={ICON} />,
    group: "navigation",
    keywords: ["keys", "help"],
  },
];

const WORD_BREAK = /[\s\-_/.]/;
const WHITESPACE = /\s+/g;
const APPLE_PLATFORM = /mac|iphone|ipad/i;

const isWordStart = (text: string, i: number) =>
  i === 0 || WORD_BREAK.test(text[i - 1] ?? "");

function nextWordStart(t: string, ch: string, from: number) {
  for (let j = from; j < t.length; j++) {
    if (t[j] === ch && isWordStart(t, j)) {
      return j;
    }
  }
  return from;
}

function subsequence(t: string, q: string, preferWordStarts: boolean) {
  const matches: number[] = [];
  let score = 0;
  let from = 0;
  for (const ch of q) {
    let i = t.indexOf(ch, from);
    if (i < 0) {
      return null;
    }
    const prev = matches.at(-1);
    if (preferWordStarts && (prev === undefined || i !== prev + 1)) {
      i = nextWordStart(t, ch, i);
    }
    score += prev !== undefined && i === prev + 1 ? 6 : 1;
    score += isWordStart(t, i) ? 8 : 0;
    score -= prev === undefined ? i * 0.5 : (i - prev - 1) * 0.2;
    matches.push(i);
    from = i + 1;
  }
  return { score, matches };
}

export function fuzzyMatch(
  text: string,
  query: string
): { score: number; matches: number[] } | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(WHITESPACE, "");
  if (!q) {
    return { score: 0, matches: [] };
  }
  const at = t.indexOf(q);
  if (at >= 0) {
    const matches = Array.from({ length: q.length }, (_, k) => at + k);
    return { score: 100 - at + (isWordStart(t, at) ? 30 : 0), matches };
  }
  return subsequence(t, q, true) ?? subsequence(t, q, false);
}

function scoreEntry(entry: Entry, query: string) {
  const onLabel = fuzzyMatch(entry.item.label, query);
  if (onLabel) {
    return onLabel;
  }
  const extra = [
    ...entry.path.map((p) => p.label),
    ...(entry.item.keywords ?? []),
  ];
  let best: number | null = null;
  for (const word of extra) {
    const hit = fuzzyMatch(word, query);
    if (hit && (best === null || hit.score > best)) {
      best = hit.score;
    }
  }
  return best === null ? null : { score: best / 2, matches: [] };
}

function flatten(items: CommandItem[], path: CommandItem[] = []): Entry[] {
  const out: Entry[] = [];
  for (const item of items) {
    out.push({ item, path });
    if (item.children) {
      out.push(...flatten(item.children, [...path, item]));
    }
  }
  return out;
}

function groupRows(rows: Row[], fallback?: string): Section[] {
  const byGroup = new Map<string, Row[]>();
  for (const row of rows) {
    const label = row.path[0]?.group ?? row.item.group ?? fallback ?? "";
    const list = byGroup.get(label) ?? [];
    list.push(row);
    byGroup.set(label, list);
  }
  return [...byGroup].map(([label, list]) => ({
    key: label || "items",
    label: label || undefined,
    rows: list,
  }));
}

function buildSections(
  page: CommandItem | undefined,
  rootItems: CommandItem[],
  query: string,
  recent: Entry[]
): Section[] {
  const items = page?.children ?? rootItems;
  const fallback = page?.label;

  if (!query.trim()) {
    const rows = items.map<Row>((item) => ({
      item,
      path: [],
      key: item.id,
      matches: [],
      score: 0,
    }));
    const sections = groupRows(rows, fallback);
    if (!page && recent.length > 0) {
      sections.unshift({
        key: "recent",
        label: "recent",
        rows: recent.map((e) => ({
          ...e,
          key: `recent-${e.item.id}`,
          matches: [],
          score: 0,
        })),
      });
    }
    return sections;
  }

  const rows: Row[] = [];
  for (const entry of flatten(items)) {
    const hit = scoreEntry(entry, query);
    if (hit) {
      rows.push({ ...entry, key: entry.item.id, ...hit });
    }
  }
  const sections = groupRows(rows, fallback);
  for (const section of sections) {
    section.rows.sort((a, b) => b.score - a.score);
  }
  return sections;
}

function findEntry(items: CommandItem[], id: string): Entry | undefined {
  return flatten(items).find((e) => e.item.id === id);
}

function Highlighted({ text, matches }: { text: string; matches: number[] }) {
  if (matches.length === 0) {
    return <>{text}</>;
  }
  const hit = new Set(matches);
  const parts: { start: number; text: string; on: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const on = hit.has(i);
    const last = parts.at(-1);
    if (last && last.on === on) {
      last.text += text[i];
    } else {
      parts.push({ start: i, text: text[i] ?? "", on });
    }
  }
  return (
    <>
      {parts.map((p) =>
        p.on ? (
          <b
            className="font-semibold text-foreground"
            key={p.start}
          >
            {p.text}
          </b>
        ) : (
          <span key={p.start}>{p.text}</span>
        )
      )}
    </>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/40 bg-muted/50 px-1 font-mono text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}

function RowEnd({
  item,
  status,
}: {
  item: CommandItem;
  status: "pending" | "done" | undefined;
}) {
  if (status === "pending") {
    return (
      <LoaderCircle
        aria-hidden="true"
        className="size-4 animate-spin text-muted-foreground"
      />
    );
  }
  if (status === "done") {
    return (
      <Check
        aria-hidden="true"
        className="size-4 text-foreground"
      />
    );
  }
  if (item.children) {
    return <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />;
  }
  if (item.href) {
    return <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />;
  }
  if (item.shortcut) {
    return (
      <span aria-hidden="true" className="flex gap-0.5">
        {item.shortcut.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
    );
  }
  return null;
}

function isPaletteCombo(e: globalThis.KeyboardEvent) {
  return (
    (e.metaKey || e.ctrlKey) &&
    !e.altKey &&
    !e.shiftKey &&
    e.key.toLowerCase() === "k"
  );
}

function inOtherModal(focused: Element | null, root: HTMLElement) {
  const modal = focused?.closest('[aria-modal="true"]');
  return Boolean(modal && !modal.contains(root));
}

function useIsMac() {
  const [mac, setMac] = useState(true);
  useEffect(() => {
    setMac(APPLE_PLATFORM.test(navigator.userAgent));
  }, []);
  return mac;
}

export function ActionSearchBar({
  items = sampleItems,
  defaultRecent = [],
  onSelect,
  onOpenChange,
  open: controlledOpen,
  defaultOpen = false,
  shortcut = false,
  label = "search actions",
  placeholder = "search courses, assignments, or actions...",
  className,
}: ActionSearchBarProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const listboxId = `${uid}-listbox`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  const reduce = useReducedMotion();
  const isMac = useIsMac();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const [query, setQuery] = useState("");
  const [stack, setStack] = useState<CommandItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [running, setRunning] = useState<{
    key: string;
    phase: "pending" | "done";
  } | null>(null);
  const [recentIds, setRecentIds] = useState(defaultRecent);
  const [announcement, setAnnouncement] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onScreenRef = useRef(true);
  const hoverRef = useRef(false);
  const fadeNextOpen = useRef(false);
  const slideNext = useRef<0 | 1 | -1>(0);
  const springUntil = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);
  const holdTimer = useRef<number | undefined>(undefined);
  const runToken = useRef(0);

  const page = stack.at(-1);
  const recent = useMemo(
    () =>
      recentIds
        .map((id) => findEntry(items, id))
        .filter((e): e is Entry => e !== undefined && !e.item.children)
        .slice(0, RECENT_LIMIT),
    [recentIds, items]
  );
  const sections = useMemo(
    () => buildSections(page, items, query, recent),
    [page, items, query, recent]
  );
  const rows = useMemo(() => sections.flatMap((s) => s.rows), [sections]);
  const highlighted = Math.min(activeIndex, rows.length - 1);
  const activeRow = open ? rows[highlighted] : undefined;

  const setOpenState = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  const openPalette = useCallback(
    (source: InputSource) => {
      if (open) {
        return;
      }
      fadeNextOpen.current = source === "pointer";
      setActiveIndex(0);
      setOpenState(true);
    },
    [open, setOpenState]
  );

  const closePalette = useCallback(
    (restoreFocus: boolean) => {
      window.clearTimeout(holdTimer.current);
      runToken.current += 1;
      setRunning(null);
      setOpenState(false);
      setQuery("");
      setStack([]);
      setActiveIndex(0);
      const target = returnFocus.current;
      returnFocus.current = null;
      if (restoreFocus && target?.isConnected) {
        target.focus();
      }
    },
    [setOpenState]
  );

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      onScreenRef.current = entry?.isIntersecting ?? true;
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const hotkeyState = useRef({ open, openPalette, closePalette });
  useEffect(() => {
    hotkeyState.current = { open, openPalette, closePalette };
  });

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const root = rootRef.current;
      if (
        !(isPaletteCombo(e) && root && onScreenRef.current) ||
        e.defaultPrevented
      ) {
        return;
      }
      const focused = document.activeElement;
      const focusedInside = focused instanceof Node && root.contains(focused);
      if (!(shortcut || focusedInside || hoverRef.current)) {
        return;
      }
      if (inOtherModal(focused, root)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const state = hotkeyState.current;
      if (state.open) {
        state.closePalette(true);
        return;
      }
      if (focused instanceof HTMLElement && !focusedInside) {
        returnFocus.current = focused;
      }
      inputRef.current?.focus();
      inputRef.current?.select();
      state.openPalette("keyboard");
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [shortcut]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!(open && panel && fadeNextOpen.current)) {
      return;
    }
    fadeNextOpen.current = false;
    panel.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 120,
      easing: EASE_OUT,
    });
  }, [open]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const content = contentRef.current;
    if (!(open && body && content)) {
      return;
    }
    let controls: ReturnType<typeof animate> | undefined;
    const fitHeight = () => {
      const h = `${content.offsetHeight}px`;
      controls?.stop();
      if (!reduce && performance.now() < springUntil.current) {
        controls = animate(
          body,
          { height: h },
          { type: "spring", bounce: 0, duration: 0.32 }
        );
      } else {
        body.style.height = h;
      }
    };
    fitHeight();
    const ro = new ResizeObserver(fitHeight);
    ro.observe(content);
    return () => {
      ro.disconnect();
      controls?.stop();
    };
  }, [open, reduce]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const dir = slideNext.current;
    slideNext.current = 0;
    if (!list || dir === 0) {
      return;
    }
    list.animate(
      [
        {
          transform: reduce ? "none" : `translateX(${dir * 14}px)`,
          opacity: 0,
        },
        { transform: "none", opacity: 1 },
      ],
      { duration: 200, easing: EASE_OUT }
    );
  }, [stack.length]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const row = document.getElementById(optionId(highlighted));
    if (!(open && list && row)) {
      return;
    }
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop + 6) {
      list.scrollTop = top - 30;
    } else if (bottom > list.scrollTop + list.clientHeight - 6) {
      list.scrollTop = bottom - list.clientHeight + 6;
    }
  }, [open, highlighted, sections]);

  const pushPage = (item: CommandItem, source: InputSource) => {
    if (source === "pointer") {
      slideNext.current = 1;
      springUntil.current = performance.now() + 150;
    }
    setStack((s) => [...s, item]);
    setQuery("");
    setActiveIndex(0);
    setAnnouncement(`${item.label}, ${item.children?.length ?? 0} options`);
  };

  const popPage = (source: InputSource) => {
    const left = stack.at(-1);
    if (!left) {
      return;
    }
    if (source === "pointer") {
      slideNext.current = -1;
      springUntil.current = performance.now() + 150;
    }
    const nextStack = stack.slice(0, -1);
    setStack(nextStack);
    setQuery("");
    const back = buildSections(nextStack.at(-1), items, "", recent)
      .flatMap((s) => s.rows)
      .findIndex((r) => r.key === left.id);
    setActiveIndex(Math.max(0, back));
    setAnnouncement(nextStack.at(-1)?.label ?? "all commands");
    inputRef.current?.focus();
  };

  const finishRun = (row: Row, token: number) => {
    if (token !== runToken.current) {
      return;
    }
    setRunning({ key: row.key, phase: "done" });
    setAnnouncement(`${row.item.label}, done`);
    holdTimer.current = window.setTimeout(() => {
      if (token !== runToken.current) {
        return;
      }
      setRecentIds((ids) =>
        [row.item.id, ...ids.filter((id) => id !== row.item.id)].slice(
          0,
          RECENT_LIMIT
        )
      );
      closePalette(returnFocus.current !== null);
    }, HOLD_MS);
  };

  const runRow = (row: Row) => {
    runToken.current += 1;
    const token = runToken.current;
    row.item.onSelect?.();
    const result = onSelect?.(row.item, [...stack, ...row.path]);
    if (!(result instanceof Promise)) {
      finishRun(row, token);
      return;
    }
    setRunning({ key: row.key, phase: "pending" });
    setAnnouncement(`running ${row.item.label}`);
    result.then(
      () => finishRun(row, token),
      () => {
        if (token === runToken.current) {
          setRunning(null);
          setAnnouncement(`${row.item.label} failed`);
        }
      }
    );
  };

  const choose = (row: Row, source: InputSource) => {
    if (running) {
      return;
    }
    if (row.item.children) {
      pushPage(row.item, source);
    } else {
      runRow(row);
    }
  };

  const moveHighlight = (step: number) => {
    const count = rows.length;
    if (count > 0) {
      setActiveIndex((Math.max(highlighted, 0) + step + count) % count);
    }
  };

  const handleNavKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      e.preventDefault();
      openPalette("keyboard");
      return;
    }
    if (rows.length === 0) {
      return;
    }
    e.preventDefault();
    if (e.key === "Home" || e.key === "End") {
      setActiveIndex(e.key === "Home" ? 0 : rows.length - 1);
    } else {
      moveHighlight(e.key === "ArrowDown" ? 1 : -1);
    }
  };

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!open) {
      openPalette("keyboard");
    } else if (activeRow) {
      choose(activeRow, "keyboard");
    }
  };

  const handleEscape = (e: KeyboardEvent<HTMLInputElement>) => {
    if (open) {
      e.preventDefault();
      closePalette(true);
    } else if (query) {
      setQuery("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (running && e.key !== "Tab") {
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Home":
      case "End":
        handleNavKey(e);
        break;
      case "Enter":
        handleEnter(e);
        break;
      case "Backspace":
        if (open && query === "" && stack.length > 0) {
          e.preventDefault();
          popPage("keyboard");
        }
        break;
      case "Escape":
        handleEscape(e);
        break;
      default:
        break;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(0);
    openPalette("keyboard");
  };

  const handleInputPointerDown = (e: PointerEvent<HTMLInputElement>) => {
    if (e.button === 0) {
      openPalette("pointer");
    }
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (open && !(next instanceof Node && e.currentTarget.contains(next))) {
      returnFocus.current = null;
      closePalette(false);
    }
  };

  const pagePlaceholder = page
    ? (page.placeholder ?? `search ${page.label.toLowerCase()}…`)
    : placeholder;

  let rowIndex = -1;

  return (
    <div
      className={cn("relative h-[44px] w-full max-w-md", className)}
      onBlur={handleBlur}
      onPointerEnter={(e) => {
        hoverRef.current = e.pointerType === "mouse";
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
      ref={rootRef}
    >
      <div
        className={cn(
          "@container/palette absolute inset-x-0 top-0 z-30 overflow-hidden rounded-xl border border-border/40 bg-card backdrop-blur-md",
          open
            ? "shadow-xl"
            : "shadow-2xs"
        )}
      >
        <div className="flex h-11 items-center gap-2 px-3">
          <Search
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          {stack.map((p, i) => (
            <button
              aria-label={`back from ${p.label}`}
              className="inline-flex h-6 shrink-0 items-center rounded-md bg-muted px-2 font-medium text-xs text-foreground hover:bg-muted/80 lowercase"
              key={p.id}
              onClick={() => {
                if (i === stack.length - 1 && !running) {
                  popPage("pointer");
                }
              }}
              onPointerDown={(e) => e.preventDefault()}
              tabIndex={-1}
              type="button"
            >
              {p.label}
            </button>
          ))}
          <label className="sr-only" htmlFor={inputId}>
            {label}
          </label>
          <input
            aria-activedescendant={
              activeRow ? optionId(highlighted) : undefined
            }
            aria-autocomplete="list"
            aria-controls={open ? listboxId : undefined}
            aria-expanded={open}
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-xs md:text-sm text-foreground outline-none placeholder:text-muted-foreground lowercase"
            id={inputId}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPointerDown={handleInputPointerDown}
            placeholder={pagePlaceholder}
            readOnly={running !== null}
            ref={inputRef}
            role="combobox"
            spellCheck={false}
            type="text"
            value={query}
          />
          {!open && (
            <span aria-hidden="true" className="flex shrink-0 gap-0.5">
              <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </span>
          )}
        </div>

        {open && (
          <div
            onPointerDown={(e) => e.preventDefault()}
            ref={panelRef}
          >
            <div className="border-border/30 border-t" />
            <div className="overflow-hidden" ref={bodyRef}>
              <div ref={contentRef}>
                <div
                  aria-busy={running?.phase === "pending"}
                  aria-label={page ? page.label : "commands"}
                  className="relative max-h-72 overflow-y-auto overscroll-contain p-1.5"
                  id={listboxId}
                  ref={listRef}
                  role="listbox"
                >
                  {sections.map((section) => (
                    <div
                      aria-labelledby={
                        section.label ? `${uid}-${section.key}` : undefined
                      }
                      key={section.key}
                      role="group"
                    >
                      {section.label && (
                        <div
                          className="px-2 pt-2 pb-1 font-medium text-[11px] text-muted-foreground lowercase"
                          id={`${uid}-${section.key}`}
                          role="presentation"
                        >
                          {section.label}
                        </div>
                      )}
                      {section.rows.map((row) => {
                        rowIndex += 1;
                        const index = rowIndex;
                        const status =
                          running?.key === row.key ? running.phase : undefined;
                        return (
                          <div
                            aria-disabled={running !== null && !status}
                            aria-selected={index === highlighted}
                            className="group/row flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-xs md:text-sm text-foreground aria-disabled:opacity-50 aria-selected:bg-muted/70 lowercase transition-colors"
                            id={optionId(index)}
                            key={row.key}
                            onClick={() => choose(row, "pointer")}
                            onPointerMove={(e) => {
                              if (
                                e.pointerType === "mouse" &&
                                !running &&
                                index !== highlighted
                              ) {
                                setActiveIndex(index);
                              }
                            }}
                            role="option"
                          >
                            <span
                              aria-hidden="true"
                              className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
                            >
                              {row.item.icon}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {row.path.map((p) => (
                                <span
                                  className="text-muted-foreground"
                                  key={p.id}
                                >
                                  {p.label}
                                  <span aria-hidden="true"> › </span>
                                </span>
                              ))}
                              <Highlighted
                                matches={row.matches}
                                text={row.item.label}
                              />
                              {row.item.children && (
                                <span className="sr-only">, opens a page</span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center">
                              <RowEnd item={row.item} status={status} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {rows.length === 0 && (
                  <p className="px-3 pt-3 pb-6 text-center text-xs text-muted-foreground lowercase">
                    no results for &ldquo;{query.trim()}&rdquo;
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-border/30 border-t px-3 py-2 text-[10px] text-muted-foreground lowercase">
              <span className="flex items-center gap-1.5">
                <span className="hidden sm:flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  <span className="mr-1">navigate</span>
                </span>
                <Kbd>↵</Kbd>
                <span>{activeRow?.item.children ? "open" : "select"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                {stack.length > 0 && (
                  <>
                    <Kbd>⌫</Kbd>
                    <span className="mr-1">back</span>
                  </>
                )}
                <Kbd>esc</Kbd>
                <span>close</span>
              </span>
            </div>
          </div>
        )}
      </div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

export default ActionSearchBar;
