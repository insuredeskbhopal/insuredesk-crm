"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

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
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Recipient Type</p>
      <div className="flex flex-wrap gap-4 text-sm text-slate-800">
        {[["individual", "Individual"], ["group", "Group"]].map(([value, label]) => (
          <label key={value} className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="whatsapp-recipient-type"
              value={value}
              checked={type === value}
              disabled={disabled}
              onChange={() => onTypeChange(value)}
              className="accent-emerald-600"
            />
            {label}
          </label>
        ))}
      </div>

      {type === "group" ? (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600" htmlFor="whatsapp-group-select">
              WhatsApp Group
            </label>
            <button
              type="button"
              disabled={disabled || refreshing}
              onClick={() => loadGroups(true)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <select
            id="whatsapp-group-select"
            value={groupId}
            disabled={disabled || loading}
            onChange={(event) => onGroupChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">{loading ? "Loading groups..." : "Select a WhatsApp group"}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
          {!loading && !error && groups.length === 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">No groups are cached. Use Refresh after WhatsApp connects.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
