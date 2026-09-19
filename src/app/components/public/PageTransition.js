"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [transitionStage, setTransitionStage] = useState("entered");
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    // Trigger soft entry animation on route change
    setTransitionStage("enter");
    const rafId = window.requestAnimationFrame(() => {
      // Allow the DOM to apply the enter state before transitioning to entered
      const timer = setTimeout(() => {
        setTransitionStage("entered");
      }, 40);
      return () => clearTimeout(timer);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [pathname]);

  const isCrmRoute =
    pathname?.startsWith("/crm") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/operations") ||
    pathname?.startsWith("/dashboard");

  if (isCrmRoute) {
    return <>{children}</>;
  }

  const className = `page-transition-wrapper ${
    transitionStage === "enter" ? "page-transition-enter" : ""
  }`;

  return <div className={className}>{children}</div>;
}
