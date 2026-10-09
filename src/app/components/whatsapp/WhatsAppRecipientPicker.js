"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Search, UserRound, UsersRound } from "lucide-react";
import styles from "./WhatsAppRecipientPicker.module.css";

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
    const phone = normalizePhone(contactPhone);
    if (phone.length >= 10) {
      void findMatches();
    } else {
      setMatches([]);
      setMatchedPhone("");
    }
    return () => {
      matchRequestRef.current += 1;
    };
  }, [contactPhone]);

  useEffect(() => {
    if (type === "group" && matches.length === 0) {
      if (normalizePhone(contactPhone).length >= 10) void findMatches();
      else setSearchOpen(true);
    }
  }, [type]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (type !== "group" || !searchOpen) {
      setSearching(false);
      return undefined;
    }
    if (query.length > 0 && query.length < 2) {
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
      if (normalizePhone(contactPhone).length >= 10) await findMatches();
      else {
        const payload = await fetchGroups(
          `/api/operations/whatsapp/groups?search=${encodeURIComponent(searchQuery.trim())}&limit=30`,
        );
        setSearchResults(Array.isArray(payload.groups) ? payload.groups : []);
        setSearchOpen(true);
      }
    } catch (refreshError) {
      setError(refreshError.message || "Could not refresh WhatsApp groups");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={styles.picker}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>Send to</p>
          <p className={styles.description}>Choose an individual or a WhatsApp group.</p>
        </div>
        <div className={styles.tabs} role="radiogroup" aria-label="WhatsApp recipient type">
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
              className={type === value ? styles.activeTab : styles.tab}
            >
              <Icon size={14} /> {label}
              {value === "group" && matches.length > 0 && (
                <span className={styles.count}>
                  {matches.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {type === "group" ? (
        <div className={styles.groupPanel}>
          {matching ? (
            <div className={styles.loading} role="status">
              <RefreshCw size={14} className="animate-spin text-emerald-600" /> Finding groups containing this contact…
            </div>
          ) : selectionMode === "manual" && selectedGroup && !searchOpen ? (
            <div className={styles.selectedGroup}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={styles.selectedIcon}>
                  <CheckCircle2 size={17} />
                </span>
                <div className="min-w-0">
                  <p className={styles.groupName}>{selectedGroup.name}</p>
                  <p className={styles.groupMeta}>
                    Selected group{selectedGroup.participants ? ` · ${selectedGroup.participants} members` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSearchOpen(true)}
                className={styles.textButton}
              >
                Change
              </button>
            </div>
          ) : matches.length > 0 && !searchOpen ? (
            <div className={styles.matches}>
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
                  className={styles.textButton}
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
                      className={selected ? styles.selectedRow : styles.groupRow}
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
            <div className={styles.searchPanel}>
              {matches.length === 0 && normalizePhone(contactPhone).length >= 10 ? (
                <p className={styles.searchHeading}>No contact match. Choose a group below.</p>
              ) : matches.length > 0 ? (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className={styles.searchHeading}>Choose another group</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode("auto");
                      onGroupChange(matches[0]?.id || "");
                      setSearchOpen(false);
                    }}
                    className={styles.textButton}
                  >
                    Keep auto match
                  </button>
                </div>
              ) : (
                <p className={styles.searchHeading}>Choose a WhatsApp group</p>
              )}
              <label className={styles.searchField}>
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search WhatsApp groups"
                  value={searchQuery}
                  autoFocus
                  disabled={disabled}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search groups by name…"
                  className={styles.searchInput}
                />
              </label>
              <div className={styles.results} role="radiogroup" aria-label="Available WhatsApp groups" aria-busy={searching}>
                {searching ? <p className={styles.empty} role="status">Loading groups…</p> : null}
                {!searching && searchQuery.trim().length === 1 ? (
                  <p className={styles.empty}>Type at least 2 letters to search.</p>
                ) : null}
                {!searching && (searchQuery.trim().length === 0 || searchQuery.trim().length >= 2) && searchResults.length === 0 && !error ? (
                  <p className={styles.empty}>
                    {searchQuery.trim() ? "No groups match this search." : "No groups synced yet. Refresh groups to try again."}
                  </p>
                ) : null}
                {searchResults.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    role="radio"
                    aria-checked={groupId === group.id}
                    disabled={disabled}
                    onClick={() => {
                      setSelectionMode("manual");
                      onGroupChange(group.id);
                      setSearchOpen(false);
                    }}
                    className={groupId === group.id ? styles.selectedRow : styles.groupRow}
                  >
                    <UsersRound size={17} className={styles.groupIcon} aria-hidden="true" />
                    <span className={styles.groupIdentity}>
                      <span className={styles.groupName}>{group.name}</span>
                      <span className={styles.groupMeta}>{group.participants || 0} members</span>
                    </span>
                    {groupId === group.id ? <CheckCircle2 size={17} className={styles.selectedIcon} aria-hidden="true" /> : null}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={disabled || refreshing}
                onClick={refreshGroups}
                className={styles.refreshButton}
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing groups…" : "Refresh groups"}
              </button>
            </div>
          ) : null}

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
