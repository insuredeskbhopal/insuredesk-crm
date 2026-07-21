/* global navigator */
"use client";

import { useEffect, useRef, useState } from "react";
import ModalPortal from "@/app/components/shared/ModalPortal";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Copy,
  Check,
  KeyRound,
  Shield,
  Loader2,
  Inbox,
  Link2,
  UserPlus,
  MessageSquareWarning,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";

export default function ClientManagementPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;
  const clientsRequestRef = useRef(null);

  // Copy State Tracking
  const [copiedId, setCopiedId] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [selectedProfileId, setSelectedProfileId] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Super Admin Client ID request queue. A 403 means this user is not a Super Admin.
  const [clientIdRequests, setClientIdRequests] = useState(null);
  const [requestQueueLoading, setRequestQueueLoading] = useState(true);
  const [resolutionRequest, setResolutionRequest] = useState(null);
  const [resolutionAction, setResolutionAction] = useState("LINK_EXISTING");
  const [resolutionClientId, setResolutionClientId] = useState("");
  const [resolutionSearch, setResolutionSearch] = useState("");
  const [resolutionResults, setResolutionResults] = useState([]);
  const [resolutionSearching, setResolutionSearching] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [resolvingRequestId, setResolvingRequestId] = useState("");
  const [myClientIdRequests, setMyClientIdRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(true);
  const [decisionRequest, setDecisionRequest] = useState(null);
  const [decisionAction, setDecisionAction] = useState("NEEDS_CORRECTION");
  const [decisionNote, setDecisionNote] = useState("");
  const [correctionRequest, setCorrectionRequest] = useState(null);
  const [correctionName, setCorrectionName] = useState("");
  const [correctionPhone, setCorrectionPhone] = useState("");
  const [correctionEmail, setCorrectionEmail] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(fetchClients, searchQuery ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      clientsRequestRef.current?.abort();
    };
  }, [page, searchQuery]);

  useEffect(() => {
    fetchClientIdRequests();
    fetchMyClientIdRequests();
  }, []);

  async function fetchClients() {
    clientsRequestRef.current?.abort();
    const controller = new window.AbortController();
    clientsRequestRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/client-accounts?page=${page}&limit=${limit}${queryParam}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch client accounts");
      const data = await res.json();
      setProfiles(data.accounts || data.profiles || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      if (err?.name !== "AbortError") setError(err.message || "Failed to load profiles");
    } finally {
      if (clientsRequestRef.current === controller) {
        clientsRequestRef.current = null;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
  }

  async function fetchClientIdRequests() {
    setRequestQueueLoading(true);
    try {
      const res = await fetch("/api/client-id-requests");
      if (res.status === 403) {
        setClientIdRequests(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to load Client ID requests");
      const data = await res.json();
      setClientIdRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Failed to load Client ID requests");
    } finally {
      setRequestQueueLoading(false);
    }
  }

  async function fetchMyClientIdRequests() {
    setMyRequestsLoading(true);
    try {
      const res = await fetch("/api/client-id-requests?mine=1&all=1");
      if (!res.ok) throw new Error("Failed to load your Client ID requests");
      const data = await res.json();
      const requests = data.requests || [];
      setMyClientIdRequests(requests);
      const linkedRequestId = new window.URLSearchParams(window.location.search).get("clientIdRequest");
      const linkedRequest = requests.find((item) => item.id === linkedRequestId && item.status === "WAITING_DOCUMENTS");
      if (linkedRequest) {
        setCorrectionRequest(linkedRequest);
        setCorrectionName(linkedRequest.name || "");
        setCorrectionPhone(linkedRequest.phone || "");
        setCorrectionEmail(linkedRequest.email || "");
      }
    } catch (err) {
      setError(err.message || "Failed to load your Client ID requests");
    } finally {
      setMyRequestsLoading(false);
    }
  }

  const openExistingClientModal = (request, clientId = "") => {
    setResolutionRequest(request);
    setResolutionAction("LINK_EXISTING");
    setResolutionClientId(clientId);
    setResolutionSearch("");
    setResolutionResults([]);
    setResolutionError("");
  };

  const openCreateClientModal = (request) => {
    setResolutionRequest(request);
    setResolutionAction("CREATE_NEW");
    setResolutionClientId("");
    setResolutionSearch("");
    setResolutionResults([]);
    setResolutionError("");
  };

  const openDecisionModal = (request, action) => {
    setDecisionRequest(request);
    setDecisionAction(action);
    setDecisionNote("");
    setResolutionError("");
  };

  const openCorrectionPanel = (request) => {
    setCorrectionRequest(request);
    setCorrectionName(request.name || "");
    setCorrectionPhone(request.phone || "");
    setCorrectionEmail(request.email || "");
    setResolutionError("");
  };

  useEffect(() => {
    const query = resolutionSearch.trim();
    if (!resolutionRequest || resolutionAction !== "LINK_EXISTING" || query.length < 2) {
      setResolutionResults([]);
      setResolutionSearching(false);
      return undefined;
    }

    const controller = new window.AbortController();
    const timer = window.setTimeout(async () => {
      setResolutionSearching(true);
      try {
        const res = await fetch(`/api/client-accounts?page=1&limit=8&q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Client search failed");
        const data = await res.json();
        setResolutionResults(data.accounts || data.profiles || []);
      } catch (err) {
        if (err?.name !== "AbortError") setResolutionError(err.message || "Client search failed");
      } finally {
        if (!controller.signal.aborted) setResolutionSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [resolutionAction, resolutionRequest, resolutionSearch]);

  const resolveClientIdRequest = async (request, action, clientId = "") => {
    setResolutionError("");
    setResolvingRequestId(request.id);
    try {
      const res = await fetch("/api/client-id-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action, clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Client ID request could not be resolved.");
      setSuccessMessage(
        action === "CREATE_NEW" && data.resolutionType === "CREATE_NEW"
          ? `New Client ID created for ${data.resolvedClientName}.`
          : `${data.resolvedClientName} linked to the existing Client ID.`,
      );
      setResolutionRequest(null);
      await Promise.all([fetchClientIdRequests(), fetchClients()]);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setResolutionError(err.message || "Client ID request could not be resolved.");
    } finally {
      setResolvingRequestId("");
    }
  };

  const submitRequestAction = async ({ request, action, note, identity }) => {
    setResolutionError("");
    setResolvingRequestId(request.id);
    try {
      const res = await fetch("/api/client-id-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action, note, ...identity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Client ID request could not be updated.");
      setSuccessMessage(action === "RESUBMIT" ? "Client ID request resubmitted for review." : "Client ID request returned for correction.");
      setDecisionRequest(null);
      setCorrectionRequest(null);
      await Promise.all([fetchClientIdRequests(), fetchMyClientIdRequests()]);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setResolutionError(err.message || "Client ID request could not be updated.");
    } finally {
      setResolvingRequestId("");
    }
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedProfileId("");
    setName("");
    setEmail("");
    setPhone("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile) => {
    setModalMode("edit");
    setSelectedProfileId(profile.id);
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSubmitting(true);

    if (!name || !phone) {
      setFormError("Name and Phone number are required.");
      setFormSubmitting(false);
      return;
    }

    const payload = {
      name,
      phone: phone.replace(/[^0-9]/g, ""),
      email: email.trim(),
    };

    try {
      let res;
      if (modalMode === "create") {
        res = await fetch("/api/client-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/client-accounts/${selectedProfileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save customer profile");
      }

      setSuccessMessage(
        modalMode === "create"
          ? "Client profile generated successfully!"
          : "Client profile updated successfully!"
      );
      setIsModalOpen(false);
      fetchClients();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const getMpin = (phoneStr) => {
    if (!phoneStr) return "N/A";
    const cleanPhone = phoneStr.replace(/[^0-9]/g, "");
    return cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone;
  };

  const totalPages = Math.ceil(totalCount / limit);
  const pageStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = Math.min(page * limit, totalCount);
  const paginationPages = getPaginationPages(page, totalPages);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <OperationsBackLink />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-emerald-600" />
            Client Management
          </h1>
          <p className="text-slate-500 mt-1">
            Generate and manage client portal access credentials, view Client IDs, and configure login MPINs.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium transition-colors w-fit"
        >
          <Plus className="h-5 w-5" />
          Create Client Login
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Credential Mechanism Guidelines</p>
          <p>
            * <strong>Client ID</strong>: This is the unique profile identification key generated automatically for the client.
          </p>
          <p>
            * <strong>Client MPIN</strong>: This is a secure 4-digit code matching the <strong>last 4 digits</strong> of the client&apos;s registered phone number.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {(myRequestsLoading || myClientIdRequests.some((item) => item.status !== "COMPLETED")) && (
        <section className="overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-sky-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <MessageSquareWarning className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">My Client ID Requests</h2>
                <p className="text-xs text-slate-600">Review pending requests and correct those returned by Super Admin.</p>
              </div>
            </div>
          </div>
          {myRequestsLoading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your requests...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myClientIdRequests.filter((item) => item.status !== "COMPLETED").map((item) => (
                <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-slate-900">{item.name}</strong>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === "WAITING_DOCUMENTS" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {item.status === "WAITING_DOCUMENTS" ? "Needs Correction" : "Pending Super Admin Review"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.phone}{item.email ? ` · ${item.email}` : ""}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">Request ID: {item.id}</p>
                    {item.correctionNote && <p className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">Super Admin note: {item.correctionNote}</p>}
                  </div>
                  {item.status === "WAITING_DOCUMENTS" && (
                    <button type="button" onClick={() => openCorrectionPanel(item)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700">
                      <Edit2 className="h-4 w-4" /> Correct & Resubmit
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {clientIdRequests !== null && (
        <section className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Client ID Requests</h2>
                <p className="text-xs text-slate-600">Check for an existing client before creating a new Client ID.</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold">
              {clientIdRequests.filter((item) => item.status !== "COMPLETED").length} pending
            </span>
          </div>

          {requestQueueLoading ? (
            <div className="p-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading requests...
            </div>
          ) : clientIdRequests.filter((item) => item.status !== "COMPLETED").length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No pending Client ID requests.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clientIdRequests.filter((item) => item.status !== "COMPLETED").map((item) => (
                <div key={item.id} className="p-4 grid gap-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    {item.status === "WAITING_DOCUMENTS" && <span className="mt-1 inline-block rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">Needs Correction</span>}
                    <div className="mt-1 text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{item.phone}</span>
                      {item.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{item.email}</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Requested by {item.requestedByName || item.requestedByEmail || "Agent"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">Request ID: {item.id}</p>
                    <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                      <strong>{item.policies?.length || 0} attached {item.policies?.length === 1 ? "policy" : "policies"}</strong>
                      {item.policies?.map((policy) => (
                        <div key={policy.id} className="mt-1 truncate" title={policy.sourceFile}>
                          {policy.policyNumber || policy.sourceFile}
                        </div>
                      ))}
                    </div>
                    {item.correctionNote && <p className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">Latest note: {item.correctionNote}</p>}
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Possible existing clients</p>
                    {item.status === "WAITING_DOCUMENTS" ? (
                      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">Waiting for the requesting agent to correct and resubmit this Request ID.</p>
                    ) : item.suggestions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {item.suggestions.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => openExistingClientModal(item, client.id)}
                            className="text-left rounded-lg border border-slate-200 bg-slate-50 hover:border-emerald-400 px-3 py-2 transition-colors"
                          >
                            <span className="block text-xs font-bold text-slate-800">{client.name}</span>
                            <span className="block text-[11px] text-slate-500">{client.phone}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No likely matches found.</p>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    {item.status !== "WAITING_DOCUMENTS" && <button
                      type="button"
                      onClick={() => openExistingClientModal(item)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Link2 className="h-4 w-4" /> Paste existing ID
                    </button>}
                    {item.status !== "WAITING_DOCUMENTS" && <button
                      type="button"
                      onClick={() => openCreateClientModal(item)}
                      disabled={resolvingRequestId === item.id}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {resolvingRequestId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      Create new Client ID
                    </button>}
                    {item.status !== "WAITING_DOCUMENTS" && <button type="button" onClick={() => openDecisionModal(item, "NEEDS_CORRECTION")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">
                      Needs Correction
                    </button>}
                    {item.status !== "WAITING_DOCUMENTS" && <button type="button" onClick={() => openDecisionModal(item, "REJECT")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                      Reject
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Client directory */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients by name, phone, or Client ID..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 lg:justify-end">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{totalCount} client{totalCount === 1 ? "" : "s"}</p>
              <p className="text-xs text-slate-500">Showing {pageStart}–{pageEnd}</p>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button type="button" aria-label="Previous client page" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <span className="min-w-16 px-2 text-center text-xs font-bold text-slate-700">{page} / {totalPages}</span>
                <button type="button" aria-label="Next client page" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
            <p className="text-sm font-medium">Loading client portal profiles...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Users className="h-12 w-12 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-700">No client profiles found</p>
            <p className="text-sm text-slate-400">Search with another filter or create a new client login.</p>
          </div>
        ) : (
          <div className="grid gap-3 bg-slate-50/50 p-4 md:p-5">
            {profiles.map((profile) => (
              <article key={profile.id} className="group grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_32px_-24px_rgba(5,150,105,0.45)] lg:grid-cols-[1.25fr_1fr_auto_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-sm font-black text-white shadow-md shadow-emerald-100">
                    {profile.name ? profile.name[0].toUpperCase() : "?"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900">{profile.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3 text-emerald-600" />{profile.phone || "No phone"}</span>
                      {profile.email && <span className="inline-flex min-w-0 items-center gap-1"><Mail className="h-3 w-3 text-sky-500" /><span className="truncate">{profile.email}</span></span>}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Client ID</p>
                  <div className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="truncate font-mono text-[11px] font-medium text-slate-600" title={profile.id}>{profile.id}</span>
                    <button type="button" onClick={() => handleCopy(profile.id)} className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition hover:text-emerald-600" title="Copy Client ID">
                      {copiedId === profile.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 px-3 py-2 lg:min-w-24">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700/70">Client MPIN</p>
                  <div className="mt-1 flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-emerald-600" /><span className="font-mono text-sm font-black tracking-[0.16em] text-emerald-950">{getMpin(profile.phone)}</span></div>
                </div>

                <button type="button" onClick={() => handleOpenEditModal(profile)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Client pagination" className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row">
            <p className="text-xs font-medium text-slate-500">Showing <strong className="text-slate-800">{pageStart}–{pageEnd}</strong> of <strong className="text-slate-800">{totalCount}</strong></p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft className="h-4 w-4" /> Previous</button>
              {paginationPages.map((pageNumber) => (
                <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} aria-current={pageNumber === page ? "page" : undefined} className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${pageNumber === page ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{pageNumber}</button>
              ))}
              <button type="button" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page === totalPages} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35">Next <ChevronRight className="h-4 w-4" /></button>
            </div>
          </nav>
        )}
      </section>

      {/* CREATE & EDIT MODALS */}
      {isModalOpen && (
        <ModalPortal>
          <div className="client-management-modal-shell">
          {/* Backdrop blur with overlay mask */}
          <div
            className="client-management-modal-backdrop absolute inset-0"
            onClick={() => setIsModalOpen(false)}
          ></div>

          {/* Modal Container: centered vertically and horizontally */}
          <div className="client-management-modal-card bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                {modalMode === "create" ? "Generate Client Portal Login" : "Edit Portal Credentials"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Client Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Girish Sharma"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. client@gmail.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Mobile Number (Client MPIN is based on last 4 digits)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={formSubmitting}
                />
                {phone.replace(/[^0-9]/g, "").length >= 4 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Computed Client MPIN will be:{" "}
                    <strong className="text-slate-700 font-mono">
                      {getMpin(phone)}
                    </strong>
                  </p>
                )}
              </div>

              {modalMode === "edit" && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
                  Client ID (Permanent Key):{" "}
                  <strong className="font-mono text-slate-700 block mt-0.5">{selectedProfileId}</strong>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  disabled={formSubmitting}
                >
                  {formSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{modalMode === "create" ? "Generate Login" : "Update Credentials"}</span>
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {resolutionRequest && (
        <ModalPortal>
          <div className="client-management-modal-shell">
          <button
            type="button"
            aria-label="Close Client ID resolution"
            className="client-management-modal-backdrop absolute inset-0"
            onClick={() => setResolutionRequest(null)}
          />
          <div className="client-management-modal-card rounded-2xl border border-slate-100 bg-white shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-bold text-slate-900">
                  {resolutionAction === "CREATE_NEW" ? "Confirm new Client ID" : "Link existing Client ID"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Request for {resolutionRequest.name} · {resolutionRequest.phone}</p>
              </div>
              <button type="button" onClick={() => setResolutionRequest(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {resolutionAction === "LINK_EXISTING" ? <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Search existing clients</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={resolutionSearch}
                      onChange={(event) => setResolutionSearch(event.target.value)}
                      placeholder="Search name, phone or email"
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  {resolutionSearching && <p className="mt-2 text-xs text-slate-500">Searching...</p>}
                  {resolutionResults.length > 0 && (
                    <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
                      {resolutionResults.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setResolutionClientId(client.id)}
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-emerald-50"
                        >
                          <span><strong className="block text-xs text-slate-800">{client.name}</strong><span className="text-[11px] text-slate-500">{client.phone}</span></span>
                          <span className="text-[10px] font-bold text-emerald-700">Select</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Existing Client ID</label>
                <input
                  type="text"
                  value={resolutionClientId}
                  onChange={(event) => setResolutionClientId(event.target.value.trim())}
                  placeholder="Paste the complete Client ID"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div> : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
                  <p className="font-bold text-slate-900">Review before creating</p>
                  <dl className="mt-3 grid grid-cols-[90px_1fr] gap-2 text-xs">
                    <dt className="text-slate-500">Name</dt><dd className="font-semibold">{resolutionRequest.name}</dd>
                    <dt className="text-slate-500">Phone</dt><dd className="font-semibold">{resolutionRequest.phone}</dd>
                    <dt className="text-slate-500">Email</dt><dd className="font-semibold">{resolutionRequest.email || "Not provided"}</dd>
                    <dt className="text-slate-500">Policies</dt><dd className="font-semibold">{resolutionRequest.policies?.length || 0}</dd>
                  </dl>
                  <p className="mt-3 text-xs text-amber-800">Confirm only after checking that no valid existing client is available.</p>
                </div>
              )}
              {resolutionError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {resolutionError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setResolutionRequest(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={(resolutionAction === "LINK_EXISTING" && !resolutionClientId) || resolvingRequestId === resolutionRequest.id}
                  onClick={() => resolveClientIdRequest(resolutionRequest, resolutionAction, resolutionClientId)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {resolvingRequestId === resolutionRequest.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {resolutionAction === "CREATE_NEW" ? "Confirm & Create Client ID" : "Confirm & Link Client ID"}
                </button>
              </div>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {decisionRequest && (
        <ModalPortal>
          <div className="client-management-modal-shell">
          <button type="button" aria-label="Close decision dialog" className="client-management-modal-backdrop absolute inset-0" onClick={() => setDecisionRequest(null)} />
          <div className="client-management-modal-card rounded-2xl border border-white/70 bg-white shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="font-bold text-slate-900">{decisionAction === "REJECT" ? "Reject request for correction" : "Request correction"}</h3>
                <p className="mt-1 text-xs text-slate-500">The same Request ID and attached policies will be preserved.</p>
              </div>
              <button type="button" onClick={() => setDecisionRequest(null)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Correction note</label>
                <textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} rows={4} placeholder="Explain exactly what the agent must correct" className="w-full resize-none rounded-xl border border-slate-300 px-3.5 py-3 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              {resolutionError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{resolutionError}</div>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setDecisionRequest(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" disabled={!decisionNote.trim() || resolvingRequestId === decisionRequest.id} onClick={() => submitRequestAction({ request: decisionRequest, action: decisionAction, note: decisionNote })} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                  {resolvingRequestId === decisionRequest.id && <Loader2 className="h-4 w-4 animate-spin" />} Confirm
                </button>
              </div>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {correctionRequest && (
        <ModalPortal>
          <div className="client-management-modal-shell">
          <button type="button" aria-label="Close correction panel" className="client-management-modal-backdrop absolute inset-0" onClick={() => setCorrectionRequest(null)} />
          <div className="client-management-modal-card rounded-2xl border border-white/70 bg-white shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div><h3 className="font-bold text-slate-900">Correct Client ID request</h3><p className="mt-1 font-mono text-[10px] text-slate-400">Request ID: {correctionRequest.id}</p></div>
              <button type="button" onClick={() => setCorrectionRequest(null)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              {correctionRequest.correctionNote && <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"><strong>Super Admin note:</strong> {correctionRequest.correctionNote}</div>}
              <div><label className="mb-1 block text-xs font-bold text-slate-600">CLIENT NAME</label><input value={correctionName} onChange={(event) => setCorrectionName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-xs font-bold text-slate-600">PHONE</label><input value={correctionPhone} onChange={(event) => setCorrectionPhone(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-xs font-bold text-slate-600">EMAIL</label><input type="email" value={correctionEmail} onChange={(event) => setCorrectionEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none" /></div>
              {resolutionError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{resolutionError}</div>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setCorrectionRequest(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="button" disabled={!correctionName.trim() || !correctionPhone.trim() || resolvingRequestId === correctionRequest.id} onClick={() => submitRequestAction({ request: correctionRequest, action: "RESUBMIT", identity: { name: correctionName, phone: correctionPhone, email: correctionEmail } })} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                  {resolvingRequestId === correctionRequest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Resubmit same Request ID
                </button>
              </div>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.min(Math.max(currentPage - 2, 1), totalPages - 4);
  return Array.from({ length: 5 }, (_, index) => start + index);
}
