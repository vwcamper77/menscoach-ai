"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Put this on the scrollable container that holds the messages */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Put this at the very bottom of your messages list */
  bottomRef: React.RefObject<HTMLElement | null>;
  /** Change this when new content arrives (e.g. messages.length) */
  watchKey: any;
};

export default function ScrollToBottom({ containerRef, bottomRef, watchKey }: Props) {
  const [show, setShow] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  // Detect whether the bottom sentinel is visible inside the scroll container
  useEffect(() => {
    const container = containerRef.current;
    const bottom = bottomRef.current;
    if (!container || !bottom) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // If bottom is NOT visible, user is scrolled up, show button
        setShow(!entry.isIntersecting);
      },
      {
        root: container,
        threshold: 1.0,
      }
    );

    observer.observe(bottom);
    return () => observer.disconnect();
  }, [containerRef, bottomRef]);

  // Auto-scroll on new messages only if user is already near the bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom < 120;

    if (nearBottom) scrollToBottom("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchKey]);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => scrollToBottom("smooth")}
      className="fixed bottom-24 right-4 z-50 rounded-full border border-white/10 bg-slate-900/80 backdrop-blur px-3 py-3 text-white shadow-lg hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
      aria-label="Scroll to latest message"
      title="Scroll to latest"
      style={{ bottom: `calc(96px + var(--mc-vv-offset, 0px))` }}
    >
      {/* Down arrow */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5v12m0 0 5-5m-5 5-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
