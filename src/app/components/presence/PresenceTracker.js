"use client";

import { useEffect, useRef } from "react";

export default function PresenceTracker() {
  const tabIdRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Generate or retrieve unique ID for this browser tab
    let tabId = "";
    try {
      tabId = window.sessionStorage?.getItem("crm_presence_tab_id");
      if (!tabId) {
        tabId = window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        window.sessionStorage?.setItem("crm_presence_tab_id", tabId);
      }
    } catch {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    tabIdRef.current = tabId;

    // 2. Pulse heartbeat to server
    const sendPulse = async (action = "heartbeat") => {
      try {
        const payload = {
          tabId: tabIdRef.current,
          visibilityState: typeof document !== "undefined" ? document.visibilityState : "visible",
          action,
        };

        if (action === "close" && typeof window.navigator !== "undefined" && window.navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
          window.navigator.sendBeacon("/api/user/presence", blob);
          return;
        }

        await fetch("/api/user/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: action === "close",
        });
      } catch {
        // Heartbeat failure silently caught; will retry on next interval
      }
    };

    // Initial heartbeat on mount
    sendPulse("heartbeat");

    // Interval every 50 seconds
    const interval = window.setInterval(() => {
      sendPulse("heartbeat");
    }, 50000);

    // Visibility change listener
    const onVisibilityChange = () => {
      sendPulse("heartbeat");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Tab close / navigation unload listener
    const onUnload = () => {
      sendPulse("close");
    };
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      sendPulse("close");
    };
  }, []);

  return null;
}
