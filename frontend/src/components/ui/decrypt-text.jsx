"use client";

import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/* -------------------------------------------------------------------------- */
/* Decrypt Text — Financial Terminal Edition                                  */
/* -------------------------------------------------------------------------- */

const MOTIQ_TOKENS = "@layer motiq{:root{--motiq-accent:#6366f1;--motiq-accent-text:#818cf8;--motiq-bg:#080a11;--motiq-border:#1e293b;--motiq-border-strong:#334155;--motiq-fg:#f8fafc;--motiq-fg-secondary:#cbd5e1;--motiq-muted:#64748b;--motiq-secondary-accent:#38bdf8;--motiq-shadow-md:0 8px 24px -6px rgba(0, 0, 0, 0.4);--motiq-success:#10b981;--motiq-surface:#0d1118;--motiq-surface-2:#141b26}}@layer motiq{.dark,[data-theme=\"dark\"]{--motiq-accent:#818cf8;--motiq-accent-text:#a5b4fc;--motiq-bg:#080a11;--motiq-border:#1e293b;--motiq-border-strong:#334155;--motiq-fg:#f8fafc;--motiq-fg-secondary:#cbd5e1;--motiq-muted:#64748b;--motiq-secondary-accent:#38bdf8;--motiq-shadow-md:0 8px 24px -6px rgba(0, 0, 0, 0.6);--motiq-success:#34d399;--motiq-surface:#0d1118;--motiq-surface-2:#141b26}}";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useVisibilityPause(ref, { threshold = 0.1 } = {}) {
  const [onScreen, setOnScreen] = React.useState(true);
  const [tabVisible, setTabVisible] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((e) => e.isIntersecting)),
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  React.useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState !== "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return onScreen && tabVisible;
}

/* -------------------------------------------------------------------------- */
/* Financial Symbol Glyph Pools                                               */
/* -------------------------------------------------------------------------- */

const POOL_DISPLAY = "₹$%€£¥₿%▲▼#&*+=-/0123456789§¤";
const POOL_TERMINAL = "₹$€£¥₿0123456789%▲▼+=-/*#_~";

const HOVER_COOLDOWN = 1500;
const CYCLE_SPREAD = 35;
const FLASH_MS = 420;

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function DecryptTextBase({
  text,
  glyphs,
  speed = 45,
  stagger = 55,
  startDelay = 350,
  jitter = 120,
  trigger = "inview",
  variant = "display",
  loop = 7000,
  retriggerOnHover = true,
  seed = 1,
  as: Tag = "p",
  reducedMotion,
  onDecrypted,
  className,
  ...rest
}) {
  const rootRef = React.useRef(null);
  const charRefs = React.useRef([]);
  const rafRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const lastStartRef = React.useRef(-Infinity);
  const playedRef = React.useRef(false);
  const runRef = React.useRef(0);
  const onDecryptedRef = React.useRef(onDecrypted);
  onDecryptedRef.current = onDecrypted;

  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const scope = `mk-dt-${uid}`;

  const systemReduced = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const reduceNow = reducedMotion ?? systemReduced;
  const reduce = reducedMotion ?? (mounted ? systemReduced : false);

  const visible = useVisibilityPause(rootRef, { threshold: 0.12 });

  const pool = glyphs && glyphs.length > 0 ? glyphs : variant === "terminal" ? POOL_TERMINAL : POOL_DISPLAY;

  const words = React.useMemo(() => {
    const out = [];
    let i = 0;
    for (const word of text.split(" ")) {
      const item = [];
      for (const ch of Array.from(word)) {
        item.push({ i, ch });
        i += 1;
      }
      out.push(item);
    }
    return out;
  }, [text]);

  const total = React.useMemo(() => words.reduce((n, w) => n + w.length, 0), [words]);

  const stop = React.useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const resolveAll = React.useCallback(() => {
    for (const el of charRefs.current) {
      if (!el) continue;
      el.textContent = el.dataset.mkChar ?? el.textContent;
      el.dataset.state = "plain";
    }
  }, []);

  const play = React.useCallback((isHover = false) => {
    const rng = makeRng(seed + runRef.current * 7919);
    runRef.current += 1;
    stop();

    const cells = charRefs.current.filter((el) => el !== null);
    if (cells.length === 0) return;

    lastStartRef.current = performance.now();
    playedRef.current = true;

    const actualStartDelay = isHover ? 20 : startDelay;
    const actualJitter = isHover ? Math.min(jitter, 40) : jitter;
    const actualStagger = isHover ? Math.min(stagger, 28) : stagger;

    const lockAt = new Float64Array(cells.length);
    const nextAt = new Float64Array(cells.length);
    const locked = new Uint8Array(cells.length);
    cells.forEach((el, idx) => {
      lockAt[idx] = actualStartDelay + idx * actualStagger + (rng() * 2 - 1) * actualJitter;
      nextAt[idx] = 0;
      el.dataset.state = "scramble";
      el.textContent = pool.charAt((rng() * pool.length) | 0);
    });

    let remaining = cells.length;
    const t0 = performance.now();

    const frame = () => {
      const now = performance.now() - t0;
      for (let idx = 0; idx < cells.length; idx += 1) {
        if (locked[idx]) continue;
        const el = cells[idx];
        if (now >= (lockAt[idx] ?? 0)) {
          el.textContent = el.dataset.mkChar ?? "";
          el.dataset.state = "lock";
          locked[idx] = 1;
          remaining -= 1;
        } else if (now >= (nextAt[idx] ?? 0)) {
          el.textContent = pool.charAt((rng() * pool.length) | 0);
          nextAt[idx] = now + speed + rng() * CYCLE_SPREAD;
        }
      }
      if (remaining <= 0) {
        rafRef.current = null;
        onDecryptedRef.current?.();
        if (loop !== false && loop > 0) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            play(false);
          }, loop);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [jitter, loop, pool, seed, speed, stagger, startDelay, stop]);

  React.useLayoutEffect(() => {
    if (reduceNow) {
      stop();
      resolveAll();
      return;
    }
    if (!visible) {
      stop();
      return;
    }
    if (trigger === "hover") {
      if (!playedRef.current) resolveAll();
      return;
    }
    if (!playedRef.current) {
      play(false);
      return;
    }
    if (loop !== false && loop > 0 && rafRef.current == null && timerRef.current == null) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        play(false);
      }, Math.min(loop, 3000));
    }
  }, [loop, play, reduceNow, resolveAll, stop, trigger, visible]);

  React.useEffect(() => stop, [stop]);

  const onPointerEnter = React.useCallback(() => {
    if (reduceNow || !retriggerOnHover) return;
    if (rafRef.current != null) return;
    if (performance.now() - lastStartRef.current < HOVER_COOLDOWN) return;
    play(true);
  }, [play, reduceNow, retriggerOnHover]);

  const terminal = variant === "terminal";

  const css = `
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border-width:0!important;}
.${scope} [data-mk-char]{
  display:inline;
  font-variant-numeric:tabular-nums;
}
.${scope} [data-mk-caret]{animation:${scope}-caret 1.1s steps(1) infinite;}
@keyframes ${scope}-caret{50%{opacity:0;}}
@media (prefers-reduced-motion: reduce){.${scope} [data-mk-caret]{animation:none;}}
`;

  let cursor = -1;
  const glyphLayer = (
    <span aria-hidden="true" className="select-none">
      {words.map((word, w) => (
        <React.Fragment key={w}>
          <span className="inline whitespace-nowrap">
            {word.map((item) => {
              cursor += 1;
              const at = cursor;
              return (
                <span
                  key={item.i}
                  data-mk-char={item.ch}
                  data-state="plain"
                  ref={(el) => {
                    charRefs.current[at] = el;
                  }}
                >
                  {item.ch}
                </span>
              );
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </span>
  );

  return (
    <Tag
      ref={rootRef}
      data-motion={reduce ? "static" : "animated"}
      data-variant={variant}
      data-chars={total}
      onPointerEnter={onPointerEnter}
      className={cn(
        Tag === "span" ? "inline" : "w-full block",
        terminal
          ? "block font-mono text-[clamp(0.78rem,2.4vw,1rem)] leading-relaxed"
          : Tag === "span"
          ? "inline"
          : "block text-balance text-[clamp(1.6rem,5.2vw,3.3rem)] font-extrabold leading-[1.15] tracking-[-0.02em]",
        className
      )}
      {...rest}
    >
      <style>{css}</style>
      <span className="sr-only">{text}</span>
      {terminal ? (
        <span
          className={cn(
            scope,
            "inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-[10px] border px-4 py-3 align-middle"
          )}
          style={{
            borderColor: "var(--motiq-border, #1e293b)",
            background: "color-mix(in oklab, var(--motiq-surface, #0d1118) 88%, transparent)",
            boxShadow: "var(--motiq-shadow-md, 0 12px 32px rgba(0,0,0,.5))",
          }}
        >
          <span aria-hidden="true" style={{ color: "var(--motiq-success, #34d399)", marginRight: '4px' }}>
            ₹
          </span>
          {glyphLayer}
          <span
            aria-hidden="true"
            data-mk-caret=""
            className="inline-block h-[1.05em] w-[0.55em] align-text-bottom ml-1"
            style={{ background: "var(--motiq-success, #34d399)" }}
          />
        </span>
      ) : (
        <span className={cn(scope, "block")}>{glyphLayer}</span>
      )}
    </Tag>
  );
}

DecryptTextBase.displayName = "DecryptText";

export function DecryptText(props) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MOTIQ_TOKENS }} />
      <DecryptTextBase {...props} />
    </>
  );
}

export default DecryptText;
