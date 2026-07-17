"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileCheck2,
  FilePenLine,
  FileText,
  Headphones,
  IndianRupee,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  UserRoundCog,
  WalletCards,
  X,
} from "lucide-react";

const SUPPORT_PHONE = "+918818889660";
const REQUEST_LABELS = {
  NEW_POLICY_QUOTE: "Buy a policy / Get quotes",
  RENEWAL_QUOTE: "Request renewal quote",
  SUPPORT: "Submit support ticket",
  VEHICLE_CORRECTION: "Correct vehicle details",
  NOMINEE_CHANGE: "Change nominee",
  CONTACT_CHANGE: "Change policy contact details",
};

function getPayload(policy) {
  return policy?.reviewedData || policy?.data || {};
}

function getPolicyNumber(policy) {
  return getPayload(policy).policyNumber || "";
}

function getExpiry(policy) {
  return getPayload(policy).expiryDate || getPayload(policy).policyExpiryDate || policy?.renewalDate;
}

function money(value) {
  const amount = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
    : "Not available";
}

function date(value) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function duration(startValue, endValue, provided) {
  if (provided) return String(provided);
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return "Not available";
  const days = Math.ceil((end - start) / 86400000);
  const months = Math.round(days / 30.44);
  if (months < 1) return `${days} day${days === 1 ? "" : "s"}`;
  if (months >= 12 && months % 12 === 0) return `${months / 12} year${months === 12 ? "" : "s"}`;
  return `${months} months`;
}

function display(value) {
  if (Array.isArray(value)) return value.map(display).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}: ${display(item)}`).join(" · ");
  }
  return value == null ? "" : String(value);
}

function StatusPill({ status }) {
  const completed = ["COMPLETED", "CLOSED"].includes(String(status).toUpperCase());
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase ${completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {String(status || "Open").replaceAll("_", " ")}
    </span>
  );
}

function QuotePaymentAction({ quote, onRequestLink }) {
  if (["COMPLETED", "CLOSED"].includes(quote.status)) {
    return <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[10px] font-bold text-emerald-700">Payment completed</span>;
  }
  if (quote.status === "CANCELLED") {
    return <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-[10px] font-bold text-slate-500">Quotation closed</span>;
  }
  const rawPaymentLink = String(quote.metadata?.paymentLink || "");
  const paymentLink = /^https:\/\//i.test(rawPaymentLink) ? rawPaymentLink : "";
  return paymentLink ? (
    <a href={paymentLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-bold text-white force-white no-underline">Pay securely</a>
  ) : quote.metadata?.paymentRequested ? (
    <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10px] font-bold text-amber-700">Payment link requested</span>
  ) : quote.amount ? (
    <button onClick={() => onRequestLink(quote)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-bold text-white force-white">Get payment link</button>
  ) : (
    <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-[10px] font-bold text-slate-500">Agent preparing quote</span>
  );
}

export function PolicyDetailModal({ policy, onClose, onStartClaim, onServiceRequest }) {
  if (!policy) return null;
  const payload = getPayload(policy);
  const policyNo = getPolicyNumber(policy);
  const fields = [
    ["Insured name", payload.insuredName],
    ["Policy type", policy.selectedPolicyType || payload.policyType],
    ["Insurance company", policy.selectedCompany || payload.insuranceCompany],
    ["Coverage / IDV", money(payload.sumInsured || payload.idv)],
    ["Premium", money(payload.totalPremium || payload.premium)],
    ["Net premium", payload.netPremium ? money(payload.netPremium) : ""],
    ["Cover type", payload.coverType],
    ["Start date", date(payload.startDate)],
    ["Expiry date", date(getExpiry(policy))],
    ["Policy duration", duration(payload.startDate, getExpiry(policy), payload.duration)],
    ["Vehicle number", payload.vehicleNumber || payload.registrationNumber],
    ["Make / model", payload.makeModel || [payload.make, payload.model, payload.variant].filter(Boolean).join(" ")],
    ["Engine number", payload.engineNumber],
    ["Chassis number", payload.chassisNumber],
    ["RTO", payload.rtoLocation],
    ["Fuel type", payload.fuelType],
    ["NCB", payload.ncb],
    ["Nominee", [payload.nomineeName, payload.nomineeRelationship].filter(Boolean).join(" · ")],
    ["Add-on covers", display(payload.addOns || payload.addons)],
    ["Coverage details", display(payload.coverageDetails)],
    ["Deductible", display(payload.deductible || payload.voluntaryDeductible)],
    ["Geographical area", display(payload.geographicalArea)],
    ["Personal accident cover", display(payload.personalAccidentCover)],
  ].filter(([, value]) => value && value !== "Not available");

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-gradient-to-r from-emerald-900 to-teal-700 p-6 text-white [&_*]:!text-white [&_svg]:!stroke-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Policy details</p>
            <h2 className="mt-1 text-xl font-bold">{policyNo || "Policy awaiting issuance"}</h2>
            <p className="mt-1 text-xs">{policy.selectedCompany || payload.insuranceCompany || "Insurance provider"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/25 bg-white/10 p-2 hover:bg-white/20" aria-label="Close policy details"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 break-words text-xs font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900">Documents</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Policy PDF", "policy", FileText],
                ["Insurance certificate", "certificate", ShieldCheck],
                ["Premium receipt", "receipt", ReceiptText],
                ["Renewed policy", "policy", RefreshCw],
              ].map(([label, kind, Icon], index) => {
                const disabled = index === 3 && policy.renewalStatus !== "RENEWED";
                return disabled ? (
                  <div key={label} className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-400"><Icon size={17} /><p className="mt-2 text-[10px] font-bold">{label}</p><p className="mt-1 text-[9px]">Available after renewal</p></div>
                ) : (
                  <a key={label} href={`/api/client/policies/${policy.id}/document?kind=${kind}`} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800 no-underline hover:border-emerald-300">
                    <Icon size={17} /><p className="mt-2 text-[10px] font-bold">{label}</p><span className="mt-1 inline-flex items-center gap-1 text-[9px]">Download <Download size={10} /></span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
          <button type="button" onClick={() => onServiceRequest("RENEWAL_QUOTE", policy)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700">Get renewal quote</button>
          <button type="button" onClick={() => onStartClaim(policy)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white force-white">Start a claim</button>
        </div>
      </div>
    </div>
  );
}

function RequestModal({ request, policies, onClose, onSaved }) {
  const [policyNo, setPolicyNo] = useState(request?.policyNo || "");
  const [details, setDetails] = useState("");
  const [preferredContact, setPreferredContact] = useState("PHONE");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setPolicyNo(request?.policyNo || "");
    setDetails("");
    setMessage("");
  }, [request]);
  if (!request) return null;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/client/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: request.type, policyNo, details, preferredContact }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request could not be submitted");
      onSaved(data.request);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-[10px] font-bold uppercase text-emerald-700">Client service request</p><h2 className="mt-1 text-lg font-bold text-slate-900">{REQUEST_LABELS[request.type]}</h2></div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={16} /></button>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">{message}</p> : null}
        <div className="mt-5 space-y-4">
          <label className="block text-[10px] font-bold uppercase text-slate-500">Policy
            <select value={policyNo} onChange={(event) => setPolicyNo(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800">
              <option value="">General request / no policy</option>
              {policies.map((policy) => <option key={policy.id} value={getPolicyNumber(policy)}>{getPolicyNumber(policy)} · {policy.selectedPolicyType || getPayload(policy).policyType}</option>)}
            </select>
          </label>
          <label className="block text-[10px] font-bold uppercase text-slate-500">Request details
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} required={["NEW_POLICY_QUOTE", "SUPPORT", "VEHICLE_CORRECTION", "NOMINEE_CHANGE", "CONTACT_CHANGE"].includes(request.type)} placeholder={request.type === "NEW_POLICY_QUOTE" ? "Tell us the policy type, insured person/asset, coverage needed, and preferred insurer." : "Describe what you need, including corrected or new information."} className="mt-1.5 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800" />
          </label>
          <label className="block text-[10px] font-bold uppercase text-slate-500">Preferred reply
            <select value={preferredContact} onChange={(event) => setPreferredContact(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800"><option value="PHONE">Phone call</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option></select>
          </label>
        </div>
        <button disabled={saving} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white force-white disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />} Submit request</button>
      </form>
    </div>
  );
}

export function ClaimDocumentManager({ claim, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    form.append("name", "Client claim document");
    try {
      const response = await fetch(`/api/client/claims/${claim.id}/documents`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setMessage("Document uploaded successfully.");
      onUpdated?.();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-[10px] font-bold uppercase text-slate-400">Claim timeline</p>
        <div className="mt-3 space-y-3 border-l-2 border-emerald-100 pl-4">
          <div className="relative"><span className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-emerald-500" /><p className="text-[10px] font-bold text-slate-800">Claim submitted</p><p className="text-[9px] text-slate-400">{date(claim.createdAt || claim.claimDate)}</p></div>
          {(claim.remarks || []).map((remark) => <div key={remark.id} className="relative"><span className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-emerald-500 bg-white" /><p className="text-[10px] font-semibold text-slate-700">{remark.text}</p><p className="text-[9px] text-slate-400">{date(remark.createdAt)}</p></div>)}
          <div className="relative"><span className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-amber-400" /><p className="text-[10px] font-bold text-slate-800">Current status: {claim.claimStatus}</p><p className="text-[9px] text-slate-400">Updated {date(claim.updatedAt)}</p></div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase text-slate-400">Claim documents</p><p className="mt-1 text-xs font-semibold text-slate-700">Upload photos, bills, reports, or PDF files (max 8 MB).</p></div>
        <div className="flex flex-wrap gap-2">
        <a href={`tel:${SUPPORT_PHONE}`} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-bold text-emerald-700 no-underline"><Phone size={13} /> Claim executive</a>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-bold text-white force-white">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload document
          <input type="file" accept="image/*,application/pdf" onChange={upload} disabled={uploading} className="hidden" />
        </label>
        </div>
      </div>
      {message ? <p className="mt-3 text-[10px] font-semibold text-slate-600">{message}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {(claim.documents || []).map((document) => (
          <a key={document.id} href={`/api/client/claims/${claim.id}/documents?documentId=${document.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-700 no-underline"><FileCheck2 size={13} className="text-emerald-600" /> {document.fileName} <Download size={11} /></a>
        ))}
        {!claim.documents?.length ? <span className="text-[10px] text-amber-700">No documents uploaded yet.</span> : null}
      </div>
    </div>
  );
}

export function ClientProfileManager({ profile, onUpdated }) {
  const [form, setForm] = useState({});
  const [mpin, setMpin] = useState({ currentMpin: "", newMpin: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      phone: profile?.phone || "",
      email: profile?.email || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
      communicationPreferences: profile?.communicationPreferences || {},
    });
  }, [profile]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/client/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Profile update failed");
      onUpdated?.(data.profile);
      setMessage("Profile and communication preferences updated.");
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  async function changeMpin(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/client/security/mpin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mpin) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "MPIN update failed");
      setMpin({ currentMpin: "", newMpin: "" });
      setMessage(data.message);
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  const setPreference = (key, value) => setForm((current) => ({ ...current, communicationPreferences: { ...current.communicationPreferences, [key]: value } }));
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <form onSubmit={saveProfile} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center gap-2"><UserRoundCog size={18} className="text-emerald-600" /><h3 className="text-sm font-bold text-slate-900">Edit contact and address</h3></div>
        {message ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">{message}</p> : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[['phone','Mobile number'],['email','Email address'],['address','Address'],['city','City'],['state','State'],['pincode','PIN code']].map(([key,label]) => (
            <label key={key} className={key === "address" ? "sm:col-span-2 text-[10px] font-bold uppercase text-slate-500" : "text-[10px] font-bold uppercase text-slate-500"}>{label}<input value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-800" /></label>
          ))}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Communication preferences</p><div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[['email','Email messages'],['whatsapp','WhatsApp messages'],['policyReminders','Policy reminders'],['claimUpdates','Claim updates'],['paymentReminders','Payment reminders']].map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(form.communicationPreferences?.[key])} onChange={(event) => setPreference(key,event.target.checked)} className="accent-emerald-600" />{label}</label>)}
        </div></div>
        <button disabled={saving} className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white force-white disabled:opacity-50">Save profile</button>
      </form>
      <div className="space-y-6">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5"><p className="text-[10px] font-bold uppercase text-emerald-700">Client ID</p><p className="mt-2 break-all font-mono text-xs font-bold text-emerald-950">{profile?.id}</p></div>
        <form onSubmit={changeMpin} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><KeyRound size={17} className="text-emerald-600" /><h3 className="text-sm font-bold text-slate-900">Change login MPIN</h3></div><p className="mt-2 text-[10px] text-slate-500">Use a private four-digit MPIN.</p>
          <input type="password" inputMode="numeric" maxLength={4} placeholder="Current MPIN" value={mpin.currentMpin} onChange={(event) => setMpin({ ...mpin, currentMpin: event.target.value.replace(/\D/g, "") })} className="mt-4 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs" required />
          <input type="password" inputMode="numeric" maxLength={4} placeholder="New MPIN" value={mpin.newMpin} onChange={(event) => setMpin({ ...mpin, newMpin: event.target.value.replace(/\D/g, "") })} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs" required />
          <button disabled={saving} className="mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700">Change MPIN</button>
        </form>
      </div>
    </div>
  );
}

export default function ClientExperienceCenter({ policies, claims, onStartClaim, initialRequest, onInitialRequestHandled, onBack }) {
  const [section, setSection] = useState("overview");
  const [requests, setRequests] = useState([]);
  const [requestModal, setRequestModal] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await fetch("/api/client/service-requests");
      const data = await response.json();
      if (response.ok) setRequests(data.requests || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadRequests(); }, []);
  useEffect(() => {
    if (initialRequest?.type) {
      setRequestModal(initialRequest);
      onInitialRequestHandled?.();
    }
  }, [initialRequest, onInitialRequestHandled]);

  const expiring = policies.filter((policy) => {
    const expiry = new Date(getExpiry(policy));
    const days = (expiry.getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 45;
  });
  const openClaims = claims.filter((claim) => !["settled", "completed", "closed"].includes(String(claim.claimStatus).toLowerCase()));
  const quotes = requests.filter((item) => ["NEW_POLICY_QUOTE", "RENEWAL_QUOTE"].includes(item.metadata?.requestType));
  const pendingPayments = quotes.filter((item) =>
    item.amount && (item.metadata?.paymentRequested || item.metadata?.paymentLink) && !["COMPLETED", "CLOSED", "CANCELLED"].includes(item.status)
  );
  const notifications = useMemo(() => [
    ...expiring.map((policy) => ({ id: `expiry-${policy.id}`, type: "Policy reminder", title: `${getPolicyNumber(policy)} expires on ${date(getExpiry(policy))}`, detail: "Request a renewal quotation before the due date.", tone: "amber" })),
    ...openClaims.map((claim) => ({ id: `claim-${claim.id}`, type: "Claim update", title: `${claim.claimNo} is ${claim.claimStatus}`, detail: claim.currentRemark || "The claim desk is reviewing your file.", tone: "blue" })),
    ...openClaims.filter((claim) => !claim.documents?.length).map((claim) => ({ id: `docs-${claim.id}`, type: "Missing document", title: `Documents needed for ${claim.claimNo}`, detail: "Upload incident photos, invoices, or supporting reports.", tone: "red" })),
    ...pendingPayments.map((item) => ({ id: `payment-${item.id}`, type: "Payment reminder", title: item.metadata?.paymentLink ? "Your secure payment link is ready" : "Payment link requested", detail: item.policyNumber ? `Quotation for policy ${item.policyNumber}` : item.title, tone: "amber" })),
    ...requests.map((item) => ({ id: `request-${item.id}`, type: "Request history", title: `${item.title}: ${String(item.status).replaceAll("_", " ")}`, detail: `${item.policyNumber || "General request"} · Updated ${date(item.updatedAt)}`, tone: "blue" })),
  ], [expiring, openClaims, pendingPayments, requests]);

  function openRequest(type, policy) { setRequestModal({ type, policyNo: getPolicyNumber(policy) }); }
  async function requestPaymentLink(quote) {
    const response = await fetch("/api/client/service-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REQUEST_PAYMENT_LINK", requestId: quote.id }),
    });
    const data = await response.json();
    if (!response.ok) window.alert(data.error || "Payment link could not be requested.");
    await loadRequests();
  }
  const nav = [
    ["overview", "Overview", WalletCards], ["renewals", "Renewals", RefreshCw], ["payments", "Quotes & Buy", ReceiptText], ["notifications", "Notifications", Bell], ["support", "Support", Headphones], ["updates", "Policy updates", FilePenLine],
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-700 bg-emerald-600 !text-white force-white shadow-sm [&_svg]:!stroke-white md:hidden" aria-label="Back to policies"><ChevronLeft size={25} strokeWidth={2.5} className="!text-white force-white" /></button>
        <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-700 md:text-[10px]">Policy services</p><h1 className="mt-1 text-xl font-bold leading-tight text-slate-950 md:text-2xl">Manage your insurance</h1><p className="mt-1 text-[10px] leading-relaxed text-slate-500 md:text-xs">Renewals, payments, notifications, support and policy changes.</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2 md:flex md:gap-2 md:overflow-x-auto md:pb-1">{nav.map(([id,label,Icon]) => <button key={id} onClick={() => setSection(id)} className={`relative inline-flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-[9px] font-bold md:min-h-0 md:shrink-0 md:flex-row md:rounded-xl md:px-4 md:py-2.5 md:text-xs ${section === id ? "bg-emerald-600 text-white force-white shadow-md shadow-emerald-200" : "border border-slate-200 bg-white text-slate-600 shadow-sm"}`}><Icon size={14} />{label}{id === "notifications" && notifications.length ? <span className="absolute right-1.5 top-1 rounded-full bg-red-500 px-1.5 text-[8px] text-white force-white md:static md:bg-white/20 md:text-[9px]">{notifications.length}</span> : null}</button>)}</div>

      {section === "overview" ? <div className="space-y-4 md:space-y-6"><div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">{[
        ["Active policies", policies.filter((policy) => policy.isActivePolicy).length, ShieldCheck], ["Expiring soon", expiring.length, CalendarDays], ["Open claims", openClaims.length, AlertCircle], ["Pending payments", pendingPayments.length, IndianRupee],
      ].map(([label,value,Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 md:h-10 md:w-10 md:rounded-2xl"><Icon size={17} /></div><p className="mt-3 text-xl font-black text-slate-900 md:mt-4 md:text-2xl">{value}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-slate-500 md:text-[10px]">{label}</p></div>)}</div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 md:rounded-3xl md:p-5"><h3 className="text-xs font-bold text-emerald-950 md:text-sm">Important actions</h3><div className="mt-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap"><button onClick={() => openRequest("NEW_POLICY_QUOTE")} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-bold text-white force-white md:px-4 md:text-xs">Buy / Get quotes</button><button onClick={() => openRequest("RENEWAL_QUOTE", policies[0])} disabled={!policies.length} className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-[10px] font-bold text-emerald-700 disabled:opacity-40 md:px-4 md:text-xs">Renewal quote</button><button onClick={() => onStartClaim(policies[0])} disabled={!policies.length} className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-[10px] font-bold text-emerald-700 disabled:opacity-40 md:px-4 md:text-xs">Start a claim</button><button onClick={() => setSection("support")} className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-[10px] font-bold text-emerald-700 md:px-4 md:text-xs">Contact support</button></div></div></div> : null}

      {section === "renewals" ? <div className="grid gap-4 lg:grid-cols-2">{policies.map((policy) => <div key={policy.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-mono text-sm font-bold text-slate-900">{getPolicyNumber(policy)}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Expires {date(getExpiry(policy))}</p><p className="mt-1 text-[9px] font-bold text-emerald-700">Current policy is issued and paid</p></div><StatusPill status={policy.renewalStatus || "ACTIVE"} /></div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => openRequest("RENEWAL_QUOTE",policy)} disabled={!getExpiry(policy)} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-bold text-white force-white disabled:opacity-40">Get renewal quote</button><button onClick={() => setSection("payments")} className="rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-bold text-slate-700">View my quotes</button>{policy.renewalStatus === "RENEWED" ? <a href={`/api/client/policies/${policy.id}/document`} className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-[10px] font-bold text-emerald-700 no-underline">Download renewed policy</a> : null}</div></div>)}</div> : null}

      {section === "payments" ? <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-700 p-5 text-white [&_*]:!text-white"><div><p className="text-[9px] font-bold uppercase tracking-wider">Need new insurance?</p><h2 className="mt-1 text-lg font-bold">Buy a policy or compare quotes</h2><p className="mt-1 text-[10px]">Tell us what you need and an agent will publish quotations here.</p></div><button onClick={() => openRequest("NEW_POLICY_QUOTE")} className="rounded-xl bg-white px-4 py-2.5 text-[10px] font-bold !text-emerald-800">Get quotes</button></div>
        <div><h3 className="text-sm font-bold text-slate-900">My quotations</h3><div className="mt-3 grid gap-4 lg:grid-cols-2">{quotes.length ? quotes.map((quote) => <div key={quote.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-900">{quote.title}</p><p className="mt-1 text-[10px] text-slate-500">{quote.policyNumber || "New policy quotation"}</p></div><StatusPill status={quote.status} /></div><div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-[9px] font-bold uppercase text-slate-400">Quoted premium</p><p className="mt-1 text-xl font-black text-slate-900">{quote.amount ? money(quote.amount) : "Awaiting agent"}</p>{quote.metadata?.quoteNote ? <p className="mt-2 text-[10px] leading-relaxed text-slate-600">{quote.metadata.quoteNote}</p> : null}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="text-[9px] text-slate-400">Updated {date(quote.updatedAt)}</span><QuotePaymentAction quote={quote} onRequestLink={requestPaymentLink} /></div></div>) : <EmptyState icon={ReceiptText} title="No quotations yet" text="Request a new or renewal quotation and your agent will publish it here." />}</div></div>
        <div><h3 className="text-sm font-bold text-slate-900">Issued policies</h3><p className="mt-1 text-[10px] text-slate-500">These policies are already created and paid. No payment link is required.</p><div className="mt-3 grid gap-3 lg:grid-cols-2">{policies.map((policy) => <div key={policy.id} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div><p className="font-mono text-xs font-bold text-emerald-950">{getPolicyNumber(policy)}</p><p className="mt-1 text-[9px] font-bold text-emerald-700">Issued · Payment completed</p></div><a href={`/api/client/policies/${policy.id}/document?kind=receipt`} className="rounded-xl bg-white px-3 py-2 text-[9px] font-bold text-emerald-700 no-underline">Receipt</a></div>)}</div></div></div> : null}

      {section === "notifications" ? <div className="space-y-3">{notifications.length ? notifications.map((item) => <div key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Bell size={16} /></div><div><p className="text-[9px] font-bold uppercase text-emerald-700">{item.type}</p><h3 className="mt-1 text-xs font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-[10px] text-slate-500">{item.detail}</p></div></div>) : <EmptyState icon={CheckCircle2} title="You are all caught up" text="New policy, claim, payment, and document alerts will appear here." />}</div> : null}

      {section === "support" ? <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><a href={`tel:${SUPPORT_PHONE}`} className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-800 no-underline"><Phone className="text-emerald-600" /><h3 className="mt-3 text-sm font-bold">Call support</h3><p className="mt-1 text-[10px] text-slate-500">Bhopal desk: {SUPPORT_PHONE}</p></a><a href={`https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-900 no-underline"><MessageCircle className="text-emerald-600" /><h3 className="mt-3 text-sm font-bold">WhatsApp support</h3><p className="mt-1 text-[10px] text-emerald-700">Chat with the service desk</p></a><button onClick={() => openRequest("SUPPORT")} className="rounded-3xl border border-slate-200 bg-white p-5 text-left"><Headphones className="text-emerald-600" /><h3 className="mt-3 text-sm font-bold">Submit a ticket</h3><p className="mt-1 text-[10px] text-slate-500">Receive a trackable request number</p></button></div><div className="rounded-3xl border border-red-100 bg-red-50 p-5"><p className="text-[10px] font-bold uppercase text-red-700">Emergency contacts</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><a href="tel:112" className="rounded-xl bg-white p-3 text-xs font-bold text-red-700 no-underline">Emergency · 112</a><a href="tel:108" className="rounded-xl bg-white p-3 text-xs font-bold text-red-700 no-underline">Ambulance · 108</a><a href={`tel:${SUPPORT_PHONE}`} className="rounded-xl bg-white p-3 text-xs font-bold text-red-700 no-underline">Claims desk</a></div></div><RequestHistory requests={requests.filter((item) => item.metadata?.requestType === "SUPPORT")} loading={loading} /></div> : null}

      {section === "updates" ? <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3">{[["VEHICLE_CORRECTION","Vehicle correction","Registration, engine, chassis or model"],["NOMINEE_CHANGE","Nominee change","Update nominee details"],["CONTACT_CHANGE","Policy contact change","Correct phone, email or address"]].map(([type,title,text]) => <button key={type} onClick={() => openRequest(type)} className="rounded-3xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-300"><FilePenLine size={19} className="text-emerald-600" /><h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-[10px] text-slate-500">{text}</p><span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">Start request <ArrowRight size={11} /></span></button>)}</div><RequestHistory requests={requests.filter((item) => item.type === "ENDORSEMENT")} loading={loading} /></div> : null}

      <RequestModal request={requestModal} policies={policies} onClose={() => setRequestModal(null)} onSaved={() => { setRequestModal(null); loadRequests(); }} />
    </div>
  );
}

function RequestHistory({ requests, loading }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Request history</h3>{loading ? <Loader2 size={15} className="animate-spin text-emerald-600" /> : <span className="text-[10px] font-bold text-slate-400">{requests.length} requests</span>}</div><div className="mt-4 space-y-3">{requests.length ? requests.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="mt-1 text-[10px] text-slate-500">{item.policyNumber || "General request"} · {date(item.createdAt)}</p>{item.comments?.length ? <p className="mt-2 text-[10px] font-semibold text-slate-600">Latest: {item.comments.at(-1).comment}</p> : null}</div><StatusPill status={item.status} /></div>) : <p className="py-5 text-center text-xs text-slate-400">No requests submitted yet.</p>}</div></div>;
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center"><Icon size={26} className="mx-auto text-emerald-600" /><h3 className="mt-3 text-sm font-bold text-slate-800">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">{text}</p></div>;
}
