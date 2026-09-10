"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });

    // PublicHeader locks the body while its mobile menu is open.
    const syncScrollLock = () => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    const ObserverClass = typeof window !== "undefined" ? window.MutationObserver : null;
    const observer = ObserverClass ? new ObserverClass(syncScrollLock) : null;
    if (observer) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    }
    syncScrollLock();

    return () => {
      if (observer) observer.disconnect();
      lenis.destroy();
    };
  }, [pathname]);

  return null;
}
