"use client";

/**
 * @author: @dorianbaffier
 * @description: Typewriter
 * @version: 1.1.0
 * @date: 2026-10-14
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion, useInView, useReducedMotion } from "motion/react";
import { type Ref, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TypewriterSequence {
  text: string;
  deleteAfter?: boolean;
  pauseAfter?: number;
}

type TypewriterElement = "div" | "p" | "span" | "h1" | "h2" | "h3";

export interface TypewriterTitleProps {
  sequences?: TypewriterSequence[];
  typingSpeed?: number;
  startDelay?: number;
  autoLoop?: boolean;
  loopDelay?: number;
  deleteSpeed?: number;
  pauseBeforeDelete?: number;
  naturalVariance?: boolean;
  deleteMode?: "backspace" | "select";
  typos?: boolean | number;
  seed?: number;
  paused?: boolean;
  as?: TypewriterElement;
  className?: string;
  textClassName?: string;
}

const DEFAULT_SEQUENCES: TypewriterSequence[] = [
  { text: "ready to tackle your coursework?", deleteAfter: true },
  { text: "you're on a roll with submissions", deleteAfter: true },
  { text: "focus on today's priorities", deleteAfter: false },
];

const NEXT_SEQUENCE_DELAY = 100;
const CARET_IDLE_MS = 500;
const TYPO_NOTICE_MS = 250;
const DEFAULT_TYPO_RATE = 0.04;
const SELECT_SWEEP_MS = 120;
const SELECT_HOLD_MS = 220;

const CARET_KEYFRAMES =
  "@keyframes kokonutui-typewriter-caret { 0%, 33.333% { opacity: 1; } 66.667%, 100% { opacity: 0; } }";

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function neighbours(char: string) {
  const lower = char.toLowerCase();
  const row = KEY_ROWS.findIndex((keys) => keys.includes(lower));
  if (row === -1) {
    return "";
  }
  const col = KEY_ROWS[row].indexOf(lower);
  const around = [
    KEY_ROWS[row][col - 1],
    KEY_ROWS[row][col + 1],
    KEY_ROWS[row - 1]?.[col],
    KEY_ROWS[row + 1]?.[col],
  ]
    .filter(Boolean)
    .join("");
  return char === lower ? around : around.toUpperCase();
}

function createRandom(seed: number) {
  let state = (Math.abs(Math.floor(seed)) % 2_147_483_646) + 1;
  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
}

function getTypingDelay(
  typingSpeed: number,
  naturalVariance: boolean,
  random: () => number
) {
  if (!naturalVariance) {
    return typingSpeed;
  }
  const roll = random();
  if (roll < 0.1) {
    return typingSpeed * 2;
  }
  if (roll > 0.9) {
    return typingSpeed * 0.5;
  }
  return typingSpeed * (0.6 + random() * 0.8);
}

class Stopped extends Error {}

interface Position {
  sequence: number;
  char: number;
  deleting: boolean;
}

interface Screen {
  text: string;
  selected: number;
}

export function TypewriterTitle({
  sequences = DEFAULT_SEQUENCES,
  typingSpeed = 45,
  startDelay = 200,
  autoLoop = true,
  loopDelay = 1800,
  deleteSpeed = 25,
  pauseBeforeDelete = 1500,
  naturalVariance = true,
  deleteMode = "backspace",
  typos = false,
  seed = 7,
  paused = false,
  as: Component = "div",
  className,
  textClassName,
}: TypewriterTitleProps) {
  const [screen, setScreen] = useState<Screen>({ text: "", selected: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref);
  const isRunning = !paused && isInView;
  const shouldReduceMotion = useReducedMotion();
  const position = useRef<Position>({ sequence: 0, char: 0, deleting: false });
  const random = useRef<() => number>(createRandom(seed));

  const sequencesRef = useRef(sequences);
  useEffect(() => {
    sequencesRef.current = sequences;
  }, [sequences]);

  useEffect(() => {
    random.current = createRandom(seed);
  }, [seed]);

  const finalText = sequences.at(-1)?.text ?? "";
  useEffect(() => {
    if (shouldReduceMotion) {
      setScreen({ text: finalText, selected: 0 });
    }
  }, [shouldReduceMotion, finalText]);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }
    if (!isRunning) {
      return;
    }

    let typoRate = 0;
    if (typeof typos === "number") {
      typoRate = typos;
    } else if (typos) {
      typoRate = DEFAULT_TYPO_RATE;
    }
    const pos = position.current;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        if (stopped) {
          reject(new Stopped());
          return;
        }
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (stopped) {
            reject(new Stopped());
          } else {
            resolve();
          }
        }, ms);
        timers.add(timer);
      });

    const keystroke = () => {
      const caret = caretRef.current;
      if (!caret) {
        return;
      }
      caret.dataset.idle = "false";
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        caret.dataset.idle = "true";
      }, CARET_IDLE_MS);
    };
    const show = (text: string, selected = 0) => {
      setScreen({ text, selected });
    };

    const typeChar = async (text: string) => {
      const wrongKeys = neighbours(text[pos.char]);
      if (wrongKeys && random.current() < typoRate) {
        const wrong =
          wrongKeys[Math.floor(random.current() * wrongKeys.length)];
        show(text.slice(0, pos.char) + wrong);
        keystroke();
        await wait(TYPO_NOTICE_MS + typingSpeed);
        show(text.slice(0, pos.char));
        keystroke();
        await wait(typingSpeed * 1.5);
      }
      pos.char += 1;
      show(text.slice(0, pos.char));
      keystroke();
      await wait(getTypingDelay(typingSpeed, naturalVariance, random.current));
    };

    const erase = async (text: string) => {
      if (deleteMode === "select") {
        const length = pos.char;
        const step = SELECT_SWEEP_MS / Math.max(length, 1);
        for (let selected = 1; selected <= length; selected++) {
          show(text.slice(0, length), selected);
          keystroke();
          await wait(step);
        }
        await wait(SELECT_HOLD_MS);
        pos.char = 0;
        show("");
        keystroke();
        return;
      }
      while (pos.char > 0) {
        pos.char -= 1;
        show(text.slice(0, pos.char));
        keystroke();
        await wait(deleteSpeed);
      }
    };

    const advance = async (delay: number) => {
      const isLast = pos.sequence >= sequencesRef.current.length - 1;
      if (isLast && !autoLoop) {
        return false;
      }
      pos.sequence = isLast ? 0 : pos.sequence + 1;
      pos.char = 0;
      pos.deleting = false;
      await wait(isLast ? loopDelay : delay);
      show("");
      return true;
    };

    const phrase = async () => {
      const list = sequencesRef.current;
      if (pos.sequence >= list.length) {
        pos.sequence = 0;
        pos.char = 0;
        pos.deleting = false;
      }
      const sequence = list[pos.sequence];
      if (!sequence) {
        return false;
      }
      const { text } = sequence;
      pos.char = Math.min(pos.char, text.length);
      show(text.slice(0, pos.char));

      if (!pos.deleting) {
        while (pos.char < text.length) {
          await typeChar(text);
        }
        const pause = sequence.pauseAfter ?? pauseBeforeDelete;
        const isLast = pos.sequence === list.length - 1;
        if (!(sequence.deleteAfter || (isLast && autoLoop))) {
          return advance(pause);
        }
        await wait(pause);
        pos.deleting = true;
      }
      await erase(text);
      return advance(NEXT_SEQUENCE_DELAY);
    };

    const run = async () => {
      try {
        await wait(startDelay);
        while (await phrase()) {
          // continue
        }
      } catch (error) {
        if (!(error instanceof Stopped)) {
          throw error;
        }
      }
    };
    run();

    const caret = caretRef.current;
    return () => {
      stopped = true;
      for (const timer of timers) {
        clearTimeout(timer);
      }
      clearTimeout(idleTimer);
      if (caret) {
        caret.dataset.idle = "true";
      }
    };
  }, [
    typingSpeed,
    deleteSpeed,
    pauseBeforeDelete,
    autoLoop,
    loopDelay,
    startDelay,
    naturalVariance,
    deleteMode,
    typos,
    shouldReduceMotion,
    isRunning,
  ]);

  const kept = screen.text.slice(0, screen.text.length - screen.selected);
  const selected = screen.text.slice(kept.length);

  return (
    <Component
      className={cn(
        "@container flex items-center justify-start text-foreground tracking-normal",
        className
      )}
    >
      <style href="kokonutui-type-writer" precedence="default">
        {CARET_KEYFRAMES}
      </style>
      <span className="sr-only">
        {sequences.map((sequence) => sequence.text).join(", ")}
      </span>
      <motion.span
        animate={{ opacity: 1 }}
        aria-hidden="true"
        className={cn(
          "inline-grid justify-items-start whitespace-pre pr-[0.2em] text-sm md:text-base font-normal leading-[1.3]",
          textClassName
        )}
        initial={{ opacity: 0 }}
        ref={ref}
        transition={{ duration: 0.5 }}
      >
        {sequences.map((sequence, index) => (
          <span
            className="invisible col-start-1 row-start-1"
            key={index}
          >
            {sequence.text}
          </span>
        ))}
        <span className="col-start-1 row-start-1 min-h-[1.2em]">
          {kept}
          <Caret caretRef={caretRef} />
          {selected && (
            <span className="rounded-[0.08em] bg-sky-500/25 dark:bg-sky-400/30">
              {selected}
            </span>
          )}
        </span>
      </motion.span>
    </Component>
  );
}

function Caret({ caretRef }: { caretRef: Ref<HTMLSpanElement> }) {
  return (
    <span className="relative inline-block w-0">
      <span
        className="absolute bottom-[-0.1em] left-[0.04em] h-[1.05em] w-[0.08em] min-w-[2px] bg-current motion-safe:data-[idle=true]:animate-[kokonutui-typewriter-caret_1s_linear_infinite]"
        data-idle="true"
        ref={caretRef}
      />
    </span>
  );
}

export default TypewriterTitle;
