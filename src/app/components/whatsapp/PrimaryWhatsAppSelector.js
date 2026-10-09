"use client";
import { cachedJson } from "@/app/lib/client-api";
import { getWhatsAppRevision, notifyWhatsAppUpdate, useWhatsAppSync } from "@/app/lib/whatsapp-sync";
import { useEffect, useState } from "react";
export default function PrimaryWhatsAppSelector() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load(silent = false) {
    const revision = getWhatsAppRevision();
    try {
      const result = await cachedJson(`/api/operations/whatsapp/sessions${silent ? "?view=sync" : ""}`, {
        ttlMs: 0,
        fetchOptions: { cache: "no-store" },
      });
      if (revision !== getWhatsAppRevision()) return;
      if (result.error) throw new Error(result.error);
      setData(result);
      setError("");
    } catch (error) {
      if (revision !== getWhatsAppRevision()) return;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }
  useWhatsAppSync(({ type }) => {
    if (type === "accounts" || type === "all") void load(true);
  });
  useEffect(() => {
    load();
  }, []);
  async function select(accountId) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-primary", accountId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your sender");
      notifyWhatsAppUpdate();
      await load(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }
  const selected = data?.accounts.find((a) => a.id === data.primaryAccountId);
  const warning =
    data &&
    (!data.primaryAccountId
      ? "Select a sender before messaging"
      : !selected?.canUse
        ? "Selected sender is no longer authorized"
        : !selected.connected
          ? "Your selected sender is disconnected"
          : "");
  return (
    <div className="whatsapp-primary-selector min-w-0 max-w-xs">
      <label className="block text-xs font-semibold">
        <span className="whatsapp-primary-label">My Primary WhatsApp</span>
        <select
          aria-label="My Primary WhatsApp"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
          value={data?.primaryAccountId || ""}
          disabled={saving || Boolean(error) || !data?.canCreate}
          onChange={(e) => select(e.target.value)}
        >
          <option value="" disabled>
            {loading ? "Loading accounts…" : error ? "Accounts unavailable" : "Choose a WhatsApp sender"}
          </option>
          {data?.primaryAccountId && !selected && (
            <option value={data.primaryAccountId} disabled>
              Selected account unavailable
            </option>
          )}
          {data?.accounts
            .filter((a) => a.canUse)
            .map((a) => (
              <option key={a.id} value={a.id} disabled={!a.connected}>
                {a.label} {a.phoneNumber ? `+${a.phoneNumber}` : ""} ·{" "}
                {a.connected ? "Connected" : "Disconnected"}
              </option>
            ))}
        </select>
      </label>
      {(error || warning) && (
        <p role="status" className="mt-1 text-xs">
          {error || warning}
        </p>
      )}
    </div>
  );
}
