"use client";

import { useEffect, useState } from "react";
import { RefreshCw, UserRound, UsersRound } from "lucide-react";

export default function WhatsAppRecipientPicker({
  type,
  onTypeChange,
  groupId,
  onGroupChange,
  disabled = false,
}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadGroups = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/operations/whatsapp/groups", {
        method: refresh ? "POST" : "GET",
        headers: refresh ? { "Content-Type": "application/json" } : undefined,
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load WhatsApp groups");
      const nextGroups = Array.isArray(payload.groups) ? payload.groups : [];
      setGroups(nextGroups);
      if (groupId && !nextGroups.some((group) => group.id === groupId)) onGroupChange("");
    } catch (loadError) {
      setError(loadError.message || "Could not load WhatsApp groups");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (type === "group" && groups.length === 0 && !loading) void loadGroups();
  }, [type]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Send message to</p>
        {type === "group" ? (
          <button
            type="button"
            disabled={disabled || refreshing}
            onClick={() => loadGroups(true)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh groups
          </button>
        ) : null}
      </div>
      <div className="mt-2 inline-flex rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="WhatsApp recipient type">
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
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition ${
              type === value
                ? "border-emerald-200 bg-white text-emerald-700 shadow-sm"
                : "border-transparent bg-transparent text-slate-600 hover:text-slate-900"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {type === "group" ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500" htmlFor="whatsapp-group-select">
            Choose WhatsApp group
          </label>
          <select
            id="whatsapp-group-select"
            value={groupId}
            disabled={disabled || loading}
            onChange={(event) => onGroupChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">{loading ? "Loading groups..." : "Select a WhatsApp group"}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {error ? <p className="mt-2 rounded-md bg-rose-50 px-2.5 py-2 text-[11px] font-medium leading-4 text-rose-700">{error}</p> : null}
          {!loading && !error && groups.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">No groups found. Connect WhatsApp, then refresh groups.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
