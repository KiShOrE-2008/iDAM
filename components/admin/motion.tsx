'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Fired after an admin action changes counts shown elsewhere (e.g. the pending badge) */
export const ADMIN_REFRESH_EVENT = 'idam-admin-refresh';
export const notifyAdminRefresh = () => window.dispatchEvent(new Event(ADMIN_REFRESH_EVENT));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Eases a number toward `target`. Starts from 0 on first render (count-up on load),
 * then from the previous value, so a refresh shows the size of the change.
 */
export function useTweenedNumber(target: number, duration = 750) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  const current = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      // rAF timestamps can predate `start` by a frame; clamp so the first step never dips
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      current.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** Animated figure; screen readers get the final value only */
export const AnimatedNumber: React.FC<{ value: number; format?: (n: number) => string }> = ({ value, format = (n) => n.toLocaleString('en-IN') }) => {
  const shown = useTweenedNumber(value);
  return (
    <>
      <span aria-hidden="true">{format(Math.round(shown))}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
};

/** True for a moment after `value` changes (not on first render), to flag what moved */
export function useChangedFlash(value: unknown, ms = 1400) {
  const [flash, setFlash] = useState(false);
  // Compare with the last value rather than counting renders (effects run twice in dev)
  const previous = useRef(value);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return flash;
}

interface SlidingTabsProps<K> {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  /** 'tabs' renders an underline that slides; 'segmented' renders a sliding filled block */
  variant?: 'tabs' | 'segmented';
}

/** Tab row whose selection marker slides to the chosen option */
export function SlidingTabs<K extends string | number | null>({ options, value, onChange, label, variant = 'tabs' }: SlidingTabsProps<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);
  const index = Math.max(0, options.findIndex((o) => o.key === value));

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[index];
      if (el) setMarker({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [index, options.length]);

  const segmented = variant === 'segmented';

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`relative flex overflow-x-auto no-scrollbar ${segmented ? 'bg-white border border-slate-300 rounded-md p-0.5' : 'border-b border-slate-300'}`}
    >
      {marker && (
        <span
          aria-hidden="true"
          className={`absolute transition-[left,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            segmented ? 'top-0.5 bottom-0.5 bg-ink rounded' : 'bottom-0 h-[3px] bg-brand-700 rounded-t'
          }`}
          style={{ left: marker.left, width: marker.width }}
        />
      )}
      {options.map((o, i) => {
        const active = i === index;
        return (
          <button
            key={String(o.key)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`relative z-10 whitespace-nowrap text-sm font-bold transition-colors duration-200 cursor-pointer ${
              segmented ? 'px-3 py-1.5' : 'px-3 pb-2.5 pt-1'
            } ${active ? (segmented ? 'text-white' : 'text-ink') : 'text-slate-500 hover:text-ink'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Placeholder blocks shaped like the content while it loads */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`admin-shimmer rounded-md ${className}`} aria-hidden="true" />
);
