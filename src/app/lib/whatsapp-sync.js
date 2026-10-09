"use client";

import { useEffect, useRef } from "react";
import { clearClientApiCache } from "./client-api";

const listeners = new Map();
const eventName = "whatsapp-primary-changed";
let channel;
let timer;
let timerInterval;
let revision = 0;

export const getWhatsAppRevision = () => revision;

function refresh(update = { type: "all", reason: "poll" }) {
  if (document.hidden) return;
  for (const listener of listeners.keys()) listener(update);
}

function changed(update) {
  const type = update?.type || "accounts";
  if (type === "accounts") {
    revision += 1;
    clearClientApiCache("/api/operations/whatsapp/sessions");
    clearClientApiCache("/api/operations/whatsapp/sessions?view=sync");
  }
  refresh({ type, reason: "change" });
}

function onChange(event) {
  changed(event.detail);
}

function resume() {
  refresh({ type: "all", reason: "resume" });
}

export function notifyWhatsAppUpdate(type = "accounts") {
  const update = { type };
  window.dispatchEvent(new window.CustomEvent(eventName, { detail: update }));
  channel?.postMessage(update);
}

function schedulePolling() {
  const interval = Math.min(...listeners.values());
  if (interval === timerInterval) return;
  window.clearInterval(timer);
  timerInterval = interval;
  timer = window.setInterval(refresh, interval);
}

export function subscribeWhatsAppUpdates(listener, intervalMs = 30000) {
  listeners.set(listener, intervalMs);
  schedulePolling();
  if (listeners.size === 1) {
    window.addEventListener(eventName, onChange);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    if (typeof globalThis.BroadcastChannel !== "undefined") {
      channel = new globalThis.BroadcastChannel("bhq-whatsapp-updates");
      channel.onmessage = ({ data }) => {
        if (["accounts", "templates", "queue"].includes(data?.type)) changed(data);
      };
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size) {
      schedulePolling();
      return;
    }
    window.clearInterval(timer);
    timerInterval = undefined;
    window.removeEventListener(eventName, onChange);
    window.removeEventListener("focus", resume);
    window.removeEventListener("online", resume);
    document.removeEventListener("visibilitychange", resume);
    channel?.close();
    channel = undefined;
  };
}

export function useWhatsAppSync(callback, intervalMs = 30000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(
    () => subscribeWhatsAppUpdates((update) => callbackRef.current(update), intervalMs),
    [intervalMs],
  );
}
