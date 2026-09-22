"use client";

import { useEffect, useState, use, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import ModalPortal from "@/app/components/shared/ModalPortal";
import {
  Phone,
  MessageSquare,
  MessageCircle,
  ArrowLeft,
  MoreVertical,
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  UserPlus,
  Send,
  Clipboard,
  User,
  Building2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  MapPin,
  Shield,
  Tag,
  Users,
  Upload,
  ZoomIn,
  X,
  FileText,
} from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import WhatsAppContactCard from "@/app/components/renewals/WhatsAppContactCard";
import { showToast } from "@/app/components/shared/ToastProvider";
import WhatsAppRecipientPicker from "@/app/components/whatsapp/WhatsAppRecipientPicker";

const COL_HEADERS = [
  "Policy Number",
  "Company Name",
  "Insurance Company",
  "Policy Type",
  "Premium",
  "Sum Insured / IDV",
  "Make / Model",
  "Expiry Date",
  "Days Left",
  "WhatsApp Status",
  "Renewal Status",
  "Actions",
];

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const baseDate = `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
    const hasTime = String(dateStr).includes(":") || (String(dateStr).includes("T") && String(dateStr).length > 10);
    if (hasTime) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${baseDate} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    }
    return baseDate;
  } catch {
    return dateStr;
  }
};

const formatPremium = (val) => {
  if (!val) return "₹0";
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return `₹${val}`;
  return `₹${num.toLocaleString("en-IN")}`;
};

const getDaysClass = (days) => {
  if (days === undefined || days === null) return "";
  if (days < 0) return "rn-days-overdue";
  if (days === 0) return "rn-days-today";
  if (days <= 7) return "rn-days-urgent";
  return "rn-days-normal";
};

const getDaysText = (days) => {
  if (days === undefined || days === null) return "-";
  return `${Number(days)} day${Math.abs(Number(days)) === 1 ? "" : "s"}`;
};

const getRenewalToneClass = (value = "") => {
  const status = String(value).toLowerCase();
  if (status.includes("renew") || status.includes("active")) return "tone-success";
  if (
    status.includes("lost") ||
    status.includes("wrong") ||
    status.includes("not_interested") ||
    status.includes("not interested") ||
    status.includes("expired") ||
    status.includes("overdue")
  )
    return "tone-danger";
  if (status.includes("follow") || status.includes("due") || status.includes("call")) return "tone-warning";
  if (status.includes("new") || status.includes("interest")) return "tone-info";
  return "tone-neutral";
};

export default function CustomerProfilePage(props) {
  const params = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = params.id;
  const requestedPolicyId = searchParams.get("policyId") || "";
  const requestedAction = searchParams.get("action") || "";
  const returnTo = searchParams.get("returnTo") || "/dashboard/renewals/customers";
  const goBackToPortfolios = () => router.push(returnTo);

  // Data state
  const [profile, setProfile] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    totalPremium: 0,
    totalSumInsured: 0,
    totalPolicies: 0,
    policiesDue: 0,
    totalCompanies: 0,
  });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineFilters, setTimelineFilters] = useState({ q: "", status: "", policy: "", date: "" });
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  // Single vs Multi Policy toggle mode
  const [policyViewMode, setPolicyViewMode] = useState(() => (requestedPolicyId ? "single" : "all"));
  const [selectedSinglePolicyId, setSelectedSinglePolicyId] = useState(requestedPolicyId || "");

  useEffect(() => {
    if (requestedPolicyId) {
      setSelectedSinglePolicyId(requestedPolicyId);
      setPolicyViewMode("single");
    }
  }, [requestedPolicyId]);

  const displayedPolicies = useMemo(() => {
    if (policyViewMode === "single" && policies.length > 0) {
      const targetId = selectedSinglePolicyId || requestedPolicyId;
      if (targetId) {
        const matched = policies.filter((p) => String(p.id) === String(targetId));
        if (matched.length > 0) return matched;
      }
      return [policies[0]];
    }
    return policies;
  }, [policies, policyViewMode, selectedSinglePolicyId, requestedPolicyId]);

  // Modals state
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [whatsappPreviewOpen, setWhatsAppPreviewOpen] = useState(false);

  // Lazy load side drawer state
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileDrawerLoading, setProfileDrawerLoading] = useState(false);
  const [profileDrawerData, setProfileDrawerData] = useState(null);
  const [profileAuditLogs, setProfileAuditLogs] = useState([]);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const resizeCleanupRef = useRef(() => {});

  useEffect(() => () => resizeCleanupRef.current(), []);

  // Forms states
  const [remarkForm, setRemarkForm] = useState({
    text: "",
    nextFollowUpDate: "",
    status: "Follow-Up",
    mode: "Call",
    priority: "Normal",
    nextAction: "",
  });
  const [editForm, setEditForm] = useState({
    insuredName: "",
    contactPersonName: "",
    contactNumber: "",
    contactPersonEmail: "",
    renewalRecipientName: "",
    renewalRecipientMobile: "",
    renewalRecipientEmail: "",
    contactUpdateMode: "policy_only",
    targetPortfolioId: "",
    newPortfolioName: "",
    newPortfolioMobile: "",
    newPortfolioEmail: "",
    policyNumber: "",
    insuranceCompany: "",
    policyType: "",
    premium: "",
    expiryDate: "",
    assignedToUserId: "",
    renewalStatus: "ACTIVE",
    remark: "",
    nextFollowUpDate: "",
  });
  const [renewForm, setRenewForm] = useState({
    policyNumber: "",
    startDate: "",
    expiryDate: "",
    premium: "",
    remark: "",
  });
  const [lostForm, setLostForm] = useState({ lostReason: "Premium High", remarks: "" });
  const [reassignForm, setReassignForm] = useState({ assignedToUserId: "", note: "" });
  const [whatsappTemplates, setWhatsAppTemplates] = useState(null);
  const [whatsappCustomFields, setWhatsAppCustomFields] = useState([]);
  const [whatsappPreviewView, setWhatsAppPreviewView] = useState("message");
  const [selectedTemplateType, setSelectedTemplateType] = useState("due_soon");
  const [editedWhatsAppMessage, setEditedWhatsAppMessage] = useState("");
  const [whatsappPhone, setWhatsAppPhone] = useState("");
  const [whatsappPolicyId, setWhatsAppPolicyId] = useState("");
  const [whatsappRecipientGroups, setWhatsAppRecipientGroups] = useState([]);
  const [whatsappContactDetails, setWhatsAppContactDetails] = useState(null);
  const [whatsappRecipientType, setWhatsAppRecipientType] = useState("individual");
  const [whatsappGroupId, setWhatsAppGroupId] = useState("");
  const [renewalQuotes, setRenewalQuotes] = useState([]);
  const [renewalQuotesLoading, setRenewalQuotesLoading] = useState(false);
  const [selectedRenewalQuoteIds, setSelectedRenewalQuoteIds] = useState([]);
  const [showAddQuoteForm, setShowAddQuoteForm] = useState(false);
  const [manualQuoteText, setManualQuoteText] = useState("");
  const [manualQuoteFileBase64, setManualQuoteFileBase64] = useState("");
  const [manualQuoteFileName, setManualQuoteFileName] = useState("");
  const [previewQuoteImage, setPreviewQuoteImage] = useState(null);
  const [savingManualQuote, setSavingManualQuote] = useState(false);
  const [allGroupQuotes, setAllGroupQuotes] = useState([]);
  const [loadingAllGroupQuotes, setLoadingAllGroupQuotes] = useState(false);
  const [showGroupGalleryModal, setShowGroupGalleryModal] = useState(false);

  const [teamMembers, setTeamMembers] = useState([]);
  const [portfolioOptions, setPortfolioOptions] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const profileRequestRef = useRef(null);
  const teamRequestRef = useRef(null);
  const portfolioRequestRef = useRef(null);
  const teamLoadedRef = useRef(false);
  const portfoliosLoadedRef = useRef(false);
  const openedRequestedAction = useRef("");

  // Resizable columns
  const STORAGE_KEY = "rn-contact-policies-col-widths-v2";
  const DEFAULT_WIDTHS = [135, 160, 145, 120, 95, 110, 100, 105, 90, 125, 120, 70];
  const [colWidths, setColWidths] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTHS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === DEFAULT_WIDTHS.length &&
          parsed.every((w) => typeof w === "number" && !isNaN(w) && w > 0)
        ) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_WIDTHS;
  });

  const handleResizeStart = (index, e) => {
    resizeCleanupRef.current();
    e.preventDefault();
    const startX = e.clientX;
    const headerEl = e.target.closest("th");
    const startWidth = headerEl ? headerEl.getBoundingClientRect().width : colWidths[index];
    const handle = e.target;
    handle.classList.add("resizing");
    const onMove = (moveE) => {
      const diff = moveE.clientX - startX;
      const newWidth = Math.max(40, startWidth + diff);
      setColWidths((prev) => {
        const next = [...prev];
        next[index] = newWidth;
        return next;
      });
    };
    const cleanup = () => {
      handle.classList.remove("resizing");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      resizeCleanupRef.current = () => {};
    };
    const onUp = () => {
      cleanup();
      setColWidths((prev) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
        } catch {}
        return prev;
      });
    };
    resizeCleanupRef.current = cleanup;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const openActionMenu = (rowId, event) => {
    event.stopPropagation();

    if (activeDropdownRowId === rowId) {
      setActiveDropdownRowId(null);
      setDropdownPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 304;
    const gap = 6;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const preferredLeft = rect.left + rect.width - menuWidth;
    const left = Math.min(viewportWidth - menuWidth - 12, Math.max(12, preferredLeft));
    const opensUp = window.innerHeight - rect.bottom < menuHeight + 16;
    const top = opensUp ? Math.max(12, rect.top - menuHeight - gap) : rect.bottom + gap;

    setDropdownPosition({ top, left, width: menuWidth });
    setActiveDropdownRowId(rowId);
  };

  const closeActionMenu = () => {
    setActiveDropdownRowId(null);
    setDropdownPosition(null);
  };

  const fetchCustomerProfile = async () => {
    profileRequestRef.current?.abort();
    const controller = new window.AbortController();
    profileRequestRef.current = controller;

    try {
      setLoading(true);
      const policyQuery = requestedPolicyId ? `?policyId=${encodeURIComponent(requestedPolicyId)}` : "";
      const res = await fetch(`/api/renewals/customers/${phone}${policyQuery}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await res.json();
      if (profileRequestRef.current === controller && !controller.signal.aborted && res.ok && data.success) {
        setProfile(data.profile);
        setPolicies(data.policies || []);
        setCompanies(data.companies || []);
        setStats(data.stats);
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Failed to load customer profile details:", error);
    } finally {
      if (profileRequestRef.current === controller) {
        profileRequestRef.current = null;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchCustomerProfile();
    return () => profileRequestRef.current?.abort();
  }, [phone, requestedPolicyId]);

  const loadTeamMembers = async () => {
    if (teamLoadedRef.current || teamRequestRef.current) return;
    const controller = new window.AbortController();
    teamRequestRef.current = controller;
    try {
      const res = await fetch("/api/renewals/team", { signal: controller.signal });
      const data = await res.json();
      if (res.ok && data.users && !controller.signal.aborted) {
        setTeamMembers(data.users);
        teamLoadedRef.current = true;
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Failed to fetch team:", error);
    } finally {
      if (teamRequestRef.current === controller) teamRequestRef.current = null;
    }
  };

  const loadPortfolioOptions = async () => {
    if (portfoliosLoadedRef.current || portfolioRequestRef.current) return;
    const controller = new window.AbortController();
    portfolioRequestRef.current = controller;
    try {
      const response = await fetch("/api/renewals/portfolios", {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();
      if (response.ok && !controller.signal.aborted) {
        setPortfolioOptions(data.portfolios || []);
        portfoliosLoadedRef.current = true;
      }
    } catch (error) {
      if (error.name !== "AbortError") console.error("Failed to fetch customer portfolios:", error);
    } finally {
      if (portfolioRequestRef.current === controller) portfolioRequestRef.current = null;
    }
  };

  useEffect(
    () => () => {
      teamRequestRef.current?.abort();
      portfolioRequestRef.current?.abort();
    },
    [],
  );

  const toInputDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const timelinePolicyOptions = useMemo(() => {
    const types = timeline.map((item) => item.policyType).filter(Boolean);
    return Array.from(new Set(types));
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    return timeline.filter((item) => {
      const searchText = [
        item.createdBy,
        item.text,
        item.policyType,
        item.policyNumber,
        item.oldStatus,
        item.newStatus,
        item.type,
        item.recipientPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !timelineFilters.q || searchText.includes(timelineFilters.q.toLowerCase());
      const matchesStatus =
        !timelineFilters.status ||
        getRenewalToneClass(item.newStatus || item.type) === timelineFilters.status;
      const matchesPolicy = !timelineFilters.policy || item.policyType === timelineFilters.policy;

      const itemDateStr = toInputDate(item.createdAt);
      const matchesDate = !timelineFilters.date || itemDateStr === timelineFilters.date;

      return matchesQuery && matchesStatus && matchesPolicy && matchesDate;
    });
  }, [timeline, timelineFilters]);

  const handleCall = (policy = null) => {
    const mobile = policy?.renewalRecipientMobile || policy?.contactNumber || profile?.phone || "";
    if (mobile && !mobile.startsWith("NO-MOBILE-")) {
      window.open(`tel:${mobile}`);
    } else {
      showToast("No contact number available.", "error");
    }
  };

  // View Policy Side Drawer
  const handleViewPolicyDrawer = async (policy) => {
    setProfileDrawerOpen(true);
    setProfileDrawerLoading(true);
    setProfileDrawerData(null);
    setProfileAuditLogs([]);

    try {
      const auditRes = await fetch(`/api/renewals/audit?policyId=${policy.id}`);
      const auditData = await auditRes.json();

      setProfileDrawerData({
        profile,
        policy,
      });
      if (auditRes.ok && auditData.success) {
        setProfileAuditLogs(auditData.logs);
      }
    } catch (err) {
      console.error("Failed to load policy details for drawer:", err);
    } finally {
      setProfileDrawerLoading(false);
    }
  };

  // Add Remark
  const handleAddRemark = (policy) => {
    setSelectedPolicy(policy);
    setRemarkForm({
      text: "",
      nextFollowUpDate: "",
      status: "Follow-Up",
      mode: "Call",
      priority: "Normal",
      nextAction: "",
    });
    setRemarkModalOpen(true);
  };

  const submitRemark = async (e) => {
    e.preventDefault();
    if (!remarkForm.text.trim()) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          remark: remarkForm.text,
          nextFollowUpDate: remarkForm.nextFollowUpDate,
          followUpStatus: remarkForm.status,
          followUpMode: remarkForm.mode,
          priority: remarkForm.priority,
          nextAction: remarkForm.nextAction,
          expectedUpdatedAt: selectedPolicy?.updatedAt,
        }),
      });
      if (res.ok) {
        setRemarkModalOpen(false);
        await fetchCustomerProfile();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to submit remark.", "error");
      }
    } catch {
      showToast("Failed to submit remark.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Renewal
  const handleEditRenewal = (policy) => {
    void loadTeamMembers();
    void loadPortfolioOptions();
    setSelectedPolicy(policy);

    const fmtDate = (dStr) => {
      if (!dStr) return "";
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    const contactPersonName = policy.contactPersonName || policy.contactPerson || profile?.contactPerson || "";
    const premiumValue = policy.premium ?? policy.totalPremium ?? "";
    const numericPremium = String(premiumValue).replace(/[^0-9.-]/g, "");

    setEditForm({
      insuredName: policy.insuredName || "",
      contactPersonName: ["Contact not available", "Unknown Contact"].includes(contactPersonName)
        ? ""
        : contactPersonName,
      contactNumber: policy.contactNumber || "",
      contactPersonEmail: policy.email || "",
      renewalRecipientName: policy.renewalRecipientName || contactPersonName || "",
      renewalRecipientMobile: policy.renewalRecipientMobile || policy.contactNumber || "",
      renewalRecipientEmail: policy.renewalRecipientEmail || policy.email || "",
      contactUpdateMode: "policy_only",
      targetPortfolioId: profile?.id || "",
      newPortfolioName: "",
      newPortfolioMobile: "",
      newPortfolioEmail: "",
      policyNumber: policy.policyNumber || "",
      insuranceCompany: policy.insuranceCompany || "",
      policyType: policy.policyType || "",
      premium: numericPremium && Number.isFinite(Number(numericPremium)) ? numericPremium : "",
      expiryDate: fmtDate(policy.expiryDate),
      assignedToUserId: policy.assignedToId || "",
      renewalStatus: policy.renewalStatus || "ACTIVE",
      remark: "",
      nextFollowUpDate: "",
    });
    setEditModalOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (
      !editForm.insuredName.trim() ||
      !editForm.policyNumber.trim() ||
      !editForm.insuranceCompany.trim() ||
      !editForm.policyType.trim() ||
      !editForm.expiryDate
    ) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          expectedUpdatedAt: selectedPolicy.updatedAt,
          ...editForm,
        }),
      });
      if (res.ok) {
        setEditModalOpen(false);
        await fetchCustomerProfile();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update policy.", "error");
      }
    } catch {
      showToast("Failed to update policy.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Renew Policy
  const handleMarkRenewed = (policy) => {
    setSelectedPolicy(policy);
    setRenewForm({
      policyNumber: "",
      startDate: "",
      expiryDate: "",
      premium: policy.premium || policy.totalPremium || "",
      remark: "",
    });
    setRenewModalOpen(true);
  };

  const submitRenew = async (e) => {
    e.preventDefault();

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousPolicyId: selectedPolicy.id,
          idempotencyKey: `${selectedPolicy.id}-${Date.now()}`,
          renewedData: {
            remark: renewForm.remark,
            expectedUpdatedAt: selectedPolicy.updatedAt,
          },
        }),
      });
      if (res.ok) {
        setRenewModalOpen(false);
        showToast("Policy marked as Renewed successfully!", "success");
        if (selectedPolicy) {
          setPolicies((prev) =>
            prev.map((p) =>
              p.id === selectedPolicy.id
                ? {
                    ...p,
                    renewalStatus: "Renewed",
                    lastRemark: renewForm.remark || "Policy marked as renewed",
                    _recentlyUpdated: true,
                  }
                : p
            )
          );
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to renew policy.", "error");
      }
    } catch {
      showToast("Failed to renew policy.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Lost
  const handleMarkLost = (policy) => {
    setSelectedPolicy(policy);
    setLostForm({ lostReason: "Premium High", remarks: "" });
    setLostModalOpen(true);
  };

  const submitLost = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          lostReason: lostForm.lostReason,
          remarks: lostForm.remarks,
          expectedUpdatedAt: selectedPolicy.updatedAt,
        }),
      });
      if (res.ok) {
        setLostModalOpen(false);
        await fetchCustomerProfile();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to mark policy as lost.", "error");
      }
    } catch {
      showToast("Failed to mark policy as lost.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reassign User
  const handleReassignUser = (policy) => {
    void loadTeamMembers();
    setSelectedPolicy(policy);
    setReassignForm({ assignedToUserId: "", note: "" });
    setReassignModalOpen(true);
  };

  const submitReassign = async (e) => {
    e.preventDefault();
    if (!reassignForm.assignedToUserId) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          assignedToUserId: reassignForm.assignedToUserId,
          note: reassignForm.note,
          expectedUpdatedAt: selectedPolicy.updatedAt,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReassignModalOpen(false);
        await fetchCustomerProfile();
      } else {
        showToast(data.error || "Failed to reassign agent.", "error");
      }
    } catch {
      showToast("Failed to reassign agent.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp Combined Message
  const fetchRenewalQuotes = async (policy = null) => {
    const vehicleNumber = String(policy?.vehicleNumber || policy?.registrationNumber || "").trim();
    if (!vehicleNumber) {
      setRenewalQuotes([]);
      return;
    }

    setRenewalQuotesLoading(true);
    try {
      const res = await fetch(`/api/operations/whatsapp/quotes?vehicleNumber=${encodeURIComponent(vehicleNumber)}`);
      const payload = await res.json();
      const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      setRenewalQuotes(quotes);
      setSelectedRenewalQuoteIds(quotes.length > 0 ? [quotes[0].id] : []);
    } catch (error) {
      console.error("Failed to load renewal quotes", error);
      setRenewalQuotes([]);
    } finally {
      setRenewalQuotesLoading(false);
    }
  };

  const handleWhatsApp = async (policy = null) => {
    const cleanPhone = profile?.phone ? String(profile.phone).replace(/[^0-9]/g, "") : "";
    if (!policy && !profile?.id && (!cleanPhone || cleanPhone.length < 10)) {
      showToast("No valid phone number available for this customer.", "error");
      return;
    }

    setWhatsAppPhone("");
    setWhatsAppPolicyId(policy?.id || "");
    setWhatsAppTemplates(null);
    setWhatsAppCustomFields([]);
    setWhatsAppPreviewView("message");
    setSelectedTemplateType("due_soon");
    setEditedWhatsAppMessage("");
    setWhatsAppRecipientGroups([]);
    setWhatsAppContactDetails(null);
    setWhatsAppRecipientType("individual");
    setWhatsAppGroupId("");

    try {
      setActionLoading(true);
      // We pass the phone so it consolidates all due policies
      const res = await fetch("/api/renewals/whatsapp-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profile.phone,
          portfolioId: policy ? undefined : profile.id,
          policyId: policy ? policy.id : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsAppPhone(data.phone);
        setWhatsAppTemplates(data.templates);
        setWhatsAppCustomFields(data.customFields || []);
        setSelectedTemplateType(data.defaultTemplate);
        setEditedWhatsAppMessage(data.templates[data.defaultTemplate]);
        setWhatsAppRecipientGroups(data.recipientGroups || []);
        setWhatsAppContactDetails(data.contactDetails || null);
        await fetchRenewalQuotes(policy || null);
        setWhatsAppPreviewOpen(true);
      } else {
        showToast(data.error || "Failed to load WhatsApp template.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load WhatsApp template.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (!editedWhatsAppMessage) return;
    if (typeof window !== "undefined" && window.navigator && window.navigator.clipboard) {
      window.navigator.clipboard.writeText(editedWhatsAppMessage);
      showToast("Message copied to clipboard!", "success");
    } else {
      showToast("Clipboard action not supported in this browser.", "error");
    }
  };

  const toggleRenewalQuoteSelection = (quoteId) => {
    setSelectedRenewalQuoteIds((prev) => (
      prev.includes(quoteId) ? prev.filter((item) => item !== quoteId) : [...prev, quoteId]
    ));
  };

  const handleQuoteFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualQuoteFileName(file.name);
    if (typeof window === "undefined" || !window.FileReader) return;
    const reader = new window.FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result || "";
      setManualQuoteFileBase64(base64);
      if (base64) {
        const tempId = `uploaded-quote-${Date.now()}`;
        const newQuote = {
          id: tempId,
          groupName: "Manual Upload",
          senderName: "Agent",
          messageBody: file.name,
          mediaBase64: base64,
          attachmentFileName: file.name,
          attachmentType: file.type.includes("pdf") ? "document" : "image",
          receivedAt: new Date(),
        };
        setRenewalQuotes((prev) => [newQuote, ...prev.filter((item) => item.id !== tempId)]);
        setSelectedRenewalQuoteIds((prev) => [...new Set([...prev, tempId])]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManualQuote = async () => {
    if (!manualQuoteText.trim() && !manualQuoteFileBase64) return;
    const policy = (policies || []).find((p) => p.id === whatsappPolicyId) || (policies || [])[0] || null;
    const vehicleNumber = String(policy?.vehicleNumber || policy?.registrationNumber || "").trim();
    const isPdf = manualQuoteFileName?.toLowerCase().endsWith(".pdf") || manualQuoteFileBase64?.startsWith("data:application/pdf");

    setSavingManualQuote(true);
    try {
      const res = await fetch("/api/operations/whatsapp/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNumber: vehicleNumber || "MP04UC1162",
          groupName: "Manual Entry",
          messageBody: manualQuoteText.trim() || `Quote for ${vehicleNumber}`,
          mediaBase64: manualQuoteFileBase64,
          attachmentFileName: manualQuoteFileName || (isPdf ? "quote.pdf" : "quote.jpg"),
          attachmentType: isPdf ? "document" : "image",
        }),
      });
      const payload = await res.json();
      if (res.ok && payload.success) {
        setManualQuoteText("");
        setManualQuoteFileBase64("");
        setManualQuoteFileName("");
        setShowAddQuoteForm(false);
        await fetchRenewalQuotes(policy);
        if (payload.quote?.id) {
          setSelectedRenewalQuoteIds((prev) => [...prev, payload.quote.id]);
        }
      } else {
        showToast(payload.error || "Failed to save quote", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save quote", "error");
    } finally {
      setSavingManualQuote(false);
    }
  };

  const fetchGroupQuotesGallery = async () => {
    setLoadingAllGroupQuotes(true);
    try {
      const res = await fetch("/api/operations/whatsapp/quotes?all=true");
      const payload = await res.json();
      if (res.ok && Array.isArray(payload.quotes)) {
        setAllGroupQuotes(payload.quotes);
      } else {
        setAllGroupQuotes([]);
      }
    } catch (err) {
      console.error(err);
      setAllGroupQuotes([]);
    } finally {
      setLoadingAllGroupQuotes(false);
    }
  };

  const handleSelectQuoteFromGallery = (quote) => {
    if (!quote) return;
    setRenewalQuotes((prev) => {
      const exists = prev.some((item) => item.id === quote.id);
      return exists ? prev : [quote, ...prev];
    });
    setSelectedRenewalQuoteIds((prev) => [...new Set([...prev, quote.id])]);
    setShowGroupGalleryModal(false);
  };

  const handleSendWhatsApp = async () => {
    if (!editedWhatsAppMessage) return;
    const isGroupRecipient = whatsappRecipientType === "group";
    const hasRecipient = isGroupRecipient
      ? Boolean(whatsappGroupId)
      : whatsappRecipientGroups.length > 0 || String(whatsappPhone || "").replace(/\D/g, "").length >= 10;
    if (!hasRecipient) {
      showToast(isGroupRecipient ? "Select a WhatsApp group before sending." : "Add a valid renewal recipient mobile number before sending.", "error");
      return;
    }

    try {
      const groupPolicyIds = [...new Set(whatsappRecipientGroups.flatMap((group) => group.policyIds || []))];
      const selectedQuotes = renewalQuotes.filter((quote) => selectedRenewalQuoteIds.includes(quote.id));
      let quoteAttachments = selectedQuotes.map((quote) => {
        const data = quote.mediaBase64 || quote.attachmentData || "";
        const rawFilename = quote.attachmentFileName || quote.fileName || "";
        const isPdf = quote.attachmentType === "document" ||
          rawFilename.toLowerCase().endsWith(".pdf") ||
          String(data).startsWith("data:application/pdf") ||
          String(quote.attachmentUrl || "").toLowerCase().endsWith(".pdf");
        const filename = rawFilename || (isPdf ? "quote.pdf" : "quote_image.jpg");

        return {
          attachmentData: data,
          attachmentUrl: quote.attachmentUrl || "",
          attachmentFileName: filename,
          attachmentType: isPdf ? "document" : "image",
          mediaType: isPdf ? "document" : "image",
          messageBody: quote.messageBody || "",
        };
      });

      if (manualQuoteFileBase64 && quoteAttachments.length === 0) {
        const isPdf = String(manualQuoteFileName || "").toLowerCase().endsWith(".pdf") ||
          manualQuoteFileBase64.startsWith("data:application/pdf");
        const filename = manualQuoteFileName || (isPdf ? "quote.pdf" : "quote_image.jpg");

        quoteAttachments.push({
          attachmentData: manualQuoteFileBase64,
          attachmentFileName: filename,
          attachmentType: isPdf ? "document" : "image",
          mediaType: isPdf ? "document" : "image",
          messageBody: manualQuoteText || "",
        });
      }
      const sends = isGroupRecipient
        ? [{ phone: whatsappGroupId, message: editedWhatsAppMessage, policyIds: groupPolicyIds.length ? groupPolicyIds : (whatsappPolicyId ? [whatsappPolicyId] : []) }]
        : whatsappRecipientGroups.length > 1
        ? whatsappRecipientGroups
        : [{
            phone: whatsappPhone,
            message: editedWhatsAppMessage,
            policyIds: whatsappRecipientGroups[0]?.policyIds || (whatsappPolicyId ? [whatsappPolicyId] : []),
          }];
      let sentCount = 0;
      for (const send of sends) {
        const res = await fetch("/api/operations/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: send.phone, message: send.message, attachments: quoteAttachments }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Unknown error");
        try {
          await fetch("/api/renewals/whatsapp-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: profile.phone,
              recipient: send.phone,
              portfolioId: profile.id || undefined,
              policyId: whatsappPolicyId || undefined,
              policyIds: send.policyIds,
              logAudit: true,
              message: send.message,
              messageId: data.messageId || undefined,
            }),
          });
        } catch (auditError) {
          console.error("Failed to log WhatsApp audit:", auditError);
        }
        sentCount++;
      }
      showToast(`WhatsApp message sent successfully to ${sentCount} recipient${sentCount === 1 ? "" : "s"}.`, "success");
    } catch (error) {
      showToast(`Failed to send WhatsApp message: ${error.message || "Unknown error"}`, "error");
    }

    setWhatsAppPreviewOpen(false);
    await fetchCustomerProfile();
  };

  useEffect(() => {
    if (loading || !profile || !requestedAction || policies.length === 0) return;
    const actionKey = `${requestedPolicyId}:${requestedAction}`;
    if (openedRequestedAction.current === actionKey) return;

    const policy = requestedPolicyId ? policies.find((item) => item.id === requestedPolicyId) : policies[0];
    if (!policy) {
      openedRequestedAction.current = actionKey;
      showToast("The selected renewal policy could not be loaded.", "error");
      return;
    }
    openedRequestedAction.current = actionKey;

    if (requestedAction === "edit") handleEditRenewal(policy);
    else if (requestedAction === "remark") handleAddRemark(policy);
    else if (requestedAction === "assign") handleReassignUser(policy);
    else if (requestedAction === "renew") handleMarkRenewed(policy);
    else if (requestedAction === "lost") handleMarkLost(policy);
    else if (requestedAction === "timeline") handleViewPolicyDrawer(policy);
    else if (requestedAction === "whatsapp") void handleWhatsApp(policy);
  }, [loading, policies, profile, requestedAction, requestedPolicyId]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="loading-skeleton">
        {/* Back link */}
        <div>
          <button
            className="rn-btn"
            type="button"
            disabled
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", opacity: 0.6 }}
          >
            <ArrowLeft size={14} /> Back to Portfolios
          </button>
        </div>

        <div className="customer-profile-layout">
          {/* Left Panel: Customer summary & KPIs */}
          <div
            className="customer-summary-panel"
            style={{ border: "none", background: "transparent", boxShadow: "none", padding: 0 }}
          >
            {/* Header section with avatar, name, and badge */}
            <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "8px" }}>
              <div
                className="skeleton"
                style={{ width: "56px", height: "56px", borderRadius: "50%", flexShrink: 0 }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                <div className="skeleton" style={{ width: "70%", height: "20px", borderRadius: "4px" }} />
                <div className="skeleton" style={{ width: "40%", height: "14px", borderRadius: "4px" }} />
              </div>
            </div>

            {/* Action buttons Call & WhatsApp */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px", marginTop: "8px" }}>
              <div className="skeleton" style={{ flex: 1, height: "44px", borderRadius: "8px" }} />
              <div className="skeleton" style={{ flex: 1, height: "44px", borderRadius: "8px" }} />
            </div>

            {/* 1. CATEGORY */}
            <div className="sidebar-section-card">
              <div className="sidebar-section-header">
                <div className="skeleton" style={{ width: "15px", height: "15px", borderRadius: "3px" }} />
                <div className="skeleton" style={{ width: "60px", height: "11px", borderRadius: "2px" }} />
              </div>
              <div className="sidebar-full-cell">
                <div
                  className="skeleton"
                  style={{ width: "80px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                />
                <div className="skeleton" style={{ width: "50px", height: "12px", borderRadius: "3px" }} />
              </div>
            </div>

            {/* 2. CONTACT INFORMATION */}
            <div className="sidebar-section-card">
              <div className="sidebar-section-header">
                <div className="skeleton" style={{ width: "15px", height: "15px", borderRadius: "3px" }} />
                <div className="skeleton" style={{ width: "110px", height: "11px", borderRadius: "2px" }} />
              </div>
              <div className="sidebar-full-cell">
                <div
                  className="skeleton"
                  style={{ width: "80px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                />
                <div className="skeleton" style={{ width: "110px", height: "12px", borderRadius: "3px" }} />
              </div>
              <div className="sidebar-full-cell">
                <div
                  className="skeleton"
                  style={{ width: "110px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                />
                <div className="skeleton" style={{ width: "130px", height: "12px", borderRadius: "3px" }} />
              </div>
              <div className="sidebar-full-cell">
                <div
                  className="skeleton"
                  style={{ width: "80px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                />
                <div className="skeleton" style={{ width: "150px", height: "12px", borderRadius: "3px" }} />
              </div>
            </div>

            {/* 3. ADDRESS */}
            <div className="sidebar-section-card">
              <div className="sidebar-section-header">
                <div className="skeleton" style={{ width: "15px", height: "15px", borderRadius: "3px" }} />
                <div className="skeleton" style={{ width: "50px", height: "11px", borderRadius: "2px" }} />
              </div>
              <div className="sidebar-full-cell">
                <div
                  className="skeleton"
                  style={{ width: "60px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                />
                <div className="skeleton" style={{ width: "85%", height: "12px", borderRadius: "3px" }} />
              </div>
            </div>

            {/* 4. POLICY */}
            <div className="sidebar-section-card">
              <div className="sidebar-section-header">
                <div className="skeleton" style={{ width: "15px", height: "15px", borderRadius: "3px" }} />
                <div className="skeleton" style={{ width: "40px", height: "11px", borderRadius: "2px" }} />
              </div>
              <div className="sidebar-grid-row">
                <div className="sidebar-grid-cell">
                  <div
                    className="skeleton"
                    style={{ width: "85px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                  />
                  <div className="skeleton" style={{ width: "30px", height: "12px", borderRadius: "3px" }} />
                </div>
                <div className="sidebar-grid-cell">
                  <div
                    className="skeleton"
                    style={{ width: "110px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                  />
                  <div className="skeleton" style={{ width: "60px", height: "12px", borderRadius: "3px" }} />
                </div>
              </div>
              <div className="sidebar-grid-row">
                <div className="sidebar-grid-cell">
                  <div
                    className="skeleton"
                    style={{ width: "90px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                  />
                  <div className="skeleton" style={{ width: "70px", height: "12px", borderRadius: "3px" }} />
                </div>
                <div className="sidebar-grid-cell">
                  <div
                    className="skeleton"
                    style={{ width: "105px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                  />
                  <div className="skeleton" style={{ width: "50px", height: "12px", borderRadius: "3px" }} />
                </div>
              </div>
            </div>

            {/* 5. ASSIGNMENT */}
            <div className="sidebar-section-card">
              <div className="sidebar-section-header">
                <div className="skeleton" style={{ width: "15px", height: "15px", borderRadius: "3px" }} />
                <div className="skeleton" style={{ width: "70px", height: "11px", borderRadius: "2px" }} />
              </div>
              <div className="sidebar-full-cell">
                <div
                  className="skeleton"
                  style={{ width: "80px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                />
                <div className="skeleton" style={{ width: "100px", height: "12px", borderRadius: "3px" }} />
              </div>
            </div>
          </div>

          {/* Right Panel: Associated Policies list and timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Associated Companies */}
            <div className="rn-table-container">
              <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
                <h3
                  style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}
                >
                  Associated Companies
                </h3>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "16px" }}>
                <div className="skeleton" style={{ width: "100px", height: "26px", borderRadius: "14px" }} />
                <div className="skeleton" style={{ width: "120px", height: "26px", borderRadius: "14px" }} />
              </div>
            </div>

            {/* Associated Policies Table */}
            <div className="rn-table-container">
              <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
                <h3
                  style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}
                >
                  Associated Policies
                </h3>
              </div>

              <table
                className="rn-table"
                style={{
                  width: "100%",
                  minWidth: colWidths.reduce((sum, w) => sum + w, 0) + "px",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr>
                    {COL_HEADERS.map((header) => (
                      <th key={header}>
                        <div
                          className="skeleton"
                          style={{ width: "70%", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <tr key={index}>
                      {COL_HEADERS.map((_, colIdx) => (
                        <td key={colIdx}>
                          <div
                            className="skeleton"
                            style={{ width: "80%", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Timeline Feed Panel */}
            <div className="rn-table-container" style={{ padding: "24px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--rn-text-primary)",
                  margin: "0 0 20px 0",
                }}
              >
                Renewal Timeline & Remarks
              </h3>

              <div className="rn-timeline-filters" style={{ pointerEvents: "none", opacity: 0.85 }}>
                <div className="skeleton" style={{ flex: 1, minHeight: "38px", borderRadius: "6px" }} />
                <div
                  className="skeleton"
                  style={{ width: "120px", minHeight: "38px", borderRadius: "6px" }}
                />
                <div
                  className="skeleton"
                  style={{ width: "140px", minHeight: "38px", borderRadius: "6px" }}
                />
                <div
                  className="skeleton"
                  style={{ width: "130px", minHeight: "38px", borderRadius: "6px" }}
                />
              </div>

              <div className="rn-timeline-scroll">
                <div className="rn-timeline">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="rn-timeline-item">
                      <div
                        className="skeleton"
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          border: "2px solid #fff",
                          left: "-6px",
                          top: "4px",
                          position: "absolute",
                          zIndex: 2,
                        }}
                      />
                      <div className="rn-timeline-content">
                        <div className="rn-timeline-header">
                          <div
                            className="skeleton"
                            style={{ width: "90px", height: "14px", borderRadius: "3px" }}
                          />
                          <div
                            className="skeleton"
                            style={{ width: "110px", height: "12px", borderRadius: "3px" }}
                          />
                        </div>
                        <div
                          className="rn-timeline-body"
                          style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}
                        >
                          <div
                            className="skeleton"
                            style={{ width: "140px", height: "11px", borderRadius: "2px" }}
                          />
                          <div
                            className="skeleton"
                            style={{ width: "90%", height: "13px", borderRadius: "3px" }}
                          />
                          <div
                            className="skeleton"
                            style={{ width: "70%", height: "13px", borderRadius: "3px" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Customer portfolio profile not found.</p>
        <button className="rn-btn" onClick={() => router.push("/dashboard/renewals/customers")}>
          Back to Customers
        </button>
      </div>
    );
  }

  const isNoMobile = phone.startsWith("NO-MOBILE-");
  const renderPortal = (content) => {
    if (typeof document === "undefined") return content;
    return createPortal(content, document.body);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back link */}
      <div>
        <button
          className="rn-btn"
          onClick={goBackToPortfolios}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "6px 14px",
            fontWeight: "600",
            fontSize: "13px",
            color: "#334155",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <ArrowLeft size={14} /> Back to Portfolios
        </button>
      </div>

      <div className="customer-profile-layout">
        {/* Left Panel: Customer summary & KPIs */}
        <div
          className="customer-summary-panel"
          style={{ border: "none", background: "transparent", boxShadow: "none", padding: 0 }}
        >
          {/* Header section with avatar, name, and badge */}
          <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "8px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1.5px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.1)",
              }}
            >
              <User size={26} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <h1
                style={{
                  fontSize: "19px",
                  fontWeight: "700",
                  color: "#0f172a",
                  margin: 0,
                  lineHeight: "1.2",
                }}
              >
                {profile.contactPerson || profile.name || "Contact Details"}
              </h1>
              <span
                className={`rn-badge ${
                  profile.customerStatus === "Renewed"
                    ? "rn-badge-success"
                    : profile.customerStatus === "Lost"
                      ? "rn-badge-danger"
                      : profile.customerStatus === "Due Soon"
                        ? "rn-badge-warning"
                        : ["Overdue", "Expired"].includes(profile.customerStatus)
                          ? "rn-badge-danger"
                          : "rn-badge-active"
                }`}
                style={{
                  textTransform: "uppercase",
                  fontSize: "11px",
                  fontWeight: "800",
                  marginTop: "2px",
                  width: "fit-content",
                }}
              >
                {profile.customerStatus}
              </span>
            </div>
          </div>

          {/* Action buttons Call & WhatsApp */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "6px", marginTop: "6px" }}>
            <button className="sidebar-action-btn" onClick={handleCall} disabled={isNoMobile}>
              <Phone size={15} /> Call
            </button>
            <button className="sidebar-action-btn whatsapp-btn" onClick={() => handleWhatsApp()} disabled={isNoMobile}>
              <MessageSquare size={15} /> WhatsApp
            </button>
          </div>

          {/* 1. CATEGORY */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <LayoutGrid size={14} />
              <span>Category</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Renewal Status</span>
              <span className="sidebar-cell-value">{profile.customerStatus || "Active"}</span>
            </div>
          </div>

          {/* 2. ASSOCIATED COMPANIES */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={14} />
                <span>Associated Companies</span>
              </div>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  color: "#2563eb",
                  background: "#eff6ff",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  border: "1px solid #bfdbfe",
                }}
              >
                {companies.length}
              </span>
            </div>
            <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {companies.length === 0 ? (
                <span style={{ fontSize: "12px", color: "#64748b" }}>No company linked</span>
              ) : (
                <>
                  {(showAllCompanies ? companies : companies.slice(0, 3)).map((company) => (
                    <div
                      key={company}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        background: "#f8fafc",
                        border: "1px solid #f1f5f9",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#1e293b",
                        lineHeight: "1.3",
                      }}
                      title={company}
                    >
                      <Building2 size={13} style={{ color: "#64748b", marginTop: "2px", flexShrink: 0 }} />
                      <span style={{ wordBreak: "break-word" }}>{company}</span>
                    </div>
                  ))}
                  {companies.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCompanies(!showAllCompanies)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        color: "#2563eb",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 0",
                        marginTop: "2px",
                      }}
                    >
                      {showAllCompanies ? (
                        <>Show Less <ChevronUp size={13} /></>
                      ) : (
                        <>+ {companies.length - 3} more companies <ChevronDown size={13} /></>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 3. CONTACT INFORMATION */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <User size={14} />
              <span>Contact Information</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Mobile Number</span>
              <span className="sidebar-cell-value">{isNoMobile ? "Not Available" : profile.phone}</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Contact Person Name</span>
              <span className="sidebar-cell-value">{profile.contactPerson || "-"}</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Email Address</span>
              <span className="sidebar-cell-value">{profile.email || "-"}</span>
            </div>
          </div>

          {/* 4. ADDRESS */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <MapPin size={14} />
              <span>Address</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Address</span>
              <span className="sidebar-cell-value">{profile.address || "-"}</span>
            </div>
          </div>

          {/* 5. POLICY */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <Shield size={14} />
              <span>Policy</span>
            </div>
            <div className="sidebar-grid-row">
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Total Companies</span>
                <span className="sidebar-cell-value">{stats.totalCompanies || companies.length}</span>
              </div>
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Total Premium (Booked)</span>
                <span className="sidebar-cell-value" style={{ fontWeight: "700" }}>
                  ₹{stats.totalPremium.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="sidebar-grid-row">
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Total Sum Insured</span>
                <span className="sidebar-cell-value">₹{stats.totalSumInsured.toLocaleString("en-IN")}</span>
              </div>
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Total Policies</span>
                <span className="sidebar-cell-value">
                  {stats.totalPolicies} ({stats.policiesDue} due)
                </span>
              </div>
            </div>
          </div>

          {/* 6. ASSIGNMENT */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <User size={14} />
              <span>Assignment</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Assigned Agent</span>
              <span className="sidebar-cell-value">{profile.assignedTo || "Unassigned"}</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Associated Policies list and timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Associated Policies Table */}
          <div className="rn-card-shell" style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#ffffff", boxShadow: "0 2px 6px rgba(15, 23, 42, 0.02)", overflow: "hidden" }}>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Shield size={16} style={{ color: "#2563eb" }} />
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Associated Policies
                </h3>
                <span
                  style={{
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    fontWeight: "600",
                    fontSize: "11.5px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {displayedPolicies.length} of {policies.length} {policies.length === 1 ? "Policy" : "Policies"}
                </span>
              </div>

              {/* Single / Multi Policy Toggle */}
              {policies.length > 1 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    gap: "2px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPolicyViewMode("single")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      fontSize: "12.5px",
                      fontWeight: policyViewMode === "single" ? "600" : "500",
                      color: policyViewMode === "single" ? "#0f172a" : "#64748b",
                      backgroundColor: policyViewMode === "single" ? "#ffffff" : "transparent",
                      borderRadius: "6px",
                      boxShadow: policyViewMode === "single" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Shield size={14} />
                    Single Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => setPolicyViewMode("all")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      fontSize: "12.5px",
                      fontWeight: policyViewMode === "all" ? "600" : "500",
                      color: policyViewMode === "all" ? "#0f172a" : "#64748b",
                      backgroundColor: policyViewMode === "all" ? "#ffffff" : "transparent",
                      borderRadius: "6px",
                      boxShadow: policyViewMode === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <LayoutGrid size={14} />
                    Multi Policy ({policies.length})
                  </button>
                </div>
              )}
            </div>

            {/* Single Policy View Target Banner & Switcher if multiple policies exist */}
            {policies.length > 1 && policyViewMode === "single" && (
              <div
                style={{
                  padding: "10px 18px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12.5px",
                  color: "#334155",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      fontSize: "11.5px",
                      fontWeight: "700",
                    }}
                  >
                    <Shield size={12} /> Single Policy View
                  </span>
                  <span>
                    Showing target policy{" "}
                    <strong
                      style={{
                        fontFamily: "monospace",
                        color: "#0f172a",
                        backgroundColor: "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {String(displayedPolicies[0]?.policyNumber || "N/A").replace(/:\s*$/, "").trim()}
                    </strong>{" "}
                    <span style={{ color: "#64748b", fontWeight: "500" }}>({displayedPolicies[0]?.insuranceCompany || ""})</span>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label htmlFor="single-policy-select" style={{ fontWeight: "600", color: "#475569", fontSize: "12px" }}>
                    Switch Target Policy:
                  </label>
                  <select
                    id="single-policy-select"
                    aria-label="Switch Target Policy"
                    value={displayedPolicies[0]?.id || ""}
                    onChange={(e) => setSelectedSinglePolicyId(e.target.value)}
                    style={{
                      fontSize: "12px",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {policies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {String(p.policyNumber || "No Number").replace(/:\s*$/, "").trim()} - {p.policyType || p.insuranceCompany || "Policy"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="rn-table-scroll-wrap">

            <table
              className="rn-table"
              style={{
                width: "100%",
                minWidth: colWidths.reduce((sum, w) => sum + w, 0) + "px",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  {COL_HEADERS.map((header, idx) => (
                    <th key={header} style={{ width: colWidths[idx] + "px", position: "relative" }}>
                      {header}
                      <div className="rn-resize-handle" onMouseDown={(e) => handleResizeStart(idx, e)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedPolicies.map((p) => {
                  const daysLeft = p.daysRemaining !== undefined ? p.daysRemaining : null;
                  const makeModel = [p.vehicleMake, p.vehicleModel].map((value) => String(value || "").trim()).filter(Boolean).join(" ") || String(p.makeModel || "").trim().replace(/\s*,\s*/g, " ") || "-";
                  const cleanPolicyNo = String(p.policyNumber || "N/A").replace(/:\s*$/, "").trim();
                  const statusLower = String(p.renewalStatus || "").toLowerCase();
                  const statusDisplay =
                    statusLower === "expiry_soon" || statusLower === "expiry soon" || statusLower === "expiring_soon"
                      ? "Expiry Soon"
                      : statusLower === "expired"
                      ? "Expired"
                      : statusLower === "renewed"
                      ? "Renewed"
                      : statusLower === "lost"
                      ? "Lost"
                      : statusLower === "active"
                      ? "Active"
                      : statusLower === "follow-up" || statusLower === "follow_up"
                      ? "Follow-Up"
                      : statusLower === "wrong_number"
                      ? "Wrong Number"
                      : statusLower === "not_interested"
                      ? "Not Interested"
                      : statusLower === "renewed_elsewhere"
                      ? "Renewed Elsewhere"
                      : String(p.renewalStatus || "Active").replace(/_/g, " ");

                  const cleanContactStr = (str) => {
                    if (!str) return "";
                    return String(str).replace(/(\d{10})/g, " ($1) ").replace(/:\s*$/, "").replace(/\s+/g, " ").trim();
                  };

                  const insuredNameClean = cleanContactStr(p.insuredName);
                  const contactPersonClean = cleanContactStr(p.contactPerson);
                  const renewalPersonClean = cleanContactStr(p.renewalRecipientName);

                  return (
                    <tr key={p.id}>
                      {/* 1. Policy Number */}
                      <td style={{ width: colWidths[0] + "px", fontWeight: "600" }}>
                        <span className="rn-cell-link" onClick={() => handleViewPolicyDrawer(p)}>
                          {cleanPolicyNo}
                        </span>
                      </td>

                      {/* 2. Company Name */}
                      <td style={{ width: colWidths[1] + "px" }}>
                        <div style={{ fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
                          {insuredNameClean || "-"}
                        </div>
                        {contactPersonClean && (
                          <div style={{ fontSize: "11.5px", color: "#475569", lineHeight: "1.4", marginTop: "2px" }}>
                            <strong>Contact:</strong> {contactPersonClean} {p.contactNumber && !contactPersonClean.includes(p.contactNumber) ? `(${p.contactNumber})` : ""}
                          </div>
                        )}
                        {(renewalPersonClean || p.renewalRecipientMobile) && (
                          <div style={{ fontSize: "11.5px", color: "#475569", lineHeight: "1.4", marginTop: "2px" }}>
                            <strong>Renewal:</strong> {renewalPersonClean || contactPersonClean || "-"} {p.renewalRecipientMobile && !renewalPersonClean.includes(p.renewalRecipientMobile) ? `(${p.renewalRecipientMobile})` : ""}
                          </div>
                        )}
                        {p.renewalRecipientMobile && p.renewalRecipientMobile !== profile.phone ? (
                          <span className="rn-badge rn-badge-active" style={{ marginTop: "4px", display: "inline-block" }}>
                            Alternate Contact
                          </span>
                        ) : null}
                      </td>

                      {/* 3. Insurance Company */}
                      <td style={{ width: colWidths[2] + "px" }}>{p.insuranceCompany || "-"}</td>

                      {/* 4. Policy Type */}
                      <td style={{ width: colWidths[3] + "px" }}>
                        {p.displayPolicyType || p.policyType || "-"}
                      </td>

                      {/* 5. Premium */}
                      <td style={{ width: colWidths[4] + "px" }}>
                        {formatPremium(p.premium || p.totalPremium)}
                      </td>

                      {/* 6. Sum Insured */}
                      <td style={{ width: colWidths[5] + "px" }}>{formatPremium(p.sumInsured)}</td>

                      {/* 7. Make / Model */}
                      <td style={{ width: colWidths[6] + "px" }}>{makeModel}</td>

                      {/* 8. Expiry Date */}
                      <td style={{ width: colWidths[7] + "px" }}>{formatDate(p.expiryDate)}</td>

                      {/* 9. Days Left */}
                      <td style={{ width: colWidths[8] + "px" }}>
                        <span className={getDaysClass(daysLeft)}>{getDaysText(daysLeft)}</span>
                      </td>

                      {/* 10. WhatsApp Status */}
                      <td style={{ width: colWidths[9] + "px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-start" }}>
                          <span className={`rn-badge ${p.whatsappMessageSentAt ? "rn-badge-success" : "rn-badge-active"}`}>
                            {p.whatsappMessageSentAt ? "Sent" : "Not sent"}
                          </span>
                          {p.whatsappMessageSentAt ? (
                            <small style={{ color: "var(--rn-text-muted)", whiteSpace: "nowrap" }}>
                              {formatDate(p.whatsappMessageSentAt)}
                            </small>
                          ) : null}
                        </div>
                      </td>

                      {/* 11. Renewal Status */}
                      <td style={{ width: colWidths[10] + "px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            className={`rn-badge ${
                              statusLower.includes("renewed")
                                ? "rn-badge-success"
                                : ["lost", "wrong_number", "not_interested", "renewed_elsewhere", "expired"].includes(statusLower)
                                ? "rn-badge-danger"
                                : statusLower.includes("follow") || statusLower.includes("expiry") || statusLower.includes("due")
                                ? "rn-badge-warning"
                                : "rn-badge-active"
                            }`}
                            style={{ alignSelf: "flex-start", whiteSpace: "nowrap" }}
                          >
                            {statusDisplay}
                          </span>
                          {p.renewedDetails && (
                            <div style={{ display: "flex", flexDirection: "column", fontSize: "11px", color: "var(--rn-text-muted)", marginTop: "2px", gap: "2px" }}>
                              <span style={{ whiteSpace: "nowrap" }}>
                                📅 Expiry: {formatDate(p.renewedDetails.expiryDate)}
                              </span>
                              <span style={{ fontWeight: "600", color: "#2e7d32" }}>
                                💰 Prem: {formatPremium(p.renewedDetails.premium)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 12. Actions (3-dot dropdown) */}
                      <td style={{ width: colWidths[11] + "px" }}>
                        <div className="rn-dropdown">
                          <button className="rn-dropdown-btn" onClick={(e) => openActionMenu(p.id, e)}>
                            <MoreVertical size={16} />
                          </button>
                          {activeDropdownRowId === p.id &&
                            typeof document !== "undefined" &&
                            createPortal(
                              <>
                                <div
                                  style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 999,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeActionMenu();
                                  }}
                                />
                                <div
                                  className="rn-dropdown-menu"
                                  style={{
                                    position: "fixed",
                                    zIndex: 10000,
                                    top: `${dropdownPosition?.top || 0}px`,
                                    left: `${dropdownPosition?.left || 0}px`,
                                    right: "auto",
                                    width: `${dropdownPosition?.width || 230}px`,
                                  }}
                                >
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleViewPolicyDrawer(p);
                                    }}
                                  >
                                    <Eye size={14} /> View Details
                                  </button>
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleEditRenewal(p);
                                    }}
                                  >
                                    <Edit3 size={14} /> Edit Renewal
                                  </button>
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleAddRemark(p);
                                    }}
                                  >
                                    <MessageSquare size={14} /> Add Remark
                                  </button>
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleCall(p);
                                    }}
                                  >
                                    <Phone size={14} /> Call Customer
                                  </button>
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleWhatsApp(p);
                                    }}
                                  >
                                    <Send size={14} style={{ color: "#25d366" }} /> Send WhatsApp
                                  </button>
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleMarkRenewed(p);
                                    }}
                                  >
                                    <CheckCircle size={14} style={{ color: "var(--rn-success)" }} /> Mark
                                    Renewed
                                  </button>
                                  <button
                                    className="rn-dropdown-item rn-dropdown-item-danger"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleMarkLost(p);
                                    }}
                                  >
                                    <XCircle size={14} /> Mark Lost
                                  </button>
                                  <button
                                    className="rn-dropdown-item"
                                    onClick={() => {
                                      setActiveDropdownRowId(null);
                                      handleReassignUser(p);
                                    }}
                                  >
                                    <UserPlus size={14} /> Reassign User
                                  </button>
                                </div>
                              </>,
                              document.body,
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

          {/* Timeline Feed Panel */}
          <div className="rn-table-container" style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#ffffff", boxShadow: "0 2px 6px rgba(15, 23, 42, 0.02)", overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
              <MessageSquare size={15} style={{ color: "#2563eb" }} />
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                Renewal Timeline & Remarks
              </h3>
            </div>
            <div style={{ padding: "18px" }}>
              {timeline.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: "13.5px" }}>
                  <MessageSquare size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px auto", display: "block" }} />
                  No comments or timeline logs recorded.
                </div>
              ) : (
                <>
                  <div className="rn-timeline-filters">
                    <input
                    type="text"
                    className="rn-input"
                    placeholder="Search remarks"
                    value={timelineFilters.q}
                    onChange={(e) => setTimelineFilters((prev) => ({ ...prev, q: e.target.value }))}
                  />
                  <select
                    className="rn-input"
                    value={timelineFilters.status}
                    onChange={(e) => setTimelineFilters((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">All Statuses</option>
                    <option value="tone-info">New / Info</option>
                    <option value="tone-warning">Follow-up</option>
                    <option value="tone-success">Renewed / Active</option>
                    <option value="tone-danger">Lost / Expired</option>
                    <option value="tone-neutral">Neutral</option>
                  </select>
                  <select
                    className="rn-input"
                    value={timelineFilters.policy}
                    onChange={(e) => setTimelineFilters((prev) => ({ ...prev, policy: e.target.value }))}
                  >
                    <option value="">All Policy Types</option>
                    {timelinePolicyOptions.map((policy) => (
                      <option key={policy} value={policy}>
                        {policy}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="rn-input"
                    value={timelineFilters.date}
                    onChange={(e) => setTimelineFilters((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                {filteredTimeline.length === 0 ? (
                  <p
                    style={{
                      color: "var(--rn-text-secondary)",
                      fontSize: "14px",
                      margin: 0,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    No remarks match the selected filters.
                  </p>
                ) : (
                  <div className="rn-timeline-scroll">
                    <div className="rn-timeline">
                      {filteredTimeline.map((item) => (
                        <div key={item.id} className="rn-timeline-item">
                          <div
                            className={`rn-timeline-dot ${
                              item.type === "RENEWED"
                                ? "renewed"
                                : item.type === "LOST" || item.type === "NOT_INTERESTED"
                                  ? "lost"
                                  : ""
                            }`}
                          />
                          <div className="rn-timeline-content">
                            <div className="rn-timeline-header">
                              <span className="rn-timeline-author">{item.createdBy}</span>
                              <span>{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="rn-timeline-body">
                              <div style={{ marginBottom: "4px" }}>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "var(--rn-text-muted)",
                                  }}
                                >
                                  POLICY: {item.policyType} ({item.policyNumber})
                                </span>
                              </div>
                              {item.type === "WHATSAPP_SENT" && item.recipientPhone ? (
                                <div style={{ fontSize: "11px", color: "var(--rn-text-muted)", marginBottom: "6px" }}>
                                  WhatsApp sent to: {item.recipientPhone}
                                </div>
                              ) : null}
                              <p style={{ margin: "4px 0 8px 0", whiteSpace: "pre-wrap" }}>{item.text}</p>
                              {item.nextFollowUpDate && (
                                <div
                                  style={{ fontSize: "11px", color: "var(--rn-primary)", fontWeight: "500" }}
                                >
                                  Next Follow-Up scheduled for: {formatDate(item.nextFollowUpDate)} via{" "}
                                  {item.followUpMode || "Call"}
                                </div>
                              )}
                              <div style={{ marginTop: "6px" }}>
                                <span
                                  className={`rn-timeline-badge ${getRenewalToneClass(item.newStatus || item.type)}`}
                                >
                                  {item.oldStatus} &rarr; {item.newStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW DETAILS SIDE DRAWER */}
      {profileDrawerOpen && profileDrawerData && (
        <div className="rn-drawer-backdrop" onClick={() => setProfileDrawerOpen(false)}>
          <div className="rn-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="rn-drawer-header">
              <h3 className="rn-drawer-title">Profile & Policy View</h3>
              <button className="rn-drawer-close" onClick={() => setProfileDrawerOpen(false)}>
                &times;
              </button>
            </div>

            <div className="rn-drawer-body">
              {profileDrawerLoading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>Loading details...</div>
              ) : (
                <>
                  {/* Customer Information */}
                  <div className="rn-drawer-section">
                    <h4 className="rn-drawer-section-title">Contact Information</h4>
                    <div className="rn-drawer-grid">
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Contact Person Name</span>
                        <span className="rn-drawer-value">
                          {profileDrawerData.profile?.contactPerson ||
                            profileDrawerData.profile?.name ||
                            "N/A"}
                        </span>
                      </div>
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Phone Number</span>
                        <span className="rn-drawer-value">
                          {profileDrawerData.profile?.phone?.startsWith("NO-MOBILE-")
                            ? "N/A"
                            : profileDrawerData.profile?.phone}
                        </span>
                      </div>
                      <div className="rn-drawer-item rn-drawer-grid-full">
                        <span className="rn-drawer-label">Email Address</span>
                        <span className="rn-drawer-value">{profileDrawerData.profile?.email || "N/A"}</span>
                      </div>
                      <div className="rn-drawer-item rn-drawer-grid-full">
                        <span className="rn-drawer-label">Address</span>
                        <span className="rn-drawer-value">{profileDrawerData.profile?.address || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Policy Details */}
                  {profileDrawerData.policy && (
                    <div className="rn-drawer-section">
                      <h4 className="rn-drawer-section-title">Policy Details</h4>
                      <div className="rn-drawer-grid">
                        <div className="rn-drawer-item">
                          <span className="rn-drawer-label">Policy Number</span>
                          <span className="rn-drawer-value">
                            {profileDrawerData.policy.policyNumber || "N/A"}
                          </span>
                        </div>
                        <div className="rn-drawer-item">
                          <span className="rn-drawer-label">Insurance Company</span>
                          <span className="rn-drawer-value">
                            {profileDrawerData.policy.insuranceCompany || "N/A"}
                          </span>
                        </div>
                        <div className="rn-drawer-item">
                          <span className="rn-drawer-label">Product Type</span>
                          <span className="rn-drawer-value">
                            {profileDrawerData.policy.displayPolicyType ||
                              profileDrawerData.policy.policyType ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="rn-drawer-item">
                          <span className="rn-drawer-label">Premium</span>
                          <span className="rn-drawer-value">
                            ₹
                            {(
                              profileDrawerData.policy.premium ||
                              profileDrawerData.policy.totalPremium ||
                              0
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="rn-drawer-item rn-drawer-grid-full">
                          <span className="rn-drawer-label">Validity Period</span>
                          <span className="rn-drawer-value">
                            {formatDate(profileDrawerData.policy.startDate)} to{" "}
                            {formatDate(profileDrawerData.policy.expiryDate)}(
                            {profileDrawerData.policy.daysRemaining !== undefined &&
                            profileDrawerData.policy.daysRemaining !== null
                              ? `${profileDrawerData.policy.daysRemaining} days`
                              : "N/A"}
                            )
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Renewal Lifecycle Status */}
                  <div className="rn-drawer-section">
                    <h4 className="rn-drawer-section-title">Renewal Status</h4>
                    <div className="rn-drawer-grid">
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Current Status</span>
                        <span className="rn-drawer-value">
                          <span
                            className={`rn-badge ${
                              profileDrawerData.policy?.renewalStatus === "RENEWED"
                                ? "rn-badge-success"
                                : ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
                                      profileDrawerData.policy?.renewalStatus,
                                    )
                                  ? "rn-badge-danger"
                                  : profileDrawerData.policy?.renewalStatus === "Follow-Up"
                                    ? "rn-badge-warning"
                                    : profileDrawerData.policy?.renewalStatus === "EXPIRED"
                                      ? "rn-badge-danger"
                                      : "rn-badge-active"
                            }`}
                          >
                            {profileDrawerData.policy?.renewalStatus || "ACTIVE"}
                          </span>
                        </span>
                      </div>
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Assigned User</span>
                        <span className="rn-drawer-value">
                          {profileDrawerData.policy?.assignedTo || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Trail Timeline */}
                  <div className="rn-drawer-section">
                    <h4 className="rn-drawer-section-title">Timeline & Logs</h4>
                    <div className="rn-audit-timeline">
                      {profileAuditLogs.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "var(--rn-text-muted)", margin: 0 }}>
                          No audit logs recorded for this policy.
                        </p>
                      ) : (
                        profileAuditLogs.map((log) => {
                          let dotClass = "";
                          if (log.action === "Remark Added") dotClass = "remarked";
                          if (log.action === "Status Changed") dotClass = "status-updated";
                          if (log.action === "Marked Renewed") dotClass = "renewed";
                          if (log.action === "Marked Lost") dotClass = "lost";
                          if (log.action === "User Reassigned") dotClass = "reassigned";

                          return (
                            <div className="rn-audit-item" key={log.id}>
                              <div className={`rn-audit-dot ${dotClass}`} />
                              <div className="rn-audit-header">
                                <span className="rn-audit-user">{log.userName || "System"}</span>
                                <span>{formatDate(log.timestamp || log.createdAt)}</span>
                              </div>
                              <div className="rn-audit-body">
                                <strong>{log.action}</strong>
                                {log.changes && log.changes.length > 0 && (
                                  <div className="rn-audit-changes">
                                    {log.changes.map((ch, idx) => (
                                      <span className="rn-audit-change-line" key={idx}>
                                        {ch.field}: {String(ch.oldValue || "N/A")} &rarr;{" "}
                                        {String(ch.newValue || "N/A")}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD REMARK MODAL */}
      {remarkModalOpen &&
        selectedPolicy &&
        renderPortal(
          <div
            className="tb-modal-backdrop renewal-action-modal-backdrop"
            onClick={() => setRemarkModalOpen(false)}
          >
            <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--rn-border)",
                  paddingBottom: "12px",
                }}
              >
                <h3>Add Follow-up Remark</h3>
                <button
                  onClick={() => setRemarkModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={submitRemark}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                  <div>
                    <label className="customer-meta-label">Remark Text *</label>
                    <textarea
                      className="rn-input"
                      style={{ width: "100%", height: "80px", marginTop: "4px" }}
                      placeholder="Enter details of conversation..."
                      value={remarkForm.text}
                      onChange={(e) => setRemarkForm({ ...remarkForm, text: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label className="customer-meta-label">Renewal Status *</label>
                      <select
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        value={remarkForm.status}
                        onChange={(e) => setRemarkForm({ ...remarkForm, status: e.target.value })}
                      >
                        <option value="Follow-Up">Follow-Up</option>
                        <option value="Interested">Interested</option>
                        <option value="Quote Sent">Quote Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Pending Approval">Pending Approval</option>
                      </select>
                    </div>
                    <div>
                      <label className="customer-meta-label">Follow-up Date</label>
                      <input
                        type="datetime-local"
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        value={remarkForm.nextFollowUpDate}
                        onChange={(e) => setRemarkForm({ ...remarkForm, nextFollowUpDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div>
                      <label className="customer-meta-label">Priority</label>
                      <select
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        value={remarkForm.priority}
                        onChange={(e) => setRemarkForm({ ...remarkForm, priority: e.target.value })}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="customer-meta-label">Mode</label>
                      <select
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        value={remarkForm.mode}
                        onChange={(e) => setRemarkForm({ ...remarkForm, mode: e.target.value })}
                      >
                        <option value="Call">Phone Call</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">Email</option>
                        <option value="In-Person">In-Person</option>
                      </select>
                    </div>
                    <div>
                      <label className="customer-meta-label">Next Action</label>
                      <input
                        type="text"
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        placeholder="e.g. send quote"
                        value={remarkForm.nextAction}
                        onChange={(e) => setRemarkForm({ ...remarkForm, nextAction: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid var(--rn-border)",
                    marginTop: "24px",
                    paddingTop: "12px",
                  }}
                >
                  <button type="button" className="rn-btn" onClick={() => setRemarkModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rn-btn"
                    style={{
                      background: "#fff",
                      color: "var(--rn-text-primary)",
                      borderColor: "var(--rn-border)",
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Submitting..." : "Save Remark"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
        )}

      {/* EDIT RENEWAL MODAL */}
      {editModalOpen &&
        selectedPolicy &&
        renderPortal(
          <div
            className="tb-modal-backdrop renewal-action-modal-backdrop"
            onClick={() => setEditModalOpen(false)}
          >
            <div
              className="tb-modal-content rn-edit-contact-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--rn-border)",
                  paddingBottom: "12px",
                }}
              >
                <div className="rn-edit-contact-title">
                  <BrandLogo compact />
                  <h3>Edit Contact Information</h3>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
                >
                  &times;
                </button>
              </div>
              <form className="rn-edit-contact-form" onSubmit={submitEdit}>
                <div
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}
                >
                  <div>
                    <label className="customer-meta-label">Company Name *</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.insuredName}
                      onChange={(e) => setEditForm({ ...editForm, insuredName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Contact Person Name</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.contactPersonName}
                      onChange={(e) => setEditForm({ ...editForm, contactPersonName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Mobile Number</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      placeholder="10-digit number"
                      value={editForm.contactNumber}
                      onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Contact Email</label>
                    <input type="email" className="rn-input" style={{ width: "100%", marginTop: "4px" }} value={editForm.contactPersonEmail} onChange={(e) => setEditForm({ ...editForm, contactPersonEmail: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--rn-border)", paddingTop: "12px" }}>
                    <strong>Renewal Recipient</strong>
                  </div>
                  <div>
                    <label className="customer-meta-label">Recipient Name</label>
                    <input className="rn-input" style={{ width: "100%", marginTop: "4px" }} value={editForm.renewalRecipientName} onChange={(e) => setEditForm({ ...editForm, renewalRecipientName: e.target.value })} />
                  </div>
                  <div>
                    <label className="customer-meta-label">Recipient Mobile</label>
                    <input className="rn-input" style={{ width: "100%", marginTop: "4px" }} value={editForm.renewalRecipientMobile} onChange={(e) => setEditForm({ ...editForm, renewalRecipientMobile: e.target.value })} />
                  </div>
                  <div>
                    <label className="customer-meta-label">Recipient Email</label>
                    <input type="email" className="rn-input" style={{ width: "100%", marginTop: "4px" }} value={editForm.renewalRecipientEmail} onChange={(e) => setEditForm({ ...editForm, renewalRecipientEmail: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--rn-border)", paddingTop: "10px", display: "grid", gap: "3px" }}>
                    <strong>How should this change be applied?</strong>
                    <label className="rn-radio-option"><input type="radio" name="contactUpdateMode" value="policy_only" checked={editForm.contactUpdateMode === "policy_only"} onChange={(e) => setEditForm({ ...editForm, contactUpdateMode: e.target.value })} /> Update only this policy — keep it in {profile?.name || "the current"} portfolio</label>
                    <label className="rn-radio-option"><input type="radio" name="contactUpdateMode" value="move_existing" checked={editForm.contactUpdateMode === "move_existing"} onChange={(e) => setEditForm({ ...editForm, contactUpdateMode: e.target.value })} /> Move policy to an existing customer portfolio</label>
                    {editForm.contactUpdateMode === "move_existing" ? (
                      <select className="rn-input" value={editForm.targetPortfolioId} onChange={(e) => setEditForm({ ...editForm, targetPortfolioId: e.target.value })}>
                        <option value="">Select portfolio</option>
                        {portfolioOptions.filter((item) => item.id !== profile?.id).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.phone})</option>)}
                      </select>
                    ) : null}
                    <label className="rn-radio-option"><input type="radio" name="contactUpdateMode" value="create_portfolio" checked={editForm.contactUpdateMode === "create_portfolio"} onChange={(e) => setEditForm({ ...editForm, contactUpdateMode: e.target.value })} /> Create a new customer portfolio and move this policy</label>
                    {editForm.contactUpdateMode === "create_portfolio" ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <input className="rn-input" placeholder="Portfolio name" value={editForm.newPortfolioName} onChange={(e) => setEditForm({ ...editForm, newPortfolioName: e.target.value })} />
                        <input className="rn-input" placeholder="Primary mobile" value={editForm.newPortfolioMobile} onChange={(e) => setEditForm({ ...editForm, newPortfolioMobile: e.target.value })} />
                        <input type="email" className="rn-input" placeholder="Primary email" value={editForm.newPortfolioEmail} onChange={(e) => setEditForm({ ...editForm, newPortfolioEmail: e.target.value })} />
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <label className="customer-meta-label">Policy Number *</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.policyNumber}
                      onChange={(e) => setEditForm({ ...editForm, policyNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Insurance Company *</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.insuranceCompany}
                      onChange={(e) => setEditForm({ ...editForm, insuranceCompany: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Policy Type *</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.policyType}
                      onChange={(e) => setEditForm({ ...editForm, policyType: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Premium Amount (₹)</label>
                    <input
                      type="number"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.premium}
                      onChange={(e) => setEditForm({ ...editForm, premium: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Expiry Date *</label>
                    <input
                      type="date"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.expiryDate}
                      onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="customer-meta-label">Assigned User</label>
                    <select
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.assignedToUserId}
                      onChange={(e) => setEditForm({ ...editForm, assignedToUserId: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginTop: "12px",
                    borderTop: "1px solid var(--rn-border-light)",
                    paddingTop: "12px",
                  }}
                >
                  <label className="customer-meta-label">Status change remark (Optional)</label>
                  <input
                    type="text"
                    className="rn-input"
                    style={{ width: "100%" }}
                    placeholder="Enter details of changes..."
                    value={editForm.remark}
                    onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid var(--rn-border)",
                    marginTop: "24px",
                    paddingTop: "12px",
                  }}
                >
                  <button type="button" className="rn-btn" onClick={() => setEditModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rn-btn"
                    style={{
                      background: "var(--rn-primary)",
                      color: "#fff",
                      borderColor: "var(--rn-primary)",
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
        )}

      {/* RENEW POLICY FORM MODAL */}
      {renewModalOpen &&
        selectedPolicy &&
        renderPortal(
          <div
            className="tb-modal-backdrop renewal-action-modal-backdrop"
            onClick={() => setRenewModalOpen(false)}
          >
            <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--rn-border)",
                  paddingBottom: "12px",
                }}
              >
                <h3>Mark Policy as Renewed</h3>
                <button
                  onClick={() => setRenewModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={submitRenew}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
                  <div style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
                    Mark this renewal entry as renewed, then upload the renewed policy PDF.
                  </div>
                  <div>
                    <label className="customer-meta-label">Remarks</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      placeholder="e.g. Customer confirmed renewal"
                      value={renewForm.remark}
                      onChange={(e) => setRenewForm({ ...renewForm, remark: e.target.value })}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid var(--rn-border)",
                    marginTop: "24px",
                    paddingTop: "12px",
                  }}
                >
                  <button type="button" className="rn-btn" onClick={() => setRenewModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rn-btn"
                    style={{
                      background: "var(--rn-primary)",
                      color: "#fff",
                      borderColor: "var(--rn-primary)",
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Mark Renewed & Upload PDF"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
        )}

      {/* MARK LOST MODAL */}
      {lostModalOpen &&
        selectedPolicy &&
        renderPortal(
          <div
            className="tb-modal-backdrop renewal-action-modal-backdrop"
            onClick={() => setLostModalOpen(false)}
          >
            <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--rn-border)",
                  paddingBottom: "12px",
                }}
              >
                <h3>Mark Policy as Lost</h3>
                <button
                  onClick={() => setLostModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={submitLost}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                  <div>
                    <label className="customer-meta-label">Reason for Loss *</label>
                    <select
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={lostForm.lostReason}
                      onChange={(e) => setLostForm({ ...lostForm, lostReason: e.target.value })}
                    >
                      <option value="Premium High">Premium High</option>
                      <option value="Better Coverage Elsewhere">Better Coverage Elsewhere</option>
                      <option value="Customer Not Interested">Customer Not Interested</option>
                      <option value="Wrong Mobile Number">Wrong Mobile Number</option>
                      <option value="Renewed Elsewhere">Renewed Elsewhere</option>
                      <option value="No Response">No Response</option>
                    </select>
                  </div>
                  <div>
                    <label className="customer-meta-label">Details / Remarks</label>
                    <textarea
                      className="rn-input"
                      style={{ width: "100%", height: "80px", marginTop: "4px" }}
                      placeholder="Enter loss feedback details..."
                      value={lostForm.remarks}
                      onChange={(e) => setLostForm({ ...lostForm, remarks: e.target.value })}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid var(--rn-border)",
                    marginTop: "24px",
                    paddingTop: "12px",
                  }}
                >
                  <button type="button" className="rn-btn" onClick={() => setLostModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rn-btn"
                    style={{ color: "var(--rn-danger)", borderColor: "var(--rn-danger)" }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Confirm Lost Status"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
        )}

      {/* REASSIGN USER MODAL */}
      {reassignModalOpen &&
        selectedPolicy &&
        renderPortal(
          <div
            className="tb-modal-backdrop renewal-action-modal-backdrop"
            onClick={() => setReassignModalOpen(false)}
          >
            <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--rn-border)",
                  paddingBottom: "12px",
                }}
              >
                <h3>Reassign Policy Agent</h3>
                <button
                  onClick={() => setReassignModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={submitReassign}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                  <div>
                    <label className="customer-meta-label">Select Agent *</label>
                    <select
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={reassignForm.assignedToUserId}
                      onChange={(e) => setReassignForm({ ...reassignForm, assignedToUserId: e.target.value })}
                      required
                    >
                      <option value="">Choose Agent...</option>
                      {teamMembers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="customer-meta-label">Reassignment Note (Optional)</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      placeholder="Reason for reassigning agent..."
                      value={reassignForm.note}
                      onChange={(e) => setReassignForm({ ...reassignForm, note: e.target.value })}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid var(--rn-border)",
                    marginTop: "24px",
                    paddingTop: "12px",
                  }}
                >
                  <button type="button" className="rn-btn" onClick={() => setReassignModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rn-btn"
                    style={{
                      background: "var(--rn-primary)",
                      color: "#fff",
                      borderColor: "var(--rn-primary)",
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Reassigning..." : "Confirm Reassignment"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
        )}

      {/* WHATSAPP TEMPLATE PREVIEW MODAL */}
      {whatsappPreviewOpen && (
        <ModalPortal>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(8px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setWhatsAppPreviewOpen(false)}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "960px",
                maxHeight: "90vh",
                background: "#ffffff",
                borderRadius: "20px",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}>
                    <MessageCircle size={19} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em" }}>
                      WhatsApp Reminder Preview
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                      Configure recipient destination, template message & calculation quote images
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsAppPreviewOpen(false)}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "all 0.2s" }}
                >
                  <X size={18} style={{ strokeWidth: 2 }} />
                </button>
              </div>

              {whatsappTemplates && (
                <>
                {/* Scrollable Content Body */}
                <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Destination Card */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 16px" }}>
                    <WhatsAppRecipientPicker
                      type={whatsappRecipientType}
                      onTypeChange={(value) => {
                        setWhatsAppRecipientType(value);
                        if (value === "individual") setWhatsAppGroupId("");
                      }}
                      groupId={whatsappGroupId}
                      onGroupChange={setWhatsAppGroupId}
                      contactPhone={whatsappPhone}
                      disabled={actionLoading}
                    />
                  </div>

                  {/* Main Grid: Left Editor (65%) vs Right Contact Card (35%) */}
                  <div className="rn-whatsapp-preview-layout">
                    <div className="rn-whatsapp-preview-main">
                      {/* Navigation View Switcher */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: "4px", background: "#f8fafc", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          {[
                            ["message", "Message Preview"],
                            ["fields", "Custom Fields"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setWhatsAppPreviewView(value)}
                              style={{
                                padding: "5px 12px",
                                fontSize: "12px",
                                fontWeight: 500,
                                borderRadius: "6px",
                                border: whatsappPreviewView === value ? "1px solid #cbd5e1" : "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                ...(whatsappPreviewView === value
                                  ? { background: "#ffffff", color: "#0f172a", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }
                                  : { background: "transparent", color: "#64748b" }),
                              }}
                            >
                              {value === "message" ? <MessageSquare size={14} /> : <Tag size={14} />}
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {whatsappPreviewView === "fields" ? (
                        <div style={{ overflowX: "auto" }}>
                          <table className="rn-table" style={{ minWidth: "100%" }}>
                            <thead><tr><th>Field Name</th><th>Placeholder</th><th>Example Value</th></tr></thead>
                            <tbody>
                              {whatsappCustomFields.map((field) => (
                                <tr key={field.placeholder}>
                                  <td>{field.label}</td>
                                  <td><code>{field.placeholder}</code></td>
                                  <td>{field.example}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <>
                          {whatsappRecipientGroups.length > 1 ? (
                            <div style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontWeight: 500 }}>
                              ℹ️ This portfolio will be sent as {whatsappRecipientGroups.length} separate messages by renewal recipient.
                            </div>
                          ) : null}

                          {/* Template Context Pills */}
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", display: "block", marginBottom: "6px" }}>
                              Template Context
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {Object.keys(whatsappTemplates).map((type) => {
                                const isActive = selectedTemplateType === type;
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTemplateType(type);
                                      setEditedWhatsAppMessage(whatsappTemplates[type]);
                                    }}
                                    style={{
                                      fontSize: "12px",
                                      fontWeight: isActive ? 600 : 500,
                                      padding: "5px 13px",
                                      borderRadius: "6px",
                                      border: isActive ? "1.5px solid #0f172a" : "1px solid #e2e8f0",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      background: "#ffffff",
                                      boxShadow: isActive ? "0 1px 3px rgba(15,23,42,0.06)" : "none",
                                    }}
                                  >
                                    <span style={{ color: isActive ? "#0f172a" : "#64748b", fontWeight: isActive ? 600 : 500 }}>
                                      {type.replaceAll("_", " ").toUpperCase()}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Message Editor Textarea */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b" }}>
                                Message Content (Editable)
                              </label>
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {editedWhatsAppMessage ? `${editedWhatsAppMessage.length} characters` : ""}
                              </span>
                            </div>
                            <textarea
                              style={{
                                width: "100%",
                                height: "170px",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                fontSize: "13px",
                                lineHeight: "1.5",
                                padding: "12px 14px",
                                borderRadius: "10px",
                                border: "1px solid #cbd5e1",
                                background: "#fafafa",
                                color: "#0f172a",
                                outline: "none",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
                                resize: "vertical",
                              }}
                              value={editedWhatsAppMessage}
                              onChange={(e) => setEditedWhatsAppMessage(e.target.value)}
                            />
                          </div>

                          {/* Renewal Quotes (Auto Detected) Section */}
                          <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", background: "#f8fafc" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 600, color: "#0f172a" }}>
                                    Renewal Quotes & Calculation Sheets
                                  </h4>
                                  {renewalQuotesLoading ? (
                                    <span style={{ fontSize: "10px", background: "#e2e8f0", color: "#475569", padding: "2px 8px", borderRadius: "10px", fontWeight: 500 }}>
                                      Searching…
                                    </span>
                                  ) : null}
                                </div>
                                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                                  Attach quote images or quotation PDFs for this vehicle.
                                </p>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                  type="button"
                                  style={{ padding: "5px 11px", fontSize: "12px", fontWeight: 500, cursor: "pointer", background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                  onClick={() => {
                                    fetchGroupQuotesGallery();
                                    setShowGroupGalleryModal(true);
                                  }}
                                >
                                  <Users size={14} /> Select from Group
                                </button>
                                <button
                                  type="button"
                                  style={{ padding: "5px 11px", fontSize: "12px", fontWeight: 500, cursor: "pointer", background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                  onClick={() => setShowAddQuoteForm(!showAddQuoteForm)}
                                >
                                  {showAddQuoteForm ? (
                                    <><X size={14} /> Cancel Upload</>
                                  ) : (
                                    <><Upload size={14} /> Upload Quote (Image / PDF)</>
                                  )}
                                </button>
                              </div>
                            </div>

                            {showAddQuoteForm && (
                              <div style={{ marginTop: "12px", padding: "14px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#ffffff" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "8px", color: "#0f172a" }}>
                                  Upload Quote (Image or PDF Document)
                                </label>
                                <div style={{ marginBottom: "12px" }}>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    style={{ fontSize: "12px", color: "#334155" }}
                                    onChange={handleQuoteFileUpload}
                                  />
                                  {manualQuoteFileName && (
                                    <div style={{ fontSize: "11px", color: "#0f172a", marginTop: "6px", fontWeight: 500 }}>
                                      Selected file: <code>{manualQuoteFileName}</code>
                                    </div>
                                  )}
                                  {manualQuoteFileBase64 && (
                                    <div style={{ marginTop: "8px" }}>
                                      {manualQuoteFileBase64.startsWith("data:application/pdf") || manualQuoteFileName?.toLowerCase().endsWith(".pdf") ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                          <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <FileText size={20} style={{ color: "#dc2626" }} />
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {manualQuoteFileName || "Quote Document.pdf"}
                                            </div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                                              PDF Document attached
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 600, background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                            onClick={() => setPreviewQuoteImage({ src: manualQuoteFileBase64, isPdf: true, filename: manualQuoteFileName || "Quote.pdf" })}
                                          >
                                            <Eye size={13} /> Preview
                                          </button>
                                        </div>
                                      ) : (
                                        <div style={{ position: "relative", display: "inline-block" }}>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={manualQuoteFileBase64}
                                            alt="Quote Preview"
                                            style={{ maxHeight: "100px", borderRadius: "6px", border: "1px solid #cbd5e1", objectFit: "cover", display: "block" }}
                                          />
                                          <button
                                            type="button"
                                            style={{ position: "absolute", bottom: "4px", right: "4px", background: "rgba(15, 23, 42, 0.75)", color: "#ffffff", border: "none", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
                                            onClick={() => setPreviewQuoteImage({ src: manualQuoteFileBase64, isPdf: false })}
                                          >
                                            <ZoomIn size={11} /> Zoom
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <textarea
                                  className="rn-input"
                                  style={{ width: "100%", height: "65px", fontSize: "12px", fontFamily: "monospace", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fafafa" }}
                                  placeholder="Optional notes e.g. TATA AIG - OD: ₹452, TP: ₹714, Total: ₹999..."
                                  value={manualQuoteText}
                                  onChange={(e) => setManualQuoteText(e.target.value)}
                                />
                                <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                  <button
                                    type="button"
                                    style={{ padding: "5px 11px", fontSize: "12px", fontWeight: 500, cursor: "pointer", background: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                                    onClick={() => {
                                      setShowAddQuoteForm(false);
                                      setManualQuoteFileBase64("");
                                      setManualQuoteFileName("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    style={{ padding: "5px 13px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "#ffffff", color: "#0f172a", border: "1px solid #0f172a", borderRadius: "6px" }}
                                    disabled={savingManualQuote || (!manualQuoteText.trim() && !manualQuoteFileBase64)}
                                    onClick={handleSaveManualQuote}
                                  >
                                    {savingManualQuote ? "Saving..." : "Attach Quote"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {renewalQuotes.length === 0 && !showAddQuoteForm ? (
                              <div style={{ marginTop: "10px", padding: "10px", borderRadius: "8px", background: "#ffffff", border: "1px solid #e2e8f0", color: "#64748b", fontSize: "12px", textAlign: "center" }}>
                                No matching quote attached for this vehicle yet. Click <strong>Upload Quote</strong> or <strong>Select from Group</strong> to attach image or PDF.
                              </div>
                            ) : null}

                            {renewalQuotes.length > 0 && (
                              <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                                {renewalQuotes.map((quote) => {
                                  const imageSrc = quote.mediaBase64 || quote.attachmentUrl || (quote.attachmentData ? (quote.attachmentData.startsWith("data:") ? quote.attachmentData : `data:image/jpeg;base64,${quote.attachmentData}`) : null);
                                  const isSelected = selectedRenewalQuoteIds.includes(quote.id);
                                  const isPdf = quote.attachmentType === "document" ||
                                    String(quote.attachmentFileName || "").toLowerCase().endsWith(".pdf") ||
                                    String(quote.fileName || "").toLowerCase().endsWith(".pdf") ||
                                    String(quote.messageBody || "").toLowerCase().endsWith(".pdf") ||
                                    (imageSrc && imageSrc.startsWith("data:application/pdf"));
                                  const displayName = quote.attachmentFileName || quote.fileName || (isPdf ? "Quote Document.pdf" : "Quote Image");

                                  return (
                                    <div key={quote.id} style={{ border: isSelected ? "1px solid #0f172a" : "1px solid #e2e8f0", borderRadius: "8px", background: "#ffffff", padding: "10px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                          {quote.vehicleNumber ? (
                                            <>
                                              <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2.5px 8px", borderRadius: "6px" }}>
                                                {quote.vehicleNumber}
                                              </span>
                                              {quote.groupName && (
                                                <span style={{ fontSize: "11px", color: "#64748b" }}>
                                                  {quote.groupName}
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span style={{ fontSize: "11.5px", fontWeight: 500, color: "#0f172a", background: "#f8fafc", border: "1px solid #cbd5e1", padding: "2.5px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                              <FileText size={13} style={{ color: isPdf ? "#dc2626" : "#475569" }} />
                                              {quote.groupName || (isPdf ? "PDF Quote Upload" : "Image Quote Upload")}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                          <span style={{ fontSize: "11px", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontWeight: 500 }}>
                                            Matched
                                          </span>
                                          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleRenewalQuoteSelection(quote.id)}
                                              style={{ width: "15px", height: "15px", minWidth: "15px", minHeight: "15px", accentColor: "#0f172a", margin: 0, padding: 0, cursor: "pointer", appearance: "checkbox", WebkitAppearance: "checkbox" }}
                                            />
                                            <span style={{ whiteSpace: "nowrap" }}>{isPdf ? "Send PDF" : "Send Image"}</span>
                                          </label>
                                        </div>
                                      </div>
                                      {imageSrc ? (
                                        <div style={{ marginTop: "8px", padding: "8px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                                          {isPdf ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                              <div
                                                style={{ width: "42px", height: "42px", borderRadius: "6px", background: "#fee2e2", border: "1px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                                                onClick={() => setPreviewQuoteImage({ src: imageSrc, isPdf: true, filename: displayName })}
                                              >
                                                <FileText size={22} style={{ color: "#dc2626" }} />
                                              </div>
                                              <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                  {displayName}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                  PDF Quote Attached • Click preview to view
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                              <div style={{ position: "relative", cursor: "pointer", overflow: "hidden", borderRadius: "4px" }} onClick={() => setPreviewQuoteImage({ src: imageSrc, isPdf: false })}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                  src={imageSrc}
                                                  alt="Quote Calculation"
                                                  style={{ height: "55px", width: "85px", objectFit: "cover", border: "1px solid #cbd5e1", display: "block" }}
                                                />
                                                <div style={{ position: "absolute", bottom: "2px", right: "2px", background: "rgba(15, 23, 42, 0.75)", color: "#ffffff", borderRadius: "3px", padding: "1px 5px", fontSize: "9px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                                  <ZoomIn size={10} /> Zoom
                                                </div>
                                              </div>
                                              <div>
                                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                                                  Quote Image Attached
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                  Click preview to view calculation sheet
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          <button
                                            type="button"
                                            style={{ padding: "5px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                                            onClick={() => setPreviewQuoteImage({ src: imageSrc, isPdf, filename: displayName })}
                                          >
                                            <Eye size={14} /> {isPdf ? "Preview PDF" : "Preview Image"}
                                          </button>
                                        </div>
                                      ) : null}
                                      {quote.messageBody && quote.messageBody !== quote.vehicleNumber && quote.messageBody !== quote.attachmentFileName ? (
                                        <div style={{ marginTop: "6px", fontSize: "12px", color: "#475569", whiteSpace: "pre-wrap" }}>
                                          {quote.messageBody}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {whatsappRecipientType === "individual" ? <WhatsAppContactCard
                      details={whatsappContactDetails}
                      onEdit={() => {
                        const policy = policies.find((item) => item.id === whatsappContactDetails?.policyId);
                        setWhatsAppPreviewOpen(false);
                        if (policy) handleEditRenewal(policy);
                      }}
                    /> : null}
                  </div>
                </div>
                </>
              )}

              {/* Modal Footer Actions Bar */}
              <div style={{ padding: "14px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  style={{ padding: "8px 16px", fontSize: "12px", fontWeight: 600, background: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                >
                  <Clipboard size={14} /> Copy Text
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setWhatsAppPreviewOpen(false)}
                    style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    disabled={whatsappRecipientType === "group"
                      ? !whatsappGroupId
                      : whatsappRecipientGroups.length === 0 && String(whatsappPhone || "").replace(/\D/g, "").length < 10}
                    style={{
                      padding: "8px 22px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
                      opacity: (whatsappRecipientType === "group" ? !whatsappGroupId : whatsappRecipientGroups.length === 0 && String(whatsappPhone || "").replace(/\D/g, "").length < 10) ? 0.6 : 1,
                    }}
                  >
                    <Send size={15} style={{ color: "#ffffff" }} />
                    <span style={{ color: "#ffffff", fontWeight: 700 }}>Send WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {showGroupGalleryModal && (
        <ModalPortal>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(4px)",
              zIndex: 99998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setShowGroupGalleryModal(false)}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "750px",
                maxHeight: "85vh",
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    📱 Renwal Quote New — Group Quote Gallery
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Select an image or PDF quote captured from the WhatsApp group to attach to this customer.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className="rn-btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    onClick={fetchGroupQuotesGallery}
                  >
                    🔄 Sync WhatsApp Photos & Docs
                  </button>
                  <button
                    type="button"
                    style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontWeight: 700, color: "#64748b" }}
                    onClick={() => setShowGroupGalleryModal(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
                {loadingAllGroupQuotes ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    Searching group quotes & documents...
                  </div>
                ) : allGroupQuotes.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    No quotes found from <b>Renwal Quote New</b> yet.<br />
                    Use <b>+ Upload Quote</b> to attach a quote image or PDF directly!
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                    {allGroupQuotes.map((quote) => {
                      const imageSrc = quote.mediaBase64 || quote.attachmentUrl || (quote.attachmentData ? (quote.attachmentData.startsWith("data:") ? quote.attachmentData : `data:image/jpeg;base64,${quote.attachmentData}`) : null);
                      const isPdf = quote.attachmentType === "document" ||
                        String(quote.attachmentFileName || "").toLowerCase().endsWith(".pdf") ||
                        String(quote.fileName || "").toLowerCase().endsWith(".pdf") ||
                        String(quote.messageBody || "").toLowerCase().endsWith(".pdf") ||
                        (imageSrc && imageSrc.startsWith("data:application/pdf"));
                      const displayName = quote.attachmentFileName || quote.fileName || (isPdf ? "Quote Document.pdf" : "Quote Image");

                      return (
                        <div
                          key={quote.id}
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            padding: "10px",
                            background: "#fafafa",
                            display: "flex",
                            flexDirection: "column",
                            justify: "space-between",
                          }}
                        >
                          <div>
                            {imageSrc ? (
                              isPdf ? (
                                <div
                                  style={{ width: "100%", height: "130px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: "8px", padding: "10px", textAlign: "center" }}
                                  onClick={() => setPreviewQuoteImage({ src: imageSrc, isPdf: true, filename: displayName })}
                                >
                                  <FileText size={36} style={{ color: "#dc2626", marginBottom: "6px" }} />
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#991b1b", overflow: "hidden", textOverflow: "ellipsis", width: "100%", whiteSpace: "nowrap" }}>
                                    {displayName}
                                  </span>
                                  <span style={{ fontSize: "10px", color: "#b91c1c" }}>
                                    Click to preview PDF
                                  </span>
                                </div>
                              ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={imageSrc}
                                  alt="Group Quote"
                                  style={{ width: "100%", height: "130px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e2e8f0", cursor: "pointer", marginBottom: "8px" }}
                                  onClick={() => setPreviewQuoteImage({ src: imageSrc, isPdf: false })}
                                />
                              )
                            ) : (
                              <div style={{ height: "60px", background: "#e2e8f0", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "11px", marginBottom: "8px" }}>
                                Text Quote
                              </div>
                            )}
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a" }}>
                              {quote.vehicleNumber || "Vehicle Unspecified"}
                            </div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                              From: {quote.senderName} ({new Date(quote.receivedAt).toLocaleDateString()})
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rn-btn-primary"
                            style={{ marginTop: "10px", width: "100%", padding: "6px", fontSize: "11px", cursor: "pointer" }}
                            onClick={() => handleSelectQuoteFromGallery(quote)}
                          >
                            ✓ Select & Attach This Quote
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {previewQuoteImage && (() => {
        const isObj = typeof previewQuoteImage === "object" && previewQuoteImage !== null;
        const src = isObj ? previewQuoteImage.src : previewQuoteImage;
        const isPdf = isObj
          ? Boolean(previewQuoteImage.isPdf)
          : (String(src).startsWith("data:application/pdf") || String(src).toLowerCase().includes(".pdf"));
        const filename = (isObj ? previewQuoteImage.filename : null) || (isPdf ? "Quote_Document.pdf" : "Quote_Calculation.png");

        return (
          <ModalPortal>
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(6px)",
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
              }}
              onClick={() => setPreviewQuoteImage(null)}
            >
              <div
                style={{
                  position: "relative",
                  width: isPdf ? "85vw" : "auto",
                  maxWidth: isPdf ? "1000px" : "90vw",
                  maxHeight: "92vh",
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    {isPdf ? <FileText size={18} style={{ color: "#dc2626" }} /> : null}
                    {isPdf ? "Quote PDF Document Preview" : "🖼️ Quote Calculation Image Preview"}
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <a
                      href={src}
                      download={filename}
                      style={{ textDecoration: "none", fontSize: "12px", color: "#0284c7", fontWeight: 600, background: "#f0f9ff", padding: "5px 10px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      ⬇️ Download {isPdf ? "PDF" : "Image"}
                    </a>
                    <button
                      type="button"
                      style={{
                        background: "#f1f5f9",
                        border: "none",
                        borderRadius: "50%",
                        width: "30px",
                        height: "30px",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                      onClick={() => setPreviewQuoteImage(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {isPdf ? (
                  <iframe
                    src={src}
                    title="Quote PDF Document"
                    style={{ width: "100%", height: "75vh", minHeight: "500px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={src}
                    alt="Quote Image Preview"
                    style={{ maxWidth: "100%", maxHeight: "75vh", display: "block", borderRadius: "8px", objectFit: "contain", border: "1px solid #cbd5e1" }}
                  />
                )}
              </div>
            </div>
          </ModalPortal>
        );
      })()}
    </div>
  );
}
