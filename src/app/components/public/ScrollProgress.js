"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function ScrollProgress() {
  const barRef = useRef(null);
  const pathname = usePathname();

  const isCrmRoute =
    pathname?.startsWith("/crm") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/operations") ||
    pathname?.startsWith("/dashboard");

  useEffect(() => {
    if (isCrmRoute) return undefined;
    const bar = barRef.current;
    if (!bar) return undefined;

    let ticking = false;

    const updateScrollProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;

      bar.style.transform = `scaleX(${progress})`;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    updateScrollProgress();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isCrmRoute]);

  if (isCrmRoute) return null;

  return <div id="scroll-progress-bar" ref={barRef} aria-hidden="true" />;
}
