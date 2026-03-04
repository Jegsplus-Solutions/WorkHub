"use client";
import { useEffect, useRef, useState } from "react";

export function ScrollFadeGradient() {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const container = ref.current?.closest("[data-scroll-container]") as HTMLElement | null;
    if (!container) return;
    const check = () => setScrolled(container.scrollTop > 0);
    check();
    container.addEventListener("scroll", check, { passive: true });
    return () => container.removeEventListener("scroll", check);
  }, []);

  return (
    <>
      {/* Anchor for scroll container detection — always rendered */}
      <div ref={ref} />
      {scrolled ? (
        /* Scrolled: absolute fade overlay, content blends under sticky header */
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: "100%", height: "25px", background: "linear-gradient(to bottom, #ffffff, rgba(255,255,255,0))" }}
        />
      ) : (
        /* At top: in-flow blend gradient, white → section background */
        <div
          className="pointer-events-none"
          style={{ height: "25px", background: "linear-gradient(to bottom, #ffffff, #f5f6fa)" }}
        />
      )}
    </>
  );
}
