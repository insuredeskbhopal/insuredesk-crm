"use client";
import { useEffect, useState } from "react";
export default function PrimaryWhatsAppSelector() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/operations/whatsapp/sessions", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load WhatsApp accounts");
      setData(result);
    } catch (error) { setError(error.message); }
  }
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    window.addEventListener("whatsapp-primary-changed", load);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", load); window.removeEventListener("whatsapp-primary-changed", load); };
  }, []);
  async function select(accountId) {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/operations/whatsapp/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-primary", accountId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your sender");
      await load(); window.dispatchEvent(new window.Event("whatsapp-primary-changed"));
    } catch (error) { setError(error.message); } finally { setSaving(false); }
  }
  const selected = data?.accounts.find((a) => a.id === data.primaryAccountId);
  const warning = data && (!data.primaryAccountId ? "Select a sender before messaging" : !selected?.canUse ? "Selected sender is no longer authorized" : !selected.connected ? "Your selected sender is disconnected" : "");
  return <div className="min-w-0 max-w-xs">
    <label className="block text-xs font-semibold">My Primary WhatsApp
      <select aria-label="My Primary WhatsApp" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" value={data?.primaryAccountId || ""} disabled={saving || !data?.canCreate} onChange={(e) => select(e.target.value)}>
        <option value="" disabled>{data ? "Choose a WhatsApp sender" : "Loading accounts…"}</option>
        {data?.primaryAccountId && !selected && <option value={data.primaryAccountId} disabled>Selected account unavailable</option>}
        {data?.accounts.filter(a => a.canUse).map(a => <option key={a.id} value={a.id} disabled={!a.connected}>{a.label} {a.phoneNumber ? `+${a.phoneNumber}` : ""} · {a.connected ? "Connected" : "Disconnected"}</option>)}
      </select>
    </label>
    {(error || warning) && <p role="status" className="mt-1 text-xs">{error || warning}</p>}
  </div>;
}
