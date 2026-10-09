// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedTabCounts, clearTabCountsCache } from "../src/lib/records/tab-counts-cache";

beforeEach(() => {
  clearTabCountsCache();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("policy count cache load and correctness", () => {
  it("shares one computation across 100 simultaneous requests for the same scoped key", async () => {
    let complete;
    const fetcher = vi.fn(() => new Promise((resolve) => { complete = resolve; }));
    const requests = Array.from({ length: 100 }, () => getCachedTabCounts({ key: "org-1:month-10", fetcher }));
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    complete({ totalAll: 17 });
    expect(await Promise.all(requests)).toEqual(Array(100).fill({ totalAll: 17 }));
  });

  it("does not share counts across tenants or filters and refreshes after the existing TTL", async () => {
    const fetcher = vi.fn().mockResolvedValue({ totalAll: 17 });
    await getCachedTabCounts({ key: "org-1:October", fetcher });
    await getCachedTabCounts({ key: "org-2:October", fetcher });
    await getCachedTabCounts({ key: "org-1:September", fetcher });
    expect(fetcher).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(29999);
    await getCachedTabCounts({ key: "org-1:October", fetcher });
    expect(fetcher).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(1);
    await getCachedTabCounts({ key: "org-1:October", fetcher });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("does not retain an old result across a policy mutation that clears the cache", async () => {
    let complete;
    const old = getCachedTabCounts({ key: "org-1", fetcher: () => new Promise((resolve) => { complete = resolve; }) });
    await Promise.resolve();
    clearTabCountsCache();
    const fetcher = vi.fn().mockResolvedValue({ totalAll: 18 });
    await getCachedTabCounts({ key: "org-1", fetcher });
    complete({ totalAll: 17 });
    await old;
    expect(await getCachedTabCounts({ key: "org-1", fetcher })).toEqual({ totalAll: 18 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries failed computations instead of caching failures", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Temporary failure")).mockResolvedValue({ totalAll: 17 });
    await expect(getCachedTabCounts({ key: "org-1", fetcher })).rejects.toThrow("Temporary failure");
    expect(await getCachedTabCounts({ key: "org-1", fetcher })).toEqual({ totalAll: 17 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("evicts older completed entries rather than growing across unlimited date filters", async () => {
    const fetcher = vi.fn().mockResolvedValue({ totalAll: 17 });
    for (let index = 0; index < 70; index++) await getCachedTabCounts({ key: `filter-${index}`, fetcher });
    await getCachedTabCounts({ key: "filter-69", fetcher });
    expect(fetcher).toHaveBeenCalledTimes(70);
    await getCachedTabCounts({ key: "filter-0", fetcher });
    expect(fetcher).toHaveBeenCalledTimes(71);
  });
});
