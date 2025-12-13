"use client";

import { useEffect } from "react";

/**
 * Syncs a CSS var --mc-vv-offset with the visual viewport keyboard offset (iOS friendly).
 * Optionally runs a callback when the offset changes (e.g., to re-scroll chat).
 */
export function useVisualViewportOffset(onChange?: (offset: number) => void) {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const setOffsetVar = (offset: number) => {
      document.documentElement.style.setProperty(
        "--mc-vv-offset",
        `${Math.max(0, offset)}px`
      );
    };

    let lastOffset = -1;

    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (offset === lastOffset) return;
      lastOffset = offset;
      setOffsetVar(offset);
      onChange?.(offset);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setOffsetVar(0);
    };
  }, [onChange]);
}
