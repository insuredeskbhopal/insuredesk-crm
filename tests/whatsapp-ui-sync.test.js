import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cachedJson, clearClientApiCache } from "../src/app/lib/client-api";
import {
  getWhatsAppRevision, notifyWhatsAppUpdate, subscribeWhatsAppUpdates,
} from "../src/app/lib/whatsapp-sync";

const subscriptions = [];
let channels;
const subscribe = (callback) => subscriptions.push(subscribeWhatsAppUpdates(callback, 5000));

beforeEach(() => {
  vi.useFakeTimers();
  clearClientApiCache();
  channels = [];
  vi.stubGlobal("BroadcastChannel", class {
    constructor(name) { this.name = name; channels.push(this); }
    postMessage = vi.fn();
    close = vi.fn();
  });
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});

afterEach(() => {
  subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearClientApiCache();
});

describe("WhatsApp automatic synchronization", () => {
  it("polls the global header at its original cadence and only speeds up while Setup is mounted", () => {
    const header = vi.fn(), setup = vi.fn();
    subscriptions.push(subscribeWhatsAppUpdates(header));
    vi.advanceTimersByTime(25000);
    expect(header).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(header).toHaveBeenCalledTimes(1);
    const stopSetup = subscribeWhatsAppUpdates(setup, 5000);
    vi.advanceTimersByTime(5000);
    expect(header).toHaveBeenCalledTimes(2);
    expect(setup).toHaveBeenCalledTimes(1);
    stopSetup();
    vi.advanceTimersByTime(25000);
    expect(header).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5000);
    expect(header).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(1);
  });
  it("uses one timer and one channel for every mounted control and removes both on unmount", () => {
    const callbacks = [vi.fn(), vi.fn(), vi.fn()];
    callbacks.forEach(subscribe);
    expect(vi.getTimerCount()).toBe(1);
    expect(channels).toHaveLength(1);
    vi.advanceTimersByTime(5000);
    callbacks.forEach((callback) => expect(callback).toHaveBeenCalledExactlyOnceWith({ type: "all", reason: "poll" }));
    subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
    expect(vi.getTimerCount()).toBe(0);
    expect(channels[0].close).toHaveBeenCalledOnce();
    window.dispatchEvent(new window.Event("focus"));
    window.dispatchEvent(new window.Event("whatsapp-primary-changed"));
    callbacks.forEach((callback) => expect(callback).toHaveBeenCalledTimes(1));
  });

  it("notifies local controls and other tabs immediately without sending account or user data", () => {
    const callback = vi.fn();
    subscribe(callback);
    const revision = getWhatsAppRevision();
    notifyWhatsAppUpdate();
    expect(callback).toHaveBeenCalledExactlyOnceWith({ type: "accounts", reason: "change" });
    expect(getWhatsAppRevision()).toBe(revision + 1);
    expect(channels[0].postMessage).toHaveBeenCalledExactlyOnceWith({ type: "accounts" });
    channels[0].onmessage({ data: { type: "accounts" } });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(channels[0].postMessage).toHaveBeenCalledTimes(1);
    channels[0].onmessage({ data: { type: "unknown" } });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("pauses background reads and refreshes immediately on visibility, focus, and reconnection", () => {
    const callback = vi.fn();
    subscribe(callback);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    vi.advanceTimersByTime(15000);
    notifyWhatsAppUpdate();
    expect(callback).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    document.dispatchEvent(new window.Event("visibilitychange"));
    window.dispatchEvent(new window.Event("focus"));
    window.dispatchEvent(new window.Event("online"));
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenLastCalledWith({ type: "all", reason: "resume" });
  });

  it("keeps template and queue updates separate from sender changes", () => {
    const callback = vi.fn();
    subscribe(callback);
    const revision = getWhatsAppRevision();
    notifyWhatsAppUpdate("templates");
    notifyWhatsAppUpdate("queue");
    expect(getWhatsAppRevision()).toBe(revision);
    expect(callback).toHaveBeenCalledWith({ type: "templates", reason: "change" });
    expect(callback).toHaveBeenCalledWith({ type: "queue", reason: "change" });
  });
});

describe("in-flight cache invalidation", () => {
  const url = "/api/operations/whatsapp/sessions";
  it("retains no-argument cache clearing for CRM logout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }));
    await cachedJson("/api/auth/me");
    await cachedJson(url);
    clearClientApiCache();
    await cachedJson("/api/auth/me");
    await cachedJson(url);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it("invalidates only WhatsApp account data and prevents a stale request replacing a newer result", async () => {
    let completeOld;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ user: "staff" }) })
      .mockImplementationOnce(() => new Promise((resolve) => { completeOld = resolve; }))
      .mockResolvedValueOnce({ json: async () => ({ primaryAccountId: "support" }) }));
    await cachedJson("/api/auth/me");
    const old = cachedJson(url);
    clearClientApiCache(url);
    await cachedJson(url);
    completeOld({ json: async () => ({ primaryAccountId: "claims" }) });
    await old;
    expect(await cachedJson(url)).toEqual({ primaryAccountId: "support" });
    expect(await cachedJson("/api/auth/me")).toEqual({ user: "staff" });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("does not evict a new request when an invalidated old request fails", async () => {
    let failOld;
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => new Promise((_, reject) => { failOld = reject; }))
      .mockResolvedValueOnce({ json: async () => ({ primaryAccountId: "support" }) }));
    const old = cachedJson(url).catch((error) => error.message);
    clearClientApiCache(url);
    await cachedJson(url);
    failOld(new Error("Old connection failed"));
    expect(await old).toBe("Old connection failed");
    expect(await cachedJson(url)).toEqual({ primaryAccountId: "support" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
