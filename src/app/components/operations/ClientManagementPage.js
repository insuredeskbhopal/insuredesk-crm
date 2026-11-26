"use client";
/* global navigator */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ModalPortal from "@/app/components/shared/ModalPortal";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
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
  Shield,
  Loader2,
  Inbox,
  Link2,
  UserPlus,
  Send,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Lock,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";

export default function ClientManagementPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [temporaryCredential, setTemporaryCredential] = useState(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState("directory"); // "directory" | "my-requests" | "super-admin" | "guidelines"
  const [myRequestsFilter, setMyRequestsFilter] = useState("ALL"); // "ALL" | "WAITING_DOCUMENTS" | "PENDING" | "COMPLETED"
  const [myRequestsSearch, setMyRequestsSearch] = useState("");
  const [myRequestsPage, setMyRequestsPage] = useState(1);
  const [superAdminFilter, setSuperAdminFilter] = useState("ALL"); // "ALL" | "PENDING" | "WAITING_DOCUMENTS" | "HAS_SUGGESTIONS"
  const [superAdminSearch, setSuperAdminSearch] = useState("");
  const [superAdminPage, setSuperAdminPage] = useState(1);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterPolicies, setFilterPolicies] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [canResetMpin, setCanResetMpin] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const limit = 10;
  const clientsRequestRef = useRef(null);
  const activeFilterCount = [filterEmail, filterPolicies].filter(Boolean).length + (sortBy !== "newest" ? 1 : 0);

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
  const [resolutionConflicts, setResolutionConflicts] = useState([]);
  const [resolutionAllowSharedPhone, setResolutionAllowSharedPhone] = useState(false);
  const [formConflicts, setFormConflicts] = useState([]);
  const [formAllowSharedPhone, setFormAllowSharedPhone] = useState(false);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState("");
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
  }, [page, searchQuery, sortBy, filterEmail, filterPolicies]);

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
      const sortParam = sortBy !== "newest" ? `&sort=${sortBy}` : "";
      const emailParam = filterEmail ? `&hasEmail=${filterEmail}` : "";
      const policiesParam = filterPolicies ? `&hasPolicies=${encodeURIComponent(filterPolicies)}` : "";
      const res = await fetch(`/api/client-accounts?page=${page}&limit=${limit}${queryParam}${sortParam}${emailParam}${policiesParam}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch client accounts");
      const data = await res.json();
      setProfiles(data.accounts || data.profiles || []);
      setTotalCount(data.total || 0);
      setCanResetMpin(Boolean(data.canResetMpin));
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
      if (!res.ok) return;
      const data = await res.json();
      setClientIdRequests(data.requests || []);
    } catch {
      // non-blocking background queue fetch
    } finally {
      setRequestQueueLoading(false);
    }
  }

  async function fetchMyClientIdRequests() {
    setMyRequestsLoading(true);
    try {
      const res = await fetch("/api/client-id-requests?mine=1&all=1");
      if (!res.ok) return;
      const data = await res.json();
      const requests = data.requests || [];
      setMyClientIdRequests(requests);
      const linkedRequestId = new window.URLSearchParams(window.location.search).get("clientIdRequest");
      const linkedRequest = requests.find(
        (item) => item.id === linkedRequestId && item.status === "WAITING_DOCUMENTS",
      );
      if (linkedRequest) {
        setCorrectionRequest(linkedRequest);
        setCorrectionName(linkedRequest.name || "");
        setCorrectionPhone(linkedRequest.phone || "");
        setCorrectionEmail(linkedRequest.email || "");
        setActiveTab("my-requests");
      }
    } catch {
      // non-blocking background queue fetch
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
    setResolutionConflicts([]);
    setResolutionAllowSharedPhone(false);
  };

  const openCreateClientModal = (request) => {
    setResolutionRequest(request);
    setResolutionAction("CREATE_NEW");
    setResolutionClientId("");
    setResolutionSearch("");
    setResolutionResults([]);
    setResolutionError("");
    setResolutionConflicts([]);
    setResolutionAllowSharedPhone(false);
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
    setResolutionConflicts([]);
    setResolvingRequestId(request.id);
    try {
      const res = await fetch("/api/client-id-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          action,
          clientId,
          ...(action === "CREATE_NEW" && resolutionAllowSharedPhone ? { allowSharedPhone: true } : {}),
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Server error while processing request. Please refresh and try again.");
      }
      if (!res.ok) {
        if (Array.isArray(data?.conflicts)) setResolutionConflicts(data.conflicts);
        throw new Error(data.error || "Client ID request could not be resolved.");
      }
      if (data.temporaryMpin) {
        setTemporaryCredential({
          clientId: data.resolvedClientId,
          clientCode: data.resolvedClientCode || "",
          name: data.resolvedClientName,
          mpin: data.temporaryMpin,
        });
      }
      setSuccessMessage(
        action === "CREATE_NEW" && data.resolutionType === "CREATE_NEW"
          ? `New Client ID${data.resolvedClientCode ? ` (${data.resolvedClientCode})` : ""} created for ${data.resolvedClientName}.`
          : `${data.resolvedClientName} linked to the existing Client ID.`,
      );
      setResolutionRequest(null);
      setResolutionConflicts([]);
      setResolutionAllowSharedPhone(false);
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
      setSuccessMessage(
        action === "RESUBMIT"
          ? "Client ID request resubmitted for review."
          : "Client ID request returned for correction.",
      );
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

  const handleCopy = (value, key = value) => {
    navigator.clipboard.writeText(value);
    setCopiedId(key);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const resetClientMpin = async (profile) => {
    setError("");
    try {
      const res = await fetch(`/api/client-accounts/${profile.id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Client MPIN could not be reset.");
      setTemporaryCredential({
        clientId: profile.id,
        clientCode: data.clientCode || profile.clientCode || "",
        name: profile.name,
        mpin: data.temporaryMpin,
      });
      setSuccessMessage("Temporary MPIN generated. Share it privately with the client.");
    } catch (err) {
      setError(err.message || "Client MPIN could not be reset.");
    }
  };

  const sendCredentialsWhatsApp = async (profile, resetMpin = false) => {
    setError("");
    setSendingWhatsAppId(profile.id);
    try {
      const res = await fetch(`/api/client-accounts/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEND_CREDENTIALS", resetMpin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "WhatsApp credentials could not be sent.");
      if (data.temporaryMpin) {
        setTemporaryCredential({
          clientId: profile.id,
          clientCode: data.clientCode || profile.clientCode || "",
          name: profile.name,
          mpin: data.temporaryMpin,
        });
      }
      setSuccessMessage(
        data.temporaryMpin
          ? `Fresh Temporary MPIN & Portal Client ID sent to ${profile.name} on WhatsApp.`
          : `Portal login details sent to ${profile.name} on WhatsApp.`,
      );
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.message || "WhatsApp credentials could not be sent.");
    } finally {
      setSendingWhatsAppId("");
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedProfileId("");
    setName("");
    setEmail("");
    setPhone("");
    setFormError("");
    setFormConflicts([]);
    setFormAllowSharedPhone(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile) => {
    setModalMode("edit");
    setSelectedProfileId(profile.id);
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setFormError("");
    setFormConflicts([]);
    setFormAllowSharedPhone(false);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSubmitting(true);

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!name || !normalizedPhone) {
      setFormError("Name and a valid 10-digit Indian mobile number are required.");
      setFormSubmitting(false);
      return;
    }

    const payload = {
      name,
      phone: normalizedPhone,
      email: email.trim(),
      ...(formAllowSharedPhone && canResetMpin ? { allowSharedPhone: true } : {}),
    };

    setFormConflicts([]);
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
        if (Array.isArray(data?.conflicts)) setFormConflicts(data.conflicts);
        throw new Error(data.error || "Failed to save customer profile");
      }

      if (data.temporaryMpin) {
        setTemporaryCredential({
          clientId: data.id,
          clientCode: data.clientCode || "",
          name: data.name,
          mpin: data.temporaryMpin,
        });
      }

      setSuccessMessage(
        modalMode === "create"
          ? `Client ID ${data.clientCode || ""} generated successfully!`
          : "Client profile updated successfully!",
      );
      setIsModalOpen(false);
      setFormConflicts([]);
      setFormAllowSharedPhone(false);
      fetchClients();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);
  const pageStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = Math.min(page * limit, totalCount);
  const paginationPages = getPaginationPages(page, totalPages);

  // Counts for KPIs & Tabs
  const myPendingCount = myClientIdRequests.filter((r) => ["OPEN", "IN_PROGRESS", "ASSIGNED"].includes(r.status)).length;
  const myNeedsCorrectionCount = myClientIdRequests.filter((r) => r.status === "WAITING_DOCUMENTS").length;
  const myCompletedCount = myClientIdRequests.filter((r) => r.status === "COMPLETED").length;
  const superAdminPendingCount = clientIdRequests ? clientIdRequests.filter((r) => r.status !== "COMPLETED").length : 0;

  const filteredMyRequests = myClientIdRequests.filter((item) => {
    if (myRequestsFilter === "WAITING_DOCUMENTS" && item.status !== "WAITING_DOCUMENTS") return false;
    if (myRequestsFilter === "PENDING" && (item.status === "WAITING_DOCUMENTS" || item.status === "COMPLETED")) return false;
    if (myRequestsFilter === "COMPLETED" && item.status !== "COMPLETED") return false;

    if (myRequestsSearch.trim()) {
      const q = myRequestsSearch.trim().toLowerCase();
      const target = [item.name, item.phone, item.email, item.id, item.correctionNote]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!target.includes(q)) return false;
    }
    return true;
  });

  const myRequestsLimit = 10;
  const myRequestsTotalPages = Math.ceil(filteredMyRequests.length / myRequestsLimit) || 1;
  const myRequestsPageStart = filteredMyRequests.length === 0 ? 0 : (myRequestsPage - 1) * myRequestsLimit + 1;
  const myRequestsPageEnd = Math.min(myRequestsPage * myRequestsLimit, filteredMyRequests.length);
  const myRequestsPaginationPages = getPaginationPages(myRequestsPage, myRequestsTotalPages);
  const paginatedMyRequests = filteredMyRequests.slice(
    (myRequestsPage - 1) * myRequestsLimit,
    myRequestsPage * myRequestsLimit,
  );

  // Super Admin Queue calculations
  const superAdminRequests = clientIdRequests ? clientIdRequests.filter((r) => r.status !== "COMPLETED") : [];
  const superAdminWithSuggestionsCount = superAdminRequests.filter((r) => r.suggestions && r.suggestions.length > 0).length;
  const superAdminWaitingCorrectionCount = superAdminRequests.filter(
    (r) => r.status === "WAITING_DOCUMENTS" || r.workflowStatus === "NEEDS_CORRECTION",
  ).length;
  const superAdminStrictPendingCount = superAdminRequests.filter(
    (r) => r.status !== "WAITING_DOCUMENTS" && r.workflowStatus !== "NEEDS_CORRECTION",
  ).length;

  const filteredSuperAdminRequests = superAdminRequests.filter((item) => {
    const isNeedsCorrection = item.status === "WAITING_DOCUMENTS" || item.workflowStatus === "NEEDS_CORRECTION";
    if (superAdminFilter === "WAITING_DOCUMENTS" && !isNeedsCorrection) return false;
    if (superAdminFilter === "PENDING" && isNeedsCorrection) return false;
    if (superAdminFilter === "HAS_SUGGESTIONS" && (!item.suggestions || item.suggestions.length === 0)) return false;

    if (superAdminSearch.trim()) {
      const q = superAdminSearch.trim().toLowerCase();
      const target = [
        item.name,
        item.phone,
        item.email,
        item.id,
        item.requestedByName,
        item.requestedByEmail,
        item.correctionNote,
        ...(item.policies || []).map((p) => p.policyNumber || p.sourceFile || ""),
        ...(item.suggestions || []).map((s) => s.name || s.phone || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!target.includes(q)) return false;
    }
    return true;
  });

  const superAdminLimit = 10;
  const superAdminTotalPages = Math.ceil(filteredSuperAdminRequests.length / superAdminLimit) || 1;
  const superAdminPageStart = filteredSuperAdminRequests.length === 0 ? 0 : (superAdminPage - 1) * superAdminLimit + 1;
  const superAdminPageEnd = Math.min(superAdminPage * superAdminLimit, filteredSuperAdminRequests.length);
  const superAdminPaginationPages = getPaginationPages(superAdminPage, superAdminTotalPages);
  const paginatedSuperAdminRequests = filteredSuperAdminRequests.slice(
    (superAdminPage - 1) * superAdminLimit,
    superAdminPage * superAdminLimit,
  );

  return (
    <div className="client-mgmt-page">
      {/* Top Breadcrumb */}
      <OperationsBackLink />

      {/* 1. Executive Command Header */}
      <div className="client-mgmt-head">
        <div className="client-mgmt-title-group">
          <span className="client-mgmt-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-800 animate-pulse" />
            Live Access Directory
          </span>
          <h1>
            <Users className="h-5 w-5 text-slate-800 shrink-0" />
            Client Management & Portal Access
          </h1>
          <p>
            Generate, verify, and govern secure customer portal accounts and unique Client IDs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchClients();
              fetchClientIdRequests();
              fetchMyClientIdRequests();
            }}
            title="Refresh All Records"
            aria-label="Refresh All Records"
            className="client-mgmt-refresh-btn"
          >
            <RefreshCw size={15} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 border border-slate-200 hover:border-slate-300 px-3.5 h-[36px] rounded-xl shadow-sm font-bold text-xs transition-all"
          >
            <Plus size={15} strokeWidth={2.2} className="text-slate-700" />
            <span>Create Client Login</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="client-mgmt-kpi-grid">
        {/* Total Active Clients */}
        <div className="client-mgmt-kpi-card tone-indigo">
          <div className="client-mgmt-kpi-info">
            <span className="client-mgmt-kpi-label">Active Clients</span>
            <span className="client-mgmt-kpi-val">{totalCount}</span>
            <span className="client-mgmt-kpi-sub">Verified Profiles</span>
          </div>
          <div className="client-mgmt-kpi-icon">
            <Users size={18} strokeWidth={2} />
          </div>
        </div>

        {/* My Pending Requests */}
        <div className="client-mgmt-kpi-card tone-sky">
          <div className="client-mgmt-kpi-info">
            <span className="client-mgmt-kpi-label">My Requests</span>
            <span className="client-mgmt-kpi-val">{myClientIdRequests.length}</span>
            <span className="client-mgmt-kpi-sub">{myPendingCount} In Admin Review</span>
          </div>
          <div className="client-mgmt-kpi-icon">
            <Send size={18} strokeWidth={2} />
          </div>
        </div>

        {/* Needs Correction */}
        <div className="client-mgmt-kpi-card tone-rose">
          <div className="client-mgmt-kpi-info">
            <span className="client-mgmt-kpi-label">Action Needed</span>
            <span className={`client-mgmt-kpi-val ${myNeedsCorrectionCount > 0 ? "text-rose-700" : ""}`}>
              {myNeedsCorrectionCount}
            </span>
            <span className={`client-mgmt-kpi-sub ${myNeedsCorrectionCount > 0 ? "text-rose-700 font-bold" : ""}`}>
              {myNeedsCorrectionCount > 0 ? "Requires Correction" : "Zero Blockers"}
            </span>
          </div>
          <div className="client-mgmt-kpi-icon">
            <ShieldAlert size={18} strokeWidth={2} />
          </div>
        </div>

        {/* Super Admin Approval Queue */}
        <div className="client-mgmt-kpi-card tone-amber">
          <div className="client-mgmt-kpi-info">
            <span className="client-mgmt-kpi-label">Admin Queue</span>
            <span className="client-mgmt-kpi-val">
              {clientIdRequests ? superAdminPendingCount : "Staff"}
            </span>
            <span className="client-mgmt-kpi-sub text-amber-700 font-medium">
              {clientIdRequests ? `${superAdminPendingCount} Approvals Pending` : "Standard Role"}
            </span>
          </div>
          <div className="client-mgmt-kpi-icon">
            <Shield size={18} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-white border border-slate-300 text-slate-900 px-3.5 py-2.5 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
            <span className="font-semibold text-xs">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-xs">{error}</span>
          </div>
          <button type="button" onClick={() => setError("")} className="text-rose-700 hover:text-rose-900">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Temporary Credential Alert Banner */}
      {temporaryCredential && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300/80 bg-white p-4 text-amber-950 shadow-[0_4px_16px_-4px_rgba(245,158,11,0.15)] animate-in fade-in"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                  <KeyRound className="h-3 w-3" />
                </span>
                <p className="text-xs font-extrabold text-amber-900">
                  Temporary Portal Credentials Generated for {temporaryCredential.name}
                </p>
              </div>
              <p className="text-[11px] text-amber-800">
                Share these credentials securely via private WhatsApp or SMS.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 font-mono text-xs">
                {temporaryCredential.clientCode && (
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-900 shadow-sm">
                    Code: <strong>{temporaryCredential.clientCode}</strong>
                  </span>
                )}
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-800 shadow-sm">
                  Client ID: <strong className="text-slate-900">{temporaryCredential.clientCode || temporaryCredential.clientId}</strong>
                </span>
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-black tracking-[0.2em] text-amber-900 shadow-sm">
                  MPIN: {temporaryCredential.mpin}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `Client ID: ${temporaryCredential.clientCode || temporaryCredential.clientId}\nPortal Key: ${temporaryCredential.clientId}\nTemporary MPIN: ${temporaryCredential.mpin}`,
                      `credential-${temporaryCredential.clientId}`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1 font-sans font-bold text-slate-900 text-xs shadow-sm transition-all"
                >
                  {copiedId === `credential-${temporaryCredential.clientId}` ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-slate-900" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={sendingWhatsAppId === temporaryCredential.clientId}
                  onClick={() =>
                    sendCredentialsWhatsApp(
                      {
                        id: temporaryCredential.clientId,
                        clientCode: temporaryCredential.clientCode,
                        name: temporaryCredential.name,
                      },
                      canResetMpin,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 font-sans font-bold text-emerald-900 text-xs shadow-sm transition-all disabled:opacity-60"
                >
                  {sendingWhatsAppId === temporaryCredential.clientId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span>{canResetMpin ? "Send Fresh MPIN via WhatsApp" : "Send Portal Info via WhatsApp"}</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTemporaryCredential(null)}
              aria-label="Dismiss credential"
              className="self-start md:self-center rounded-lg p-1.5 text-amber-800 hover:bg-amber-100/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Smart Navigation Tab Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
        <div className="client-mgmt-tabs-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`client-mgmt-tab-btn ${activeTab === "directory" ? "active" : ""}`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Client Directory</span>
            <span className="client-mgmt-tab-badge !bg-blue-100/80 !text-blue-800">{totalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my-requests")}
            className={`client-mgmt-tab-btn ${activeTab === "my-requests" ? "active" : ""}`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>My Requests</span>
            {myClientIdRequests.length > 0 && (
              <span
                className={`client-mgmt-tab-badge ${
                  myNeedsCorrectionCount > 0 ? "!bg-rose-100 !text-rose-800 !border !border-rose-200" : "!bg-indigo-100/80 !text-indigo-800"
                }`}
              >
                {myClientIdRequests.length}
              </span>
            )}
          </button>

          {clientIdRequests !== null && (
            <button
              type="button"
              onClick={() => setActiveTab("super-admin")}
              className={`client-mgmt-tab-btn ${activeTab === "super-admin" ? "active" : ""}`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Super Admin Queue</span>
              {superAdminPendingCount > 0 && (
                <span className="client-mgmt-tab-badge !bg-amber-100 !text-amber-800 !border !border-amber-200">
                  {superAdminPendingCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("guidelines")}
            className={`client-mgmt-tab-btn ${activeTab === "guidelines" ? "active" : ""}`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Security Guidelines</span>
          </button>
        </div>
      </div>

      {/* 4. TAB 1: CLIENT DIRECTORY */}
      {activeTab === "directory" && (
        <section className="client-mgmt-table-card">
          {/* Table Toolbar */}
          <div className="client-mgmt-toolbar">
            <div className="flex items-center gap-2">
              <div className="client-mgmt-search-box">
                <Search />
                <input
                  type="text"
                  placeholder="Search by name, phone, email, or Client ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="client-mgmt-filter-toggle"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="client-mgmt-filter-badge">{activeFilterCount}</span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">
                  {totalCount} registered client{totalCount === 1 ? "" : "s"}
                </p>
                <p className="text-[10px] text-slate-500">
                  Showing {pageStart}–{pageEnd}
                </p>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    aria-label="Previous client page"
                    onClick={() => setPage((value) => Math.max(value - 1, 1))}
                    disabled={page === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-12 px-1 text-center text-xs font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    aria-label="Next client page"
                    onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                    disabled={page === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Filter Row */}
          {showFilters && (
            <div className="client-mgmt-filters-row">
              <div className="client-mgmt-filter-group">
                <label className="client-mgmt-filter-label">
                  <ArrowUpDown className="h-3 w-3" />
                  Sort By
                </label>
                <div className="client-mgmt-filter-select-wrap">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    className="client-mgmt-filter-select"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name-asc">Name (A → Z)</option>
                    <option value="name-desc">Name (Z → A)</option>
                  </select>
                  <ChevronDown className="client-mgmt-filter-chevron" />
                </div>
              </div>

              <div className="client-mgmt-filter-group">
                <label className="client-mgmt-filter-label">
                  <Mail className="h-3 w-3" />
                  Email
                </label>
                <div className="client-mgmt-filter-select-wrap">
                  <select
                    value={filterEmail}
                    onChange={(e) => { setFilterEmail(e.target.value); setPage(1); }}
                    className="client-mgmt-filter-select"
                  >
                    <option value="">All Clients</option>
                    <option value="yes">Has Email</option>
                    <option value="no">No Email</option>
                  </select>
                  <ChevronDown className="client-mgmt-filter-chevron" />
                </div>
              </div>

              <div className="client-mgmt-filter-group">
                <label className="client-mgmt-filter-label">
                  <FileText className="h-3 w-3" />
                  Policies
                </label>
                <div className="client-mgmt-filter-select-wrap">
                  <select
                    value={filterPolicies}
                    onChange={(e) => { setFilterPolicies(e.target.value); setPage(1); }}
                    className="client-mgmt-filter-select"
                  >
                    <option value="">All Clients</option>
                    <option value="has">Has Policies (≥1)</option>
                    <option value="none">No Policies (0)</option>
                  </select>
                  <ChevronDown className="client-mgmt-filter-chevron" />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setSortBy("newest"); setFilterEmail(""); setFilterPolicies(""); setPage(1); }}
                  className="client-mgmt-filter-clear"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>
          )}

          {/* Cards List */}
          {(() => {
            const displayProfiles = filterPolicies
              ? profiles.filter((p) =>
                  filterPolicies === "has"
                    ? Number(p.policiesCount || 0) >= 1
                    : Number(p.policiesCount || 0) === 0
                )
              : profiles;
            return loading ? (
            <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-7 w-7 text-slate-700 animate-spin" />
              <p className="text-xs font-medium">Loading client portal profiles...</p>
            </div>
          ) : displayProfiles.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No client profiles found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Search with another keyword or generate a new client portal login profile.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-900 text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-slate-700" /> Create Client Login
              </button>
            </div>
          ) : (
            <div className="bg-white">
              {/* Table Column Headers */}
              <div className="client-mgmt-table-head">
                <span>Client Name</span>
                <span>Contact Person</span>
                <span>Phone Number</span>
                <span>Attached Policies</span>
                <span>Client ID</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-slate-100">
                {displayProfiles.map((profile) => (
                  <article key={profile.id} className="client-mgmt-row">
                    {/* 1. Client Name */}
                    <div className="client-mgmt-col-name min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="client-mgmt-name" title={profile.name}>
                          {profile.name}
                        </span>
                        <span className="client-mgmt-status-pill shrink-0">Active</span>
                      </div>
                      {profile.email && (
                        <span className="text-[11px] text-slate-400 truncate block mt-0.5" title={profile.email}>
                          {profile.email}
                        </span>
                      )}
                    </div>

                    {/* 2. Contact Person */}
                    <div className="client-mgmt-col-contact min-w-0">
                      <span className="text-xs font-semibold text-slate-700 truncate block" title={profile.contactPerson || "—"}>
                        {profile.contactPerson || "—"}
                      </span>
                    </div>

                    {/* 3. Phone Number */}
                    <div className="client-mgmt-col-phone min-w-0">
                      <span className="font-mono text-[13px] font-bold text-slate-900 tracking-tight">
                        {profile.phone || "—"}
                      </span>
                    </div>

                    {/* 4. Attached Policies / Accounts */}
                    <div className="client-mgmt-col-policies min-w-0">
                      <Link
                        href={`/policy-records?q=${encodeURIComponent(profile.id)}`}
                        className="client-mgmt-policy-pill"
                        title={`View policies attached to Client ID: ${profile.id}`}
                      >
                        <FileText className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>
                          {profile.policiesCount || 0} {Number(profile.policiesCount || 0) === 1 ? "Policy" : "Policies"} Attached
                        </span>
                      </Link>
                    </div>

                    {/* 5. Client ID */}
                    <div className="client-mgmt-col-id min-w-0 flex items-center gap-1.5">
                      <div className="min-w-0">
                        {profile.clientCode ? (
                          <span className="inline-block rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-emerald-900 mr-1.5">
                            {profile.clientCode}
                          </span>
                        ) : null}
                        <span className="client-mgmt-id-text" title={profile.id}>
                          {profile.id}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(profile.clientCode || profile.id, profile.id)}
                        className="client-mgmt-id-copy"
                        title={`Copy ${profile.clientCode || "Client ID"}`}
                        aria-label="Copy Client ID"
                      >
                        {copiedId === profile.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-slate-900 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-900">Copied!</span>
                          </>
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-500 hover:text-slate-900 shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* 5. Actions Dropdown */}
                    <div className="client-mgmt-actions relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenuId(openActionMenuId === profile.id ? "" : profile.id);
                        }}
                        className="client-mgmt-more-btn"
                        title="More Actions"
                        aria-label="More Actions"
                      >
                        <span className="client-mgmt-dots-icon" aria-hidden="true">
                          <span className="client-mgmt-dot" />
                          <span className="client-mgmt-dot" />
                          <span className="client-mgmt-dot" />
                        </span>
                      </button>

                      {openActionMenuId === profile.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setOpenActionMenuId("")}
                          />
                          <div className="client-mgmt-action-popover z-30">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId("");
                                handleOpenEditModal(profile);
                              }}
                              className="client-mgmt-popover-item"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                              <span>Edit Profile</span>
                            </button>
                            <button
                              type="button"
                              disabled={sendingWhatsAppId === profile.id}
                              onClick={() => {
                                setOpenActionMenuId("");
                                sendCredentialsWhatsApp(profile, false);
                              }}
                              className="client-mgmt-popover-item text-emerald-700 hover:text-emerald-900"
                            >
                              <Send className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Send Login on WhatsApp</span>
                            </button>
                            {canResetMpin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId("");
                                  resetClientMpin(profile);
                                }}
                                className="client-mgmt-popover-item text-amber-700 hover:text-amber-900"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span>Reset MPIN</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
          })()}
          {/* Pagination Footer */}
          {totalPages > 1 && (
            <nav
              aria-label="Client pagination"
              className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row"
            >
              <p className="text-xs font-medium text-slate-500">
                Showing <strong className="text-slate-800">{pageStart}–{pageEnd}</strong> of{" "}
                <strong className="text-slate-800">{totalCount}</strong> clients
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(value - 1, 1))}
                  disabled={page === 1}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {paginationPages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                    className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                      pageNumber === page
                        ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                  disabled={page === totalPages}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </nav>
          )}
        </section>
      )}

      {/* 5. TAB 2: MY CLIENT ID REQUESTS */}
      {activeTab === "my-requests" && (
        <section className="client-mgmt-table-card">
          {/* Table Toolbar */}
          <div className="client-mgmt-toolbar">
            <div className="flex flex-wrap items-center gap-2">
              <div className="client-mgmt-search-box">
                <Search />
                <input
                  type="text"
                  placeholder="Search requests by name, phone, email, or Request ID..."
                  value={myRequestsSearch}
                  onChange={(e) => {
                    setMyRequestsSearch(e.target.value);
                    setMyRequestsPage(1);
                  }}
                />
                {myRequestsSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setMyRequestsSearch("");
                      setMyRequestsPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setMyRequestsFilter("ALL"); setMyRequestsPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    myRequestsFilter === "ALL"
                      ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  All ({myClientIdRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMyRequestsFilter("PENDING"); setMyRequestsPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    myRequestsFilter === "PENDING"
                      ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Pending ({myPendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => { setMyRequestsFilter("WAITING_DOCUMENTS"); setMyRequestsPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    myRequestsFilter === "WAITING_DOCUMENTS"
                      ? "border-2 border-rose-600 bg-white text-rose-700 font-extrabold shadow-sm"
                      : "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                  }`}
                >
                  Correction Needed ({myNeedsCorrectionCount})
                </button>
                {myCompletedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { setMyRequestsFilter("COMPLETED"); setMyRequestsPage(1); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      myRequestsFilter === "COMPLETED"
                        ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    Completed ({myCompletedCount})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">
                  {filteredMyRequests.length} request{filteredMyRequests.length === 1 ? "" : "s"}
                </p>
                <p className="text-[10px] text-slate-500">
                  Showing {myRequestsPageStart}–{myRequestsPageEnd}
                </p>
              </div>

              {myRequestsTotalPages > 1 && (
                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    aria-label="Previous request page"
                    onClick={() => setMyRequestsPage((value) => Math.max(value - 1, 1))}
                    disabled={myRequestsPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-12 px-1 text-center text-xs font-bold text-slate-700">
                    {myRequestsPage} / {myRequestsTotalPages}
                  </span>
                  <button
                    type="button"
                    aria-label="Next request page"
                    onClick={() => setMyRequestsPage((value) => Math.min(value + 1, myRequestsTotalPages))}
                    disabled={myRequestsPage === myRequestsTotalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Content */}
          {myRequestsLoading ? (
            <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-7 w-7 text-slate-700 animate-spin" />
              <p className="text-xs font-medium">Loading your submitted requests...</p>
            </div>
          ) : filteredMyRequests.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CheckCircle2 className="h-6 w-6 text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {myRequestsSearch || myRequestsFilter !== "ALL"
                  ? "No matching requests found"
                  : "All Client ID Requests Cleared"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {myRequestsSearch || myRequestsFilter !== "ALL"
                  ? "Try adjusting your search terms or filter selection."
                  : "You currently have no pending or blocked Client ID requests."}
              </p>
            </div>
          ) : (
            <div className="bg-white">
              {/* Table Column Headers */}
              <div className="client-mgmt-req-table-head">
                <span>Client Name</span>
                <span>Phone Number</span>
                <span>Attached Policies</span>
                <span>Request ID</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-slate-100">
                {paginatedMyRequests.map((item) => (
                  <article
                    key={item.id}
                    className={`client-mgmt-req-row ${item.status === "WAITING_DOCUMENTS" ? "needs-correction" : ""}`}
                  >
                    {/* 1. Client Name */}
                    <div className="min-w-0">
                      <strong className="block truncate text-[13px] font-bold text-slate-900" title={item.name}>
                        {item.name}
                      </strong>
                      {item.email && (
                        <span className="block truncate text-[11px] text-slate-400" title={item.email}>
                          {item.email}
                        </span>
                      )}
                    </div>

                    {/* 2. Phone Number */}
                    <div className="min-w-0">
                      <span className="font-mono text-[13px] font-bold text-slate-900 tracking-tight">
                        {item.phone || "—"}
                      </span>
                    </div>

                    {/* 3. Attached Policies */}
                    <div className="min-w-0">
                      <span
                        className="client-mgmt-policy-pill"
                        title={
                          item.policies?.length
                            ? item.policies.map((p) => p.policyNumber || p.sourceFile).join(", ")
                            : "Number of attached policies"
                        }
                      >
                        <FileText className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>
                          {item.policies?.length || 0} {Number(item.policies?.length || 0) === 1 ? "Policy" : "Policies"} Attached
                        </span>
                      </span>
                    </div>

                    {/* 4. Request ID */}
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="client-mgmt-id-text" title={item.id}>
                        {item.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id)}
                        className="client-mgmt-id-copy"
                        title="Copy Request ID"
                        aria-label="Copy Request ID"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-slate-900 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-900">Copied!</span>
                          </>
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-500 hover:text-slate-900 shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* 5. Status Badge */}
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          item.status === "WAITING_DOCUMENTS"
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : item.status === "COMPLETED"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {item.status === "WAITING_DOCUMENTS"
                          ? "Action Required: Correction"
                          : item.status === "COMPLETED"
                            ? "Completed"
                            : "Pending Super Admin"}
                      </span>

                      {item.correctionNote && (
                        <div className="mt-1.5 rounded-lg border border-rose-200 bg-rose-50/90 p-2 text-[11px] font-semibold text-rose-800 flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Super Admin Instruction: </span>
                            <span>{item.correctionNote}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 6. Action */}
                    <div className="flex items-center justify-end">
                      {item.status === "WAITING_DOCUMENTS" ? (
                        <button
                          type="button"
                          onClick={() => openCorrectionPanel(item)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-slate-400 px-3 py-1.5 text-xs font-bold shadow-sm transition-all whitespace-nowrap"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-700" /> Correct & Resubmit
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">—</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          {myRequestsTotalPages > 1 && (
            <nav
              aria-label="My Requests pagination"
              className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row"
            >
              <p className="text-xs font-medium text-slate-500">
                Showing <strong className="text-slate-800">{myRequestsPageStart}–{myRequestsPageEnd}</strong> of{" "}
                <strong className="text-slate-800">{filteredMyRequests.length}</strong> requests
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMyRequestsPage((value) => Math.max(value - 1, 1))}
                  disabled={myRequestsPage === 1}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {myRequestsPaginationPages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setMyRequestsPage(pageNumber)}
                    aria-current={pageNumber === myRequestsPage ? "page" : undefined}
                    className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                      pageNumber === myRequestsPage
                        ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMyRequestsPage((value) => Math.min(value + 1, myRequestsTotalPages))}
                  disabled={myRequestsPage === myRequestsTotalPages}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </nav>
          )}
        </section>
      )}

      {/* 6. TAB 3: SUPER ADMIN REVIEW QUEUE */}
      {activeTab === "super-admin" && clientIdRequests !== null && (
        <section className="client-mgmt-table-card">
          {/* Table Toolbar */}
          <div className="client-mgmt-toolbar">
            <div className="flex flex-wrap items-center gap-2">
              <div className="client-mgmt-search-box">
                <Search />
                <input
                  type="text"
                  placeholder="Search queue by client name, phone, email, agent, or Request ID..."
                  value={superAdminSearch}
                  onChange={(e) => {
                    setSuperAdminSearch(e.target.value);
                    setSuperAdminPage(1);
                  }}
                />
                {superAdminSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuperAdminSearch("");
                      setSuperAdminPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setSuperAdminFilter("ALL"); setSuperAdminPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    superAdminFilter === "ALL"
                      ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  All Pending ({superAdminRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setSuperAdminFilter("PENDING"); setSuperAdminPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    superAdminFilter === "PENDING"
                      ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Ready for Review ({superAdminStrictPendingCount})
                </button>
                {superAdminWithSuggestionsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSuperAdminFilter("HAS_SUGGESTIONS"); setSuperAdminPage(1); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      superAdminFilter === "HAS_SUGGESTIONS"
                        ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    With Match Suggestions ({superAdminWithSuggestionsCount})
                  </button>
                )}
                {superAdminWaitingCorrectionCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSuperAdminFilter("WAITING_DOCUMENTS"); setSuperAdminPage(1); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      superAdminFilter === "WAITING_DOCUMENTS"
                        ? "border-2 border-rose-600 bg-white text-rose-700 font-extrabold shadow-sm"
                        : "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                    }`}
                  >
                    Correction Requested ({superAdminWaitingCorrectionCount})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">
                  {filteredSuperAdminRequests.length} request{filteredSuperAdminRequests.length === 1 ? "" : "s"}
                </p>
                <p className="text-[10px] text-slate-500">
                  Showing {superAdminPageStart}–{superAdminPageEnd}
                </p>
              </div>

              {superAdminTotalPages > 1 && (
                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    aria-label="Previous super admin page"
                    onClick={() => setSuperAdminPage((value) => Math.max(value - 1, 1))}
                    disabled={superAdminPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-12 px-1 text-center text-xs font-bold text-slate-700">
                    {superAdminPage} / {superAdminTotalPages}
                  </span>
                  <button
                    type="button"
                    aria-label="Next super admin page"
                    onClick={() => setSuperAdminPage((value) => Math.min(value + 1, superAdminTotalPages))}
                    disabled={superAdminPage === superAdminTotalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Queue Content */}
          {requestQueueLoading ? (
            <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-7 w-7 text-slate-700 animate-spin" />
              <p className="text-xs font-medium">Loading review queue...</p>
            </div>
          ) : filteredSuperAdminRequests.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CheckCircle2 className="h-6 w-6 text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {superAdminSearch || superAdminFilter !== "ALL"
                  ? "No matching review requests found"
                  : "Super Admin Queue is Empty"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {superAdminSearch || superAdminFilter !== "ALL"
                  ? "Try adjusting your search query or filter selection."
                  : "All client creation requests have been verified and processed."}
              </p>
            </div>
          ) : (
            <div className="bg-white">
              {/* Table Column Headers */}
              <div className="client-mgmt-admin-table-head">
                <span>Client & Submitter</span>
                <span>Attached Policies</span>
                <span>Duplicate Matches</span>
                <span>Status</span>
                <span className="text-right">Review Actions</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-slate-100">
                {paginatedSuperAdminRequests.map((item) => {
                  const isNeedsCorrection = item.status === "WAITING_DOCUMENTS" || item.workflowStatus === "NEEDS_CORRECTION";
                  return (
                    <article
                      key={item.id}
                      className={`client-mgmt-admin-row ${isNeedsCorrection ? "waiting-correction" : ""}`}
                    >
                      {/* 1. Client & Submitter */}
                      <div className="min-w-0 space-y-1">
                        <strong className="block truncate text-[13px] font-extrabold text-slate-900" title={item.name}>
                          {item.name}
                        </strong>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
                          <span className="font-mono font-bold text-slate-900 inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {item.phone}
                          </span>
                          {item.email && (
                            <span className="text-slate-500 inline-flex items-center gap-1 truncate max-w-[140px]" title={item.email}>
                              <Mail className="h-3 w-3 text-slate-400" />
                              {item.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>By: <strong className="text-slate-600">{item.requestedByName || item.requestedByEmail || "Agent"}</strong></span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">ID: {item.id.slice(0, 8)}...</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.id)}
                            className="client-mgmt-id-copy"
                            title="Copy Request ID"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3 w-3 text-slate-900" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-400 hover:text-slate-900" />
                            )}
                          </button>
                        </div>
                        {item.correctionNote && (
                          <div className="mt-1 rounded-lg border border-rose-200 bg-rose-50/90 p-1.5 text-[11px] font-semibold text-rose-800 flex items-start gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{item.correctionNote}</span>
                          </div>
                        )}
                      </div>

                      {/* 2. Attached Policies */}
                      <div className="min-w-0 space-y-1">
                        <span
                          className="client-mgmt-policy-pill"
                          title={
                            item.policies?.length
                              ? item.policies.map((p) => p.policyNumber || p.sourceFile).join(", ")
                              : "Number of attached policies"
                          }
                        >
                          <FileText className="h-3 w-3 text-slate-500 shrink-0" />
                          <span>
                            {item.policies?.length || 0} {Number(item.policies?.length || 0) === 1 ? "Policy" : "Policies"}
                          </span>
                        </span>
                        {item.policies && item.policies.length > 0 && (
                          <div className="font-mono text-[10px] text-slate-500 truncate max-w-[150px]" title={item.policies[0].policyNumber || item.policies[0].sourceFile}>
                            {item.policies[0].policyNumber || item.policies[0].sourceFile}
                          </div>
                        )}
                      </div>

                      {/* 3. Duplicate Matches */}
                      <div className="min-w-0">
                        {isNeedsCorrection ? (
                          <span className="text-[11px] text-slate-500 italic">Waiting for agent</span>
                        ) : item.suggestions && item.suggestions.length > 0 ? (
                          <div className="space-y-1">
                            {item.suggestions.slice(0, 1).map((client) => (
                              <div
                                key={client.id}
                                className="rounded-lg border border-slate-200 bg-slate-50/80 p-1.5 text-xs flex items-center justify-between gap-1.5"
                              >
                                <div className="min-w-0">
                                  <strong className="block truncate text-[11px] text-slate-800" title={client.name}>
                                    {client.name}
                                  </strong>
                                  <span className="font-mono text-[10px] text-slate-500">{client.phone}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openExistingClientModal(item, client.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm shrink-0"
                                >
                                  <Link2 className="h-2.5 w-2.5" /> Link
                                </button>
                              </div>
                            ))}
                            {item.suggestions.length > 1 && (
                              <span className="text-[10px] text-slate-400 font-medium">+{item.suggestions.length - 1} more match</span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
                            ✓ No Duplicates
                          </span>
                        )}
                      </div>

                      {/* 4. Status Badge */}
                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                            isNeedsCorrection
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isNeedsCorrection ? "Correction Requested" : "Pending Review"}
                        </span>
                      </div>

                      {/* 5. Review Actions (3-Dot Action Menu) */}
                      <div className="client-mgmt-actions relative flex items-center justify-end">
                        {!isNeedsCorrection ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === item.id ? "" : item.id);
                              }}
                              className="client-mgmt-more-btn"
                              title="Review Actions"
                              aria-label="Review Actions"
                            >
                              <span className="client-mgmt-dots-icon" aria-hidden="true">
                                <span className="client-mgmt-dot" />
                                <span className="client-mgmt-dot" />
                                <span className="client-mgmt-dot" />
                              </span>
                            </button>

                            {openActionMenuId === item.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setOpenActionMenuId("")}
                                />
                                <div className="client-mgmt-action-popover z-30 min-w-[180px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId("");
                                      openCreateClientModal(item);
                                    }}
                                    disabled={resolvingRequestId === item.id}
                                    className="client-mgmt-popover-item"
                                  >
                                    <UserPlus className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                                    <span>Issue New Client ID</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId("");
                                      openExistingClientModal(item);
                                    }}
                                    className="client-mgmt-popover-item"
                                  >
                                    <Link2 className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                                    <span>Link Existing ID</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId("");
                                      openDecisionModal(item, "NEEDS_CORRECTION");
                                    }}
                                    className="client-mgmt-popover-item text-rose-700 hover:bg-rose-50"
                                  >
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                    <span>Request Correction</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId("");
                                      openDecisionModal(item, "REJECT");
                                    }}
                                    className="client-mgmt-popover-item text-slate-600 hover:bg-slate-100"
                                  >
                                    <X className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                    <span>Reject Request</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">Waiting for agent</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          {superAdminTotalPages > 1 && (
            <nav
              aria-label="Super Admin pagination"
              className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row"
            >
              <p className="text-xs font-medium text-slate-500">
                Showing <strong className="text-slate-800">{superAdminPageStart}–{superAdminPageEnd}</strong> of{" "}
                <strong className="text-slate-800">{filteredSuperAdminRequests.length}</strong> requests
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSuperAdminPage((value) => Math.max(value - 1, 1))}
                  disabled={superAdminPage === 1}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {superAdminPaginationPages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setSuperAdminPage(pageNumber)}
                    aria-current={pageNumber === superAdminPage ? "page" : undefined}
                    className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                      pageNumber === superAdminPage
                        ? "border-2 border-slate-900 bg-white text-slate-900 font-extrabold shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSuperAdminPage((value) => Math.min(value + 1, superAdminTotalPages))}
                  disabled={superAdminPage === superAdminTotalPages}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </nav>
          )}
        </section>
      )}

      {/* 7. TAB 4: SECURITY & GUIDELINES */}
      {activeTab === "guidelines" && (
        <section className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Unique Client ID Key</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                The Client ID is an automated, immutable identification string generated for every customer profile. It links all motor, health, and commercial policies to one unified client view.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Private Portal MPIN</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Credentials should be treated as private. When generating or resetting MPINs, distribute them directly to the client. Clients can securely modify their MPIN once authenticated.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Audit & Governance</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every request, policy attachment, and MPIN reset is timestamped and recorded under the audit trail to maintain enterprise security and data integrity.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODALS & PORTALS (Rendered directly under document.body via ModalPortal) */}
      {/* ========================================================================= */}

      {/* CREATE & EDIT CLIENT MODAL */}
      {isModalOpen && (
        <ModalPortal>
          <div className="client-management-modal-shell">
            <div className="client-management-modal-backdrop absolute inset-0" onClick={() => setIsModalOpen(false)} />
            <div
              className="client-management-modal-card bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
              role="dialog"
              aria-modal="true"
            >
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  {modalMode === "create" ? "Generate Client Portal Login" : "Edit Portal Credentials"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl space-y-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                    {formConflicts.length > 0 && (
                      <div className="space-y-1.5 border-t border-rose-200 pt-2">
                        <p className="text-[11px] font-bold text-rose-900">Existing accounts using this phone:</p>
                        {formConflicts.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-rose-200 text-[11px] text-slate-800">
                            <span><strong>{c.name}</strong> · {c.clientCode || c.phone}</span>
                            {modalMode === "create" && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(c)}
                                className="text-emerald-700 font-bold hover:underline"
                              >
                                Edit existing
                              </button>
                            )}
                          </div>
                        ))}
                        {canResetMpin && (
                          <label className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-900 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formAllowSharedPhone}
                              onChange={(e) => setFormAllowSharedPhone(e.target.checked)}
                            />
                            <span>Confirm Shared Mobile Number (issue separate Client ID for distinct entity)</span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={formSubmitting}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={formSubmitting}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-100"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={formSubmitting}
                  />
                </div>

                {modalMode === "edit" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                    Client ID (Permanent Key):{" "}
                    <strong className="font-mono text-slate-700 block mt-0.5">{selectedProfileId}</strong>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                    disabled={formSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-slate-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
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

      {/* RESOLUTION MODAL (LINK EXISTING VS CREATE NEW) */}
      {resolutionRequest && (
        <ModalPortal>
          <div className="client-management-modal-shell">
            <button
              type="button"
              aria-label="Close Client ID resolution"
              className="client-management-modal-backdrop absolute inset-0"
              onClick={() => setResolutionRequest(null)}
            />
            <div
              className="client-management-modal-card rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {resolutionAction === "CREATE_NEW" ? "Confirm New Client ID" : "Link Existing Client ID"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Request for {resolutionRequest.name} · {resolutionRequest.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResolutionRequest(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {resolutionAction === "LINK_EXISTING" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Search Existing Clients
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={resolutionSearch}
                          onChange={(event) => setResolutionSearch(event.target.value)}
                          placeholder="Search name, phone or email..."
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100"
                        />
                      </div>
                      {resolutionSearching && <p className="mt-2 text-xs text-slate-500">Searching...</p>}
                      {resolutionResults.length > 0 && (
                        <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1 bg-slate-50/50">
                          {resolutionResults.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => setResolutionClientId(client.id)}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-100 transition-colors"
                            >
                              <span>
                                <strong className="block text-xs text-slate-800">{client.name}</strong>
                                <span className="text-[11px] text-slate-500">{client.phone}</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-900">Select</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Existing Client ID Key
                    </label>
                    <input
                      type="text"
                      value={resolutionClientId}
                      onChange={(event) => setResolutionClientId(event.target.value.trim())}
                      placeholder="Paste the complete Client ID"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-slate-700">
                    <p className="font-bold text-slate-900">Review Before Issuing Profile</p>
                    <dl className="mt-3 grid grid-cols-[90px_1fr] gap-2 text-xs">
                      <dt className="text-slate-500">Name</dt>
                      <dd className="font-semibold text-slate-900">{resolutionRequest.name}</dd>
                      <dt className="text-slate-500">Phone</dt>
                      <dd className="font-semibold text-slate-900">{resolutionRequest.phone}</dd>
                      <dt className="text-slate-500">Email</dt>
                      <dd className="font-semibold text-slate-900">{resolutionRequest.email || "Not provided"}</dd>
                      <dt className="text-slate-500">Policies</dt>
                      <dd className="font-semibold text-slate-900">{resolutionRequest.policies?.length || 0}</dd>
                    </dl>
                    <p className="mt-3 text-xs text-amber-800">
                      Confirm only after checking that no valid existing client is available in the directory.
                    </p>
                    <label className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resolutionAllowSharedPhone}
                        onChange={(e) => setResolutionAllowSharedPhone(e.target.checked)}
                      />
                      <span>Allow shared mobile number if another client already uses this phone</span>
                    </label>
                  </div>
                )}

                {resolutionError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {resolutionError}
                    </div>
                    {resolutionConflicts.length > 0 && (
                      <div className="space-y-1.5 border-t border-rose-200 pt-2">
                        <p className="text-[11px] font-bold text-rose-900">Accounts sharing this phone:</p>
                        {resolutionConflicts.map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-rose-200 text-[11px] text-slate-800">
                            <span><strong>{c.name}</strong> · {c.clientCode || c.phone}</span>
                            <button
                              type="button"
                              onClick={() => openExistingClientModal(resolutionRequest, c.id)}
                              className="text-emerald-700 font-bold hover:underline"
                            >
                              Link to this Client
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResolutionRequest(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      (resolutionAction === "LINK_EXISTING" && !resolutionClientId) ||
                      resolvingRequestId === resolutionRequest.id
                    }
                    onClick={() =>
                      resolveClientIdRequest(resolutionRequest, resolutionAction, resolutionClientId)
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-slate-400 px-4 py-2.5 text-xs font-bold disabled:opacity-50 shadow-sm"
                  >
                    {resolvingRequestId === resolutionRequest.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {resolutionAction === "CREATE_NEW"
                      ? "Confirm & Create Client ID"
                      : "Confirm & Link Client ID"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DECISION MODAL (NEEDS CORRECTION VS REJECT) */}
      {decisionRequest && (
        <ModalPortal>
          <div className="client-management-modal-shell">
            <button
              type="button"
              aria-label="Close decision dialog"
              className="client-management-modal-backdrop absolute inset-0"
              onClick={() => setDecisionRequest(null)}
            />
            <div
              className="client-management-modal-card rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {decisionAction === "REJECT" ? "Reject Request" : "Request Correction"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    The Request ID and attached policies will remain intact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDecisionRequest(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Correction Note for Agent *
                  </label>
                  <textarea
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    rows={4}
                    placeholder="Explain clearly what the agent needs to correct..."
                    className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {resolutionError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    {resolutionError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDecisionRequest(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!decisionNote.trim() || resolvingRequestId === decisionRequest.id}
                    onClick={() =>
                      submitRequestAction({
                        request: decisionRequest,
                        action: decisionAction,
                        note: decisionNote,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-slate-400 px-4 py-2.5 text-xs font-bold disabled:opacity-50 shadow-sm"
                  >
                    {resolvingRequestId === decisionRequest.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>Confirm Action</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* CORRECTION & RESUBMISSION MODAL */}
      {correctionRequest && (
        <ModalPortal>
          <div className="client-management-modal-shell">
            <button
              type="button"
              aria-label="Close correction panel"
              className="client-management-modal-backdrop absolute inset-0"
              onClick={() => setCorrectionRequest(null)}
            />
            <div
              className="client-management-modal-card rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Correct & Resubmit Client ID Request</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    Request ID: {correctionRequest.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCorrectionRequest(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {correctionRequest.correctionNote && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
                    <strong className="block font-bold">Super Admin Instruction:</strong>
                    <p>{correctionRequest.correctionNote}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Client Full Name *</label>
                  <input
                    value={correctionName}
                    onChange={(event) => setCorrectionName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Phone Number *</label>
                  <input
                    value={correctionPhone}
                    onChange={(event) => setCorrectionPhone(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    value={correctionEmail}
                    onChange={(event) => setCorrectionEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {resolutionError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    {resolutionError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionRequest(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      !correctionName.trim() ||
                      !correctionPhone.trim() ||
                      resolvingRequestId === correctionRequest.id
                    }
                    onClick={() =>
                      submitRequestAction({
                        request: correctionRequest,
                        action: "RESUBMIT",
                        identity: { name: correctionName, phone: correctionPhone, email: correctionEmail },
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-slate-400 px-4 py-2.5 text-xs font-bold disabled:opacity-50 shadow-sm"
                  >
                    {resolvingRequestId === correctionRequest.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 text-slate-700" />
                    )}
                    <span>Resubmit Request</span>
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
