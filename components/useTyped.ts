"use client";

import { useEffect, useRef, useState } from "react";

/** Reveals text at a fixed cadence, independent of frame rate. */
export function useTyped(text: string, duration: number): [string, boolean] {
  const [shown, setShown] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    setShown(0);
    const started = performance.now();
    const total = Math.max(320, Math.min(duration, 2600));
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / total);
      setShown(progress >= 1 ? text.length : Math.floor(text.length * progress));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [text, duration]);

  return [text.slice(0, shown), shown >= text.length];
}
