"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Search, UserRound, UsersRound } from "lucide-react";

const normalizePhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
};

const displayPhone = (value) => {
  const digits = normalizePhone(value);
  return digits.startsWith("91") && digits.length === 12
    ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
    : digits ? `+${digits}` : "";
};

async function fetchGroups(url, options) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Could not load WhatsApp groups");
  return payload;
}

export default function WhatsAppRecipientPicker({
  type,
  onTypeChange,
  groupId,
  onGroupChange,
  contactPhone = "",
  disabled = false,
}) {
  const [matches, setMatches] = useState([]);
  const [matchedPhone, setMatchedPhone] = useState("");
  const [matching, setMatching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectionMode, setSelectionMode] = useState("auto");
  const matchRequestRef = useRef(0);
  const searchRequestRef = useRef(0);

  const selectedGroup = useMemo(
    () => [...matches, ...searchResults].find((group) => group.id === groupId),
    [groupId, matches, searchResults],
  );

  const findMatches = async () => {
    const requestId = ++matchRequestRef.current;
    const phone = normalizePhone(contactPhone);
    setError("");
    setSearchResults([]);
    if (phone.length < 10) {
      setMatching(false);
      setMatches([]);
      setMatchedPhone("");
      setSearchOpen(true);
      return;
    }

    setMatching(true);
    try {
      const payload = await fetchGroups(
        `/api/operations/whatsapp/groups?phone=${encodeURIComponent(phone)}`,
      );
      if (requestId !== matchRequestRef.current) return;
      const nextMatches = Array.isArray(payload.groups) ? payload.groups : [];
      setMatches(nextMatches);
      setMatchedPhone(payload.phone || phone);
      setSearchOpen(nextMatches.length === 0);
      setSelectionMode("auto");
      if (nextMatches.length > 0 && !nextMatches.some((group) => group.id === groupId)) {
        onGroupChange(nextMatches[0].id);
      } else if (nextMatches.length === 0) {
        onGroupChange("");
      }
    } catch (matchError) {
      if (requestId !== matchRequestRef.current) return;
      setMatches([]);
      setSearchOpen(true);
      setError(matchError.message || "Could not match WhatsApp groups");
    } finally {
      if (requestId === matchRequestRef.current) setMatching(false);
    }
  };

  useEffect(() => {
    if (type === "group") void findMatches();
    return () => {
      matchRequestRef.current += 1;
    };
  }, [type, contactPhone]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (type !== "group" || !searchOpen) {
      setSearching(false);
      return undefined;
    }
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    const requestId = ++searchRequestRef.current;
    const controller = new globalThis.AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const payload = await fetchGroups(
          `/api/operations/whatsapp/groups?search=${encodeURIComponent(query)}&limit=30`,
          { signal: controller.signal },
        );
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(Array.isArray(payload.groups) ? payload.groups : []);
        setError("");
      } catch (searchError) {
        if (searchError.name === "AbortError" || requestId !== searchRequestRef.current) return;
        setSearchResults([]);
        setError(searchError.message || "Could not search WhatsApp groups");
      } finally {
        if (requestId === searchRequestRef.current) setSearching(false);
      }
    }, 250);
    return () => {
      globalThis.clearTimeout(timer);
      controller.abort();
      searchRequestRef.current += 1;
    };
  }, [searchOpen, searchQuery, type]);

  const refreshGroups = async () => {
    setRefreshing(true);
    setError("");
    try {
      await fetchGroups("/api/operations/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await findMatches();
    } catch (refreshError) {
      setError(refreshError.message || "Could not refresh WhatsApp groups");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Destination</p>
          <p className="mt-0.5 text-xs text-slate-500">Choose who should receive this message.</p>
        </div>
        <div className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-64" role="radiogroup" aria-label="WhatsApp recipient type">
          {[
            ["individual", "Individual", UserRound],
            ["group", "Group", UsersRound],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              disabled={disabled}
              onClick={() => onTypeChange(value)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${
                type === value
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {type === "group" ? (
        <div className="rn-recipient-panel mt-4 border-t border-slate-100 pt-4">
          {matching ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600">
              <RefreshCw size={14} className="animate-spin text-emerald-600" /> Finding groups containing this contact…
            </div>
          ) : selectionMode === "manual" && selectedGroup && !searchOpen ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={17} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">{selectedGroup.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Selected manually{selectedGroup.participants ? ` · ${selectedGroup.participants} members` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSearchOpen(true)}
                className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              >
                Change
              </button>
            </div>
          ) : matches.length > 0 && !searchOpen ? (
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3 px-1 pb-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {matches.length === 1 ? "Auto matched group" : `${matches.length} matching groups found`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Using customer contact <span className="font-semibold text-slate-700">{displayPhone(matchedPhone)}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setSearchOpen(true)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  Change
                </button>
              </div>
              <div className="space-y-2" role="radiogroup" aria-label="Matched WhatsApp groups">
                {matches.slice(0, 5).map((group, index) => {
                  const selected = groupId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      title={group.name}
                      onClick={() => {
                        setSelectionMode("auto");
                        onGroupChange(group.id);
                      }}
                      className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-emerald-400 bg-white shadow-sm ring-1 ring-emerald-100"
                          : "border-slate-200 bg-white hover:border-emerald-200"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                      }`}>
                        {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-900">{group.name}</span>
                          <span className="mt-1 block text-[10px] text-slate-500">
                            {index === 0 ? "Closest contact match" : "Contact is also a member"}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          {index === 0 ? (
                            <span className="hidden rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 sm:inline">Best match</span>
                          ) : null}
                          {group.participants ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                              <UsersRound size={12} /> {group.participants}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!matching && searchOpen ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {matches.length === 0 && normalizePhone(contactPhone).length >= 10 ? (
                <p className="mb-2 text-xs font-semibold text-slate-700">No matching WhatsApp group found.</p>
              ) : matches.length > 0 ? (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">Search another group</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode("auto");
                      onGroupChange(matches[0]?.id || "");
                      setSearchOpen(false);
                    }}
                    className="text-[11px] font-semibold text-emerald-700"
                  >
                    Keep auto match
                  </button>
                </div>
              ) : (
                <p className="mb-2 text-xs font-semibold text-slate-700">Search for a WhatsApp group</p>
              )}
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  autoFocus
                  disabled={disabled}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Type at least 2 letters of the group name…"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {searching ? <p className="px-2 py-2 text-[11px] text-slate-500">Searching…</p> : null}
                {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !error ? (
                  <p className="px-2 py-2 text-[11px] text-slate-500">No groups match this search.</p>
                ) : null}
                {searchResults.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectionMode("manual");
                      onGroupChange(group.id);
                      setSearchOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition ${
                      groupId === group.id ? "bg-emerald-100 font-bold text-emerald-800" : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">{group.name}</span>
                    <span className="ml-3 shrink-0 text-[10px] text-slate-400">{group.participants || 0} members</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={disabled || refreshing}
                onClick={refreshGroups}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh synced groups
              </button>
            </div>
          ) : null}

          {error ? <p className="mt-2 rounded-md bg-rose-50 px-2.5 py-2 text-[11px] font-medium leading-4 text-rose-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
