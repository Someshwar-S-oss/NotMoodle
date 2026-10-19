"use client";

/**
 * @author: @dorianbaffier
 * @description: Tool Dock
 * @version: 2.0.0
 * @date: 2026-10-14
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  Circle,
  GripHorizontal,
  GripVertical,
  Hand,
  type LucideIcon,
  MessageCircle,
  MousePointer2,
  PenTool,
  Slash,
  Square,
  Type,
} from "lucide-react";
import {
  AnimatePresence,
  type AnimationPlaybackControls,
  animate,
  motion,
  type Transition,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type DockEdge = "top" | "right" | "bottom" | "left";

export interface DockTool {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  cursor?: string;
  tools?: DockTool[];
  onClick?: () => void;
}

export interface ToolbarProps {
  tools?: DockTool[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (toolId: string) => void;
  defaultEdge?: DockEdge;
  onEdgeChange?: (edge: DockEdge) => void;
  shortcuts?: "scoped" | "global" | "off";
  ariaLabel?: string;
  className?: string;
  dockClassName?: string;
  children?: ReactNode;
}

const DEFAULT_TOOLS: DockTool[] = [
  {
    id: "select",
    label: "select",
    icon: MousePointer2,
    shortcut: "V",
    cursor: "default",
  },
  { id: "hand", label: "hand", icon: Hand, shortcut: "H", cursor: "grab" },
  {
    id: "shapes",
    label: "shapes",
    icon: Square,
    tools: [
      {
        id: "rectangle",
        label: "rectangle",
        icon: Square,
        shortcut: "R",
        cursor: "crosshair",
      },
      {
        id: "ellipse",
        label: "ellipse",
        icon: Circle,
        shortcut: "O",
        cursor: "crosshair",
      },
    ],
  },
  {
    id: "pen",
    label: "pen",
    icon: PenTool,
    shortcut: "P",
    cursor: "crosshair",
  },
  { id: "text", label: "text", icon: Type, shortcut: "T", cursor: "text" },
];

const EDGE_GAP = 12;
const TIP_DELAY = 400;
const TIP_WARM = 300;
const TIP_OFFSET = 8;
const LONG_PRESS = 350;
const DECELERATION = 0.998;
const PROJECTION = DECELERATION / (1 - DECELERATION);
const VELOCITY_WINDOW = 100;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const INSTANT: Transition = { duration: 0 };
const PLATE_SPRING: Transition = { type: "spring", bounce: 0, duration: 0.25 };
const REFLOW_SPRING: Transition = { type: "spring", bounce: 0, duration: 0.4 };
const DOCK_SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;
const DOCK_TWEEN = { duration: 0.2, ease: EASE_OUT } as const;

const NEXT_EDGE: Record<DockEdge, DockEdge> = {
  bottom: "left",
  left: "top",
  top: "right",
  right: "bottom",
};

const RESTING: Record<DockEdge, string> = {
  bottom: "bottom-3 left-1/2 -translate-x-1/2",
  top: "top-3 left-1/2 -translate-x-1/2",
  left: "left-3 top-1/2 -translate-y-1/2",
  right: "right-3 top-1/2 -translate-y-1/2",
};

const ORIGIN: Record<DockEdge, string> = {
  bottom: "50% 100%",
  top: "50% 0%",
  left: "0% 50%",
  right: "100% 50%",
};

const TIP_SHIFT: Record<DockEdge, string> = {
  bottom: "-translate-x-1/2 -translate-y-full",
  top: "-translate-x-1/2",
  left: "-translate-y-1/2",
  right: "-translate-x-full -translate-y-1/2",
};

const FLYOUT_SIDE: Record<DockEdge, string> = {
  bottom: "bottom-full left-1/2 mb-3 -translate-x-1/2",
  top: "top-full left-1/2 mt-3 -translate-x-1/2",
  left: "left-full top-1/2 ml-3 -translate-y-1/2",
  right: "right-full top-1/2 mr-3 -translate-y-1/2",
};

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500";

const isVertical = (edge: DockEdge) => edge === "left" || edge === "right";

const clamp = (v: number, min: number, max: number) =>
  min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v));

function edgeTarget(
  edge: DockEdge,
  width: number,
  height: number,
  dockW: number,
  dockH: number
) {
  switch (edge) {
    case "top":
      return { x: width / 2, y: EDGE_GAP + dockH / 2 };
    case "left":
      return { x: EDGE_GAP + dockW / 2, y: height / 2 };
    case "right":
      return { x: width - EDGE_GAP - dockW / 2, y: height / 2 };
    default:
      return { x: width / 2, y: height - EDGE_GAP - dockH / 2 };
  }
}

function nearestEdge(
  x: number,
  y: number,
  width: number,
  height: number
): DockEdge {
  const distances: [DockEdge, number][] = [
    ["bottom", height - y],
    ["top", y],
    ["left", x],
    ["right", width - x],
  ];
  let best = distances[0];
  for (const entry of distances) {
    if (entry[1] < best[1]) {
      best = entry;
    }
  }
  return best[0];
}

const dockTransform = (x: number, y: number) =>
  `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

function reflowStart(
  edge: DockEdge,
  x: number,
  y: number,
  from: { w: number; h: number },
  to: { w: number; h: number },
  width: number,
  height: number
) {
  let nx = x;
  let ny = y;
  if (edge === "left") {
    nx = x - from.w / 2 + to.w / 2;
  } else if (edge === "right") {
    nx = x + from.w / 2 - to.w / 2;
  } else if (edge === "top") {
    ny = y - from.h / 2 + to.h / 2;
  } else {
    ny = y + from.h / 2 - to.h / 2;
  }
  return {
    x: clamp(nx, to.w / 2, width - to.w / 2),
    y: clamp(ny, to.h / 2, height - to.h / 2),
  };
}

function tipPosition(edge: DockEdge, button: DOMRect, dock: DOMRect) {
  const midX = Math.round(button.left + button.width / 2 - dock.left);
  const midY = Math.round(button.top + button.height / 2 - dock.top);
  switch (edge) {
    case "top":
      return { x: midX, y: Math.round(dock.height + TIP_OFFSET) };
    case "left":
      return { x: Math.round(dock.width + TIP_OFFSET), y: midY };
    case "right":
      return { x: -TIP_OFFSET, y: midY };
    default:
      return { x: midX, y: -TIP_OFFSET };
  }
}

const TEXT_ROLES = new Set(["textbox", "searchbox", "combobox", "spinbutton"]);

function isEditable(target: EventTarget | null | undefined) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    TEXT_ROLES.has(target.getAttribute("role") ?? "")
  );
}

function isTyping(e: globalThis.KeyboardEvent) {
  return (
    e.isComposing ||
    isEditable(e.composedPath()[0]) ||
    isEditable(document.activeElement)
  );
}

function flatten(tools: DockTool[]) {
  const leaves: DockTool[] = [];
  const parentOf = new Map<string, string>();
  for (const tool of tools) {
    if (tool.tools?.length) {
      for (const sub of tool.tools) {
        leaves.push(sub);
        parentOf.set(sub.id, tool.id);
      }
    } else {
      leaves.push(tool);
    }
  }
  return { leaves, parentOf };
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="min-w-4 rounded border border-current/20 px-1 text-center font-mono font-normal text-[10px] leading-4 opacity-70">
      {children}
    </kbd>
  );
}

interface TipState {
  label: string;
  shortcut?: string;
  x: number;
  y: number;
  animated: boolean;
}

interface Hint {
  show: (el: HTMLElement, label: string, shortcut?: string) => void;
  hide: () => void;
}

interface FlyoutProps {
  tool: DockTool;
  current: string;
  edge: DockEdge;
  focusOnOpen: boolean;
  reduced: boolean;
  onPick: (id: string) => void;
  onClose: (returnFocus: boolean) => void;
}

function menuStep(key: string, i: number, n: number) {
  switch (key) {
    case "ArrowDown":
      return (i + 1) % n;
    case "ArrowUp":
      return (i - 1 + n) % n;
    case "Home":
      return 0;
    case "End":
      return n - 1;
    default:
      return -1;
  }
}

function Flyout({
  tool,
  current,
  edge,
  focusOnOpen,
  reduced,
  onPick,
  onClose,
}: FlyoutProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const items = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          '[role="menuitemradio"]'
        ) ?? []
      ),
    []
  );

  useEffect(() => {
    if (!focusOnOpen) {
      return;
    }
    const all = items();
    (
      all.find((el) => el.getAttribute("aria-checked") === "true") ?? all[0]
    )?.focus();
  }, [focusOnOpen, items]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose(true);
      return;
    }
    if (e.key === "Tab") {
      onClose(false);
      return;
    }
    const all = items();
    const next = menuStep(
      e.key,
      all.indexOf(e.target as HTMLElement),
      all.length
    );
    if (next !== -1) {
      e.preventDefault();
      e.stopPropagation();
      all[next]?.focus();
    }
  };

  return (
    <div className={cn("absolute z-30", FLYOUT_SIDE[edge])}>
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        aria-label={tool.label}
        className="w-44 rounded-xl border border-border bg-card p-1 shadow-lg"
        exit={{
          opacity: 0,
          scale: reduced ? 1 : 0.96,
          transition: { duration: 0.1, ease: EASE_OUT },
        }}
        initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
        onKeyDown={onKeyDown}
        ref={menuRef}
        role="menu"
        style={{ transformOrigin: ORIGIN[edge] }}
        transition={{ duration: 0.15, ease: EASE_OUT }}
      >
        {tool.tools?.map((sub) => {
          const checked = sub.id === current;
          return (
            <button
              aria-checked={checked}
              aria-keyshortcuts={sub.shortcut}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs lowercase",
                "transition-colors duration-150",
                FOCUS_RING,
                checked
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              key={sub.id}
              onClick={() => {
                sub.onClick?.();
                onPick(sub.id);
              }}
              role="menuitemradio"
              tabIndex={-1}
              type="button"
            >
              <sub.icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate">{sub.label}</span>
              {sub.shortcut ? <Kbd>{sub.shortcut}</Kbd> : null}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

interface SlotProps {
  tool: DockTool;
  current: string;
  choice?: string;
  edge: DockEdge;
  tabbable: boolean;
  plateId: string;
  plateTransition: Transition;
  reflow: Transition;
  reduced: boolean;
  flyout: { open: boolean; byKey: boolean };
  hint: Hint;
  onPick: (id: string) => void;
  onFlyout: (id: string | null, byKey?: boolean) => void;
}

function ToolSlot({
  tool,
  current,
  choice,
  edge,
  tabbable,
  plateId,
  plateTransition,
  reflow,
  reduced,
  flyout,
  hint,
  onPick,
  onFlyout,
}: SlotProps) {
  const subs = tool.tools?.length ? tool.tools : undefined;
  const shown =
    subs?.find((t) => t.id === current) ??
    subs?.find((t) => t.id === choice) ??
    subs?.[0] ??
    tool;
  const selected = shown.id === current;
  const vertical = isVertical(edge);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{
    timer?: ReturnType<typeof setTimeout>;
    x: number;
    y: number;
    fired: boolean;
  }>({ x: 0, y: 0, fired: false });

  useEffect(() => {
    const p = press.current;
    return () => clearTimeout(p.timer);
  }, []);

  const cancelPress = () => clearTimeout(press.current.timer);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    hint.hide();
    if (!subs || e.button !== 0) {
      return;
    }
    const p = press.current;
    p.fired = false;
    p.x = e.clientX;
    p.y = e.clientY;
    clearTimeout(p.timer);
    p.timer = setTimeout(() => {
      p.fired = true;
      onFlyout(tool.id);
    }, LONG_PRESS);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) {
      cancelPress();
    }
  };

  const onClick = () => {
    if (press.current.fired) {
      press.current.fired = false;
      return;
    }
    shown.onClick?.();
    onPick(shown.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const across = vertical
      ? e.key === "ArrowLeft" || e.key === "ArrowRight"
      : e.key === "ArrowUp" || e.key === "ArrowDown";
    if (subs && across) {
      e.preventDefault();
      onFlyout(tool.id, true);
    }
  };

  const close = (returnFocus: boolean) => {
    onFlyout(null);
    if (returnFocus) {
      buttonRef.current?.focus();
    }
  };

  return (
    <motion.div
      className="relative size-9 shrink-0"
      data-slot={tool.id}
      layout
      layoutDependency={vertical}
      transition={reflow}
    >
      {selected ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-foreground"
          layoutDependency={vertical}
          layoutId={plateId}
          style={{ borderRadius: 10 }}
          transition={plateTransition}
        />
      ) : null}
      <button
        aria-keyshortcuts={shown.shortcut}
        aria-label={shown.label}
        aria-pressed={selected}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-[10px]",
          "transition-colors duration-150 ease-out",
          FOCUS_RING,
          selected
            ? "text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        data-dock-item
        onBlur={hint.hide}
        onClick={onClick}
        onContextMenu={subs ? (e) => e.preventDefault() : undefined}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) {
            hint.show(e.currentTarget, shown.label, shown.shortcut);
          }
        }}
        onKeyDown={onKeyDown}
        onPointerCancel={cancelPress}
        onPointerDown={onPointerDown}
        onPointerEnter={(e) =>
          hint.show(e.currentTarget, shown.label, shown.shortcut)
        }
        onPointerLeave={() => {
          cancelPress();
          hint.hide();
        }}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        ref={buttonRef}
        tabIndex={tabbable ? 0 : -1}
        type="button"
      >
        <shown.icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
      </button>
      {subs ? (
        <button
          aria-expanded={flyout.open}
          aria-haspopup="menu"
          aria-label={`more ${tool.label.toLowerCase()}`}
          className={cn(
            "absolute right-[5px] bottom-[5px] flex size-2.5 items-end justify-end",
            "before:absolute before:-inset-1.5 before:content-['']",
            "transition-colors duration-150",
            selected
              ? "text-background/70 hover:text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onFlyout(flyout.open ? null : tool.id)}
          onPointerDown={hint.hide}
          tabIndex={-1}
          type="button"
        >
          <svg aria-hidden="true" className="size-[5px]" viewBox="0 0 5 5">
            <path d="M5 0V5H0Z" fill="currentColor" />
          </svg>
        </button>
      ) : null}
      <AnimatePresence>
        {subs && flyout.open ? (
          <Flyout
            current={current}
            edge={edge}
            focusOnOpen={flyout.byKey}
            key="flyout"
            onClose={close}
            onPick={(id) => {
              onPick(id);
              close(flyout.byKey);
            }}
            reduced={reduced}
            tool={tool}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

interface GripProps {
  vertical: boolean;
  dragging: boolean;
  tabbable: boolean;
  reflow: Transition;
  hint: Hint;
  onDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onNextEdge: () => void;
}

function DockGrip({
  vertical,
  dragging,
  tabbable,
  reflow,
  hint,
  onDown,
  onMove,
  onUp,
  onNextEdge,
}: GripProps) {
  const GripIcon = vertical ? GripHorizontal : GripVertical;
  return (
    <>
      <motion.div
        className="shrink-0"
        layout
        layoutDependency={vertical}
        transition={reflow}
      >
        <button
          aria-label="move toolbar"
          className={cn(
            "flex touch-none items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground",
            vertical ? "h-5 w-9" : "h-9 w-5",
            dragging ? "cursor-grabbing" : "cursor-grab",
            FOCUS_RING
          )}
          data-dock-item
          onBlur={hint.hide}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) {
              hint.show(e.currentTarget, "drag, or Enter to move");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNextEdge();
            }
          }}
          onLostPointerCapture={onUp}
          onPointerDown={onDown}
          onPointerEnter={(e) => hint.show(e.currentTarget, "drag to dock")}
          onPointerLeave={hint.hide}
          onPointerMove={onMove}
          tabIndex={tabbable ? 0 : -1}
          type="button"
        >
          <GripIcon aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      </motion.div>
      <motion.div
        aria-hidden
        className={cn(
          "shrink-0 bg-border",
          vertical ? "my-0.5 h-px w-5" : "mx-0.5 h-5 w-px"
        )}
        layout
        layoutDependency={vertical}
        transition={reflow}
      />
    </>
  );
}

function TipBubble({
  tip,
  edge,
  reduced,
}: {
  tip: TipState;
  edge: DockEdge;
  reduced: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute z-20", TIP_SHIFT[edge])}
      style={{ left: tip.x, top: tip.y }}
    >
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-medium text-background text-xs shadow-sm lowercase"
        initial={{
          opacity: 0,
          scale: reduced ? 1 : 0.96,
        }}
        style={{ transformOrigin: ORIGIN[edge] }}
        transition={{ duration: 0.15, ease: EASE_OUT }}
      >
        {tip.label}
        {tip.shortcut ? <Kbd>{tip.shortcut}</Kbd> : null}
      </motion.div>
    </div>
  );
}

function useTooltipGroup(
  dockRef: RefObject<HTMLDivElement | null>,
  edgeRef: RefObject<DockEdge>,
  blocked: RefObject<unknown>
) {
  const [tip, setTip] = useState<TipState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const open = useRef(false);
  const warmUntil = useRef(0);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    if (open.current) {
      warmUntil.current = performance.now() + TIP_WARM;
    }
    open.current = false;
    setTip(null);
  }, []);

  const show = useCallback(
    (el: HTMLElement, label: string, shortcut?: string) => {
      if (blocked.current) {
        return;
      }
      clearTimeout(timer.current);
      const reveal = (animated: boolean) => {
        const dock = dockRef.current;
        if (!dock) {
          return;
        }
        const pos = tipPosition(
          edgeRef.current,
          el.getBoundingClientRect(),
          dock.getBoundingClientRect()
        );
        open.current = true;
        setTip({ label, shortcut, ...pos, animated });
      };
      if (open.current || performance.now() < warmUntil.current) {
        reveal(false);
      } else {
        timer.current = setTimeout(() => reveal(true), TIP_DELAY);
      }
    },
    [dockRef, edgeRef, blocked]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const hint = useMemo<Hint>(() => ({ show, hide }), [show, hide]);
  return { tip, hint };
}

export function Toolbar({
  tools = DEFAULT_TOOLS,
  value,
  defaultValue,
  onValueChange,
  defaultEdge = "bottom",
  onEdgeChange,
  shortcuts = "scoped",
  ariaLabel = "tools",
  className,
  dockClassName,
  children,
}: ToolbarProps) {
  const uid = useId();
  const reduced = useReducedMotion() ?? false;
  const { leaves, parentOf } = useMemo(() => flatten(tools), [tools]);
  const [innerValue, setInnerValue] = useState(
    () => defaultValue ?? leaves[0]?.id ?? ""
  );
  const current = value ?? innerValue;
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [jump, setJump] = useState(false);
  const [edge, setEdge] = useState<DockEdge>(defaultEdge);
  const [measured, setMeasured] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [flyout, setFlyout] = useState<{ id: string; byKey: boolean } | null>(
    null
  );
  const [focusIndex, setFocusIndex] = useState(() => {
    const top = parentOf.get(current) ?? current;
    return (
      Math.max(
        0,
        tools.findIndex((t) => t.id === top)
      ) + 1
    );
  });
  const vertical = isVertical(edge);

  const stageRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const dragRef = useRef<any>(null);
  const animsRef = useRef<AnimationPlaybackControls[]>([]);
  const pendingVelocity = useRef({ x: 0, y: 0 });
  const fromSize = useRef<{ w: number; h: number } | null>(null);
  const mountedRef = useRef(false);
  const edgeRef = useRef(edge);
  edgeRef.current = edge;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const boundsRef = useRef({ W: 0, H: 0, w: 0, h: 0 });
  const transform = useTransform([cx, cy], ([x, y]: number[]) => {
    const b = boundsRef.current;
    return dockTransform(
      clamp(x ?? 0, b.w / 2, b.W - b.w / 2),
      clamp(y ?? 0, b.h / 2, b.H - b.h / 2)
    );
  });

  const { tip, hint } = useTooltipGroup(dockRef, edgeRef, dragRef);

  const select = (id: string, viaKey: boolean) => {
    setJump(viaKey);
    setInnerValue(id);
    const parent = parentOf.get(id);
    if (parent) {
      setChoices((c) => ({ ...c, [parent]: id }));
    }
    if (id !== current) {
      onValueChange?.(id);
    }
  };
  const selectRef = useRef(select);
  selectRef.current = select;

  const shortcutMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const leaf of leaves) {
      if (leaf.shortcut) {
        map.set(leaf.shortcut.toLowerCase(), leaf.id);
      }
    }
    return map;
  }, [leaves]);
  const keysRef = useRef({ shortcutMap, shortcuts });
  keysRef.current = { shortcutMap, shortcuts };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const { shortcutMap: map, shortcuts: mode } = keysRef.current;
      if (e.key === "Escape") {
        setFlyout(null);
        return;
      }
      if (
        mode === "off" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.repeat ||
        e.defaultPrevented ||
        isTyping(e)
      ) {
        return;
      }
      const focused = document.activeElement;
      const idle = !focused || focused === document.body;
      const inside =
        Boolean(stageRef.current?.contains(focused)) ||
        (hoverRef.current && idle);
      const id = map.get(e.key.toLowerCase());
      if (id && (mode === "global" || inside)) {
        e.preventDefault();
        selectRef.current(id, true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!flyout) {
      return;
    }
    const onDown = (e: globalThis.PointerEvent) => {
      const slot =
        e.target instanceof Element ? e.target.closest("[data-slot]") : null;
      if (slot?.getAttribute("data-slot") !== flyout.id) {
        setFlyout(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [flyout]);

  const stopAnims = useCallback(() => {
    for (const a of animsRef.current) {
      a.stop();
    }
    animsRef.current = [];
  }, []);

  const settle = useCallback(
    (velocity: { x: number; y: number } | null) => {
      const stage = stageRef.current;
      const dock = dockRef.current;
      if (!(stage && dock)) {
        return;
      }
      const size = { w: dock.offsetWidth, h: dock.offsetHeight };
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      boundsRef.current = { W, H, ...size };
      const edgeNow = edgeRef.current;
      const target = edgeTarget(edgeNow, W, H, size.w, size.h);
      stopAnims();
      if (!velocity) {
        cx.set(target.x);
        cy.set(target.y);
        return;
      }
      const from = fromSize.current;
      fromSize.current = null;
      if (from && (from.w !== size.w || from.h !== size.h)) {
        const start = reflowStart(
          edgeNow,
          cx.get(),
          cy.get(),
          from,
          size,
          W,
          H
        );
        cx.set(start.x);
        cy.set(start.y);
        dock.style.transform = dockTransform(start.x, start.y);
      }
      const opts = reducedRef.current ? DOCK_TWEEN : DOCK_SPRING;
      animsRef.current = [
        animate(cx, target.x, { ...opts, velocity: velocity.x }),
        animate(cy, target.y, { ...opts, velocity: velocity.y }),
      ];
    },
    [cx, cy, stopAnims]
  );

  useLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      settle(null);
      setMeasured(true);
      return;
    }
    settle(pendingVelocity.current);
    pendingVelocity.current = { x: 0, y: 0 };
  }, [edge, settle]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => {
      if (!dragRef.current) {
        settle(null);
      }
    });
    ro.observe(stage);
    return () => {
      ro.disconnect();
      stopAnims();
    };
  }, [settle, stopAnims]);

  const dockTo = (next: DockEdge, velocity: { x: number; y: number }) => {
    if (next === edgeRef.current) {
      settle(velocity);
      return;
    }
    pendingVelocity.current = velocity;
    const dock = dockRef.current;
    fromSize.current = dock
      ? { w: dock.offsetWidth, h: dock.offsetHeight }
      : null;
    setJump(false);
    setEdge(next);
    onEdgeChange?.(next);
  };

  const onGripDown = (e: PointerEvent<HTMLButtonElement>) => {
    const stage = stageRef.current;
    if (e.button !== 0 || !stage) {
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    stopAnims();
    const r = stage.getBoundingClientRect();
    const b = boundsRef.current;
    const x = clamp(cx.get(), b.w / 2, b.W - b.w / 2);
    const y = clamp(cy.get(), b.h / 2, b.H - b.h / 2);
    cx.set(x);
    cy.set(y);
    dragRef.current = {
      dx: e.clientX - r.left - x,
      dy: e.clientY - r.top - y,
      left: r.left,
      top: r.top,
      samples: [{ t: e.timeStamp, x, y, cx: x, cy: y }],
    };
    hint.hide();
    setFlyout(null);
    setDragging(true);
  };

  const onGripMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    const stage = stageRef.current;
    const dock = dockRef.current;
    if (!(d && stage && dock)) {
      return;
    }
    const hw = dock.offsetWidth / 2;
    const hh = dock.offsetHeight / 2;
    const x = e.clientX - d.left - d.dx;
    const y = e.clientY - d.top - d.dy;
    const drawnX = clamp(x, hw, stage.clientWidth - hw);
    const drawnY = clamp(y, hh, stage.clientHeight - hh);
    cx.set(drawnX);
    cy.set(drawnY);
    d.samples.push({ t: e.timeStamp, x, y, cx: drawnX, cy: drawnY });
    if (d.samples.length > 8) {
      d.samples.shift();
    }
  };

  const onGripUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    const stage = stageRef.current;
    if (!(d && stage)) {
      return;
    }
    dragRef.current = null;
    setDragging(false);
    const v = releaseVelocity(d.samples, e.timeStamp);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const from = d.samples.at(-1) ?? { x: cx.get(), y: cy.get() };
    const px = clamp(from.x + v.x * PROJECTION, 0, w);
    const py = clamp(from.y + v.y * PROJECTION, 0, h);
    dockTo(nearestEdge(px, py, w, h), { x: v.cx * 1000, y: v.cy * 1000 });
  };

  const dockItems = () =>
    Array.from(
      toolbarRef.current?.querySelectorAll<HTMLElement>("[data-dock-item]") ??
        []
    );

  const onToolbarKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = dockItems();
    const i = items.indexOf(e.target as HTMLElement);
    if (i === -1) {
      return;
    }
    const to = rovingStep(e.key, vertical, i, items.length);
    if (to !== -1) {
      e.preventDefault();
      items[to]?.focus();
    }
  };

  const onToolbarFocus = (e: FocusEvent<HTMLDivElement>) => {
    const i = dockItems().indexOf(e.target as HTMLElement);
    if (i !== -1) {
      setFocusIndex(i);
    }
  };

  const onFlyout = useCallback(
    (id: string | null, byKey = false) => {
      hint.hide();
      setFlyout(id ? { id, byKey } : null);
    },
    [hint]
  );

  const plateTransition = jump || reduced ? INSTANT : PLATE_SPRING;
  const reflow = reduced ? INSTANT : REFLOW_SPRING;

  return (
    <div
      className={cn(
        "relative w-full overflow-visible",
        className
      )}
      data-tool={current}
      onPointerEnter={(e) => {
        hoverRef.current = e.pointerType !== "touch";
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
      ref={stageRef}
    >
      {children}
      <motion.div
        className={cn(
          "relative z-10 cursor-auto mx-auto flex justify-center",
          measured ? "" : RESTING[edge]
        )}
        data-edge={edge}
        ref={dockRef}
      >
        <motion.div
          aria-label={ariaLabel}
          aria-orientation={vertical ? "vertical" : "horizontal"}
          className={cn(
            "flex items-center gap-1 border border-border/40 bg-card/85 backdrop-blur-md p-1.5 shadow-lg",
            vertical && "flex-col",
            dockClassName
          )}
          layout
          layoutDependency={vertical}
          onFocus={onToolbarFocus}
          onKeyDown={onToolbarKeyDown}
          ref={toolbarRef}
          role="toolbar"
          style={{ borderRadius: 18 }}
          transition={reflow}
        >
          <DockGrip
            dragging={dragging}
            hint={hint}
            onDown={onGripDown}
            onMove={onGripMove}
            onNextEdge={() =>
              dockTo(NEXT_EDGE[edgeRef.current], { x: 0, y: 0 })
            }
            onUp={onGripUp}
            reflow={reflow}
            tabbable={focusIndex === 0}
            vertical={vertical}
          />
          {tools.map((tool, index) => (
            <ToolSlot
              choice={choices[tool.id]}
              current={current}
              edge={edge}
              flyout={{
                open: flyout?.id === tool.id,
                byKey: flyout?.id === tool.id && flyout.byKey,
              }}
              hint={hint}
              key={tool.id}
              onFlyout={onFlyout}
              onPick={(id) => select(id, false)}
              plateId={`${uid}-plate`}
              plateTransition={plateTransition}
              reduced={reduced}
              reflow={reflow}
              tabbable={focusIndex === index + 1}
              tool={tool}
            />
          ))}
        </motion.div>

        {tip ? <TipBubble edge={edge} reduced={reduced} tip={tip} /> : null}
      </motion.div>
    </div>
  );
}

function releaseVelocity(samples: any[], now: number) {
  const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW);
  const first = recent[0];
  const last = recent.at(-1);
  if (!(first && last) || recent.length < 2) {
    return { x: 0, y: 0, cx: 0, cy: 0 };
  }
  const dt = Math.max(1, last.t - first.t);
  return {
    x: (last.x - first.x) / dt,
    y: (last.y - first.y) / dt,
    cx: (last.cx - first.cx) / dt,
    cy: (last.cy - first.cy) / dt,
  };
}

function rovingStep(key: string, vertical: boolean, i: number, n: number) {
  if (key === (vertical ? "ArrowDown" : "ArrowRight")) {
    return (i + 1) % n;
  }
  if (key === (vertical ? "ArrowUp" : "ArrowLeft")) {
    return (i - 1 + n) % n;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return n - 1;
  }
  return -1;
}

export default Toolbar;
