"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Search,
  Phone,
  MessageSquare,
  User,
  AlertCircle,
  MoreVertical,
  Eye,
  FileText,
  Edit3,
  CheckCircle,
  XCircle,
  UserPlus,
  Send,
  Clipboard,
} from "lucide-react";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";

const COL_HEADERS = [
  "Contact Person Name",
  "Mobile Number",
  "Total Companies",
  "Total Policies",
  "Policies Due",
  "Nearest Expiry Date",
  "Assigned Agent",
  "Customer Status",
  "Actions",
];

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export default function CustomerRenewalsPage() {
  const router = useRouter();

  // Filter and Data states
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeCompanyFilter, setActiveCompanyFilter] = useState("All");
  const [activePolicyTypeFilter, setActivePolicyTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({ all: 0, motor: 0, warehouse: 0, other: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new window.URLSearchParams(window.location.search);
      const comp = params.get("company") || "All";
      const pol = params.get("policyType") || "All";
      setActiveCompanyFilter(comp);
      setActivePolicyTypeFilter(pol);
    }
  }, []);

  // Interactive UI states
  const [activeDropdownRowId, setActiveDropdownRowId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const [hoverCard, setHoverCard] = useState(null);

  // Lazy load side drawer state
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileDrawerLoading, setProfileDrawerLoading] = useState(false);
  const [profileDrawerData, setProfileDrawerData] = useState(null);
  const [profileAuditLogs, setProfileAuditLogs] = useState([]);

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [whatsappPreviewOpen, setWhatsAppPreviewOpen] = useState(false);

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
  const [selectedTemplateType, setSelectedTemplateType] = useState("due_soon");
  const [editedWhatsAppMessage, setEditedWhatsAppMessage] = useState("");
  const [whatsappPhone, setWhatsAppPhone] = useState("");

  const [teamMembers, setTeamMembers] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Resizable columns
  const STORAGE_KEY = "rn-customer-col-widths";
  const DEFAULT_WIDTHS = [180, 130, 110, 110, 110, 130, 130, 130, 60];
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
    const onUp = () => {
      handle.classList.remove("resizing");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setColWidths((prev) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
        } catch {}
        return prev;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const openActionMenu = (rowId, event) => {
    event.stopPropagation();
    setHoverCard(null);

    if (activeDropdownRowId === rowId) {
      setActiveDropdownRowId(null);
      setDropdownPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 372;
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

  const isFirstLoadRef = useRef(true);

  const fetchCustomers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const url = `/api/renewals/customers?q=${encodeURIComponent(q)}&status=${statusFilter}&page=${page}&limit=10&company=${encodeURIComponent(activeCompanyFilter)}&policyType=${encodeURIComponent(activePolicyTypeFilter)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.customers) {
        setCustomers(data.customers);
        setTotalPages(data.pages || 1);
        setTotalCount(data.totalCount || 0);
      }

      // Fetch LOB Category counts in parallel
      const qEncoded = encodeURIComponent(q);
      const companyEncoded = encodeURIComponent(activeCompanyFilter);
      const [allRes, motorRes, fireRes, otherRes] = await Promise.all([
        fetch(`/api/renewals/customers?q=${qEncoded}&status=${statusFilter}&page=1&limit=1&company=${companyEncoded}&policyType=All`),
        fetch(`/api/renewals/customers?q=${qEncoded}&status=${statusFilter}&page=1&limit=1&company=${companyEncoded}&policyType=Motor`),
        fetch(`/api/renewals/customers?q=${qEncoded}&status=${statusFilter}&page=1&limit=1&company=${companyEncoded}&policyType=Fire`),
        fetch(`/api/renewals/customers?q=${qEncoded}&status=${statusFilter}&page=1&limit=1&company=${companyEncoded}&policyType=Other`),
      ]);
      const [allData, motorData, fireData, otherData] = await Promise.all([
        allRes.json(),
        motorRes.json(),
        fireRes.json(),
        otherRes.json(),
      ]);
      setTabCounts({
        all: allData.totalCount || 0,
        motor: motorData.totalCount || 0,
        warehouse: fireData.totalCount || 0,
        other: otherData.totalCount || 0,
      });

    } catch (error) {
      console.error("Failed to load customer renewals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isFirst = isFirstLoadRef.current;
    if (isFirst) {
      isFirstLoadRef.current = false;
      fetchCustomers(false);
    } else {
      fetchCustomers(true);
    }
  }, [page, statusFilter, activeCompanyFilter, activePolicyTypeFilter]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (res.ok && data.users) {
          setTeamMembers(data.users);
        }
      } catch (err) {
        console.error("Failed to fetch team:", err);
      }
    };
    fetchTeam();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  // Hover Events
  const handleHoverEnter = (customer, e) => {
    if (activeDropdownRowId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cardHeight = 180;
    const cardWidth = 320;

    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;

    if (left + cardWidth > window.innerWidth) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (rect.bottom + cardHeight > window.innerHeight) {
      top = rect.top + window.scrollY - cardHeight - 6;
    }

    setHoverCard({
      customer,
      top,
      left,
    });
  };

  const handleHoverLeave = () => {
    setHoverCard(null);
  };

  // On-demand fetch policy helper for actions
  const fetchAndSelectPolicy = async (cust, callback) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/renewals/customers/${cust.mobile}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const policy = data.policies.find((p) => p.id === cust.nearest_due_policy_id) || data.policies[0];
        if (policy) {
          setSelectedPolicy(policy);
          callback(policy);
        } else {
          window.alert("No policy found in this portfolio.");
        }
      }
    } catch (err) {
      console.error("Failed to fetch policy details:", err);
      window.alert("Failed to load policy details.");
    } finally {
      setActionLoading(false);
    }
  };

  // View Policy drawer
  const handleViewPolicyDrawer = async (cust) => {
    setProfileDrawerOpen(true);
    setProfileDrawerLoading(true);
    setProfileDrawerData(null);
    setProfileAuditLogs([]);

    try {
      const [profileRes, auditRes] = await Promise.all([
        fetch(`/api/renewals/customers/${cust.mobile}`),
        fetch(`/api/renewals/audit?policyId=${cust.nearest_due_policy_id}`),
      ]);
      const profileData = await profileRes.json();
      const auditData = await auditRes.json();

      if (profileRes.ok && profileData.success) {
        const matchedPolicy =
          profileData.policies.find((p) => p.id === cust.nearest_due_policy_id) || profileData.policies[0];
        setProfileDrawerData({
          ...profileData,
          policy: matchedPolicy,
        });
      }
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
  const handleAddRemark = (cust) => {
    setSelectedCustomer(cust);
    fetchAndSelectPolicy(cust, () => {
      setRemarkForm({
        text: "",
        nextFollowUpDate: "",
        status: "Follow-Up",
        mode: "Call",
        priority: "Normal",
        nextAction: "",
      });
      setRemarkModalOpen(true);
    });
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
        }),
      });
      if (res.ok) {
        setRemarkModalOpen(false);
        await fetchCustomers(true);
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to submit remark.");
      }
    } catch {
      window.alert("Failed to submit remark.");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Renewal
  const handleEditRenewal = (cust) => {
    setSelectedCustomer(cust);
    fetchAndSelectPolicy(cust, (policy) => {
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

      setEditForm({
        insuredName: policy.insuredName || "",
        contactPersonName:
          cust.contact_person_name === "Contact not available" ||
          cust.contact_person_name === "Unknown Contact"
            ? ""
            : cust.contact_person_name || "",
        contactNumber: policy.contactNumber || "",
        policyNumber: policy.policyNumber || "",
        insuranceCompany: policy.insuranceCompany || "",
        policyType: policy.policyType || "",
        premium: policy.premium || policy.totalPremium || "",
        expiryDate: fmtDate(policy.expiryDate),
        assignedToUserId: policy.assignedToId || "",
        renewalStatus: policy.renewalStatus || "ACTIVE",
        remark: "",
        nextFollowUpDate: "",
      });
      setEditModalOpen(true);
    });
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
      window.alert("Please fill in all required fields.");
      return;
    }
    if (editForm.contactNumber) {
      const normalized = normalizeIndianPhone(editForm.contactNumber);
      if (!normalized) {
        window.alert("Please enter a valid 10-digit Indian mobile number (starting with 6-9).");
        return;
      }
      editForm.contactNumber = normalized;
    }
    if (editForm.premium && (isNaN(parseFloat(editForm.premium)) || parseFloat(editForm.premium) < 0)) {
      window.alert("Premium must be a positive number.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          ...editForm,
        }),
      });
      if (res.ok) {
        setEditModalOpen(false);
        await fetchCustomers(true);
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to update renewal policy.");
      }
    } catch {
      window.alert("Failed to update renewal policy.");
    } finally {
      setActionLoading(false);
    }
  };

  // Renew Policy
  const handleMarkRenewed = (cust) => {
    setSelectedCustomer(cust);
    fetchAndSelectPolicy(cust, (policy) => {
      setRenewForm({
        policyNumber: "",
        startDate: "",
        expiryDate: "",
        premium: policy.premium || policy.totalPremium || "",
        remark: "",
      });
      setRenewModalOpen(true);
    });
  };

  const submitRenew = async (e) => {
    e.preventDefault();
    if (!renewForm.policyNumber || !renewForm.startDate || !renewForm.expiryDate || !renewForm.premium) {
      window.alert("All fields are required.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousPolicyId: selectedPolicy.id,
          renewedData: {
            policyNumber: renewForm.policyNumber,
            startDate: renewForm.startDate,
            expiryDate: renewForm.expiryDate,
            premium: renewForm.premium,
            remark: renewForm.remark,
          },
        }),
      });
      if (res.ok) {
        setRenewModalOpen(false);
        await fetchCustomers(true);
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to renew policy.");
      }
    } catch {
      window.alert("Failed to renew policy.");
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Lost
  const handleMarkLost = (cust) => {
    setSelectedCustomer(cust);
    fetchAndSelectPolicy(cust, () => {
      setLostForm({ lostReason: "Premium High", remarks: "" });
      setLostModalOpen(true);
    });
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
        }),
      });
      if (res.ok) {
        setLostModalOpen(false);
        await fetchCustomers(true);
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to mark policy as lost.");
      }
    } catch {
      window.alert("Failed to mark policy as lost.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reassign User
  const handleReassignUser = (cust) => {
    setSelectedCustomer(cust);
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
          phone: selectedCustomer.mobile,
          assignedToUserId: reassignForm.assignedToUserId,
          note: reassignForm.note,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReassignModalOpen(false);
        await fetchCustomers(true);
      } else {
        window.alert(data.error || "Failed to reassign portfolio.");
      }
    } catch {
      window.alert("Failed to reassign portfolio.");
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp combined message generator
  const handleWhatsApp = async (cust) => {
    setSelectedCustomer(cust);
    setWhatsAppPhone("");
    setWhatsAppTemplates(null);
    setSelectedTemplateType("due_soon");
    setEditedWhatsAppMessage("");

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/whatsapp-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cust.mobile }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsAppPhone(data.phone);
        setWhatsAppTemplates(data.templates);
        setSelectedTemplateType(data.defaultTemplate);
        setEditedWhatsAppMessage(data.templates[data.defaultTemplate]);
        setWhatsAppPreviewOpen(true);
      } else {
        window.alert(data.error || "Failed to load WhatsApp template.");
      }
    } catch (err) {
      console.error(err);
      window.alert("Failed to load WhatsApp template.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (!editedWhatsAppMessage) return;
    if (typeof window !== "undefined" && window.navigator && window.navigator.clipboard) {
      window.navigator.clipboard.writeText(editedWhatsAppMessage);
      window.alert("Message copied to clipboard!");
    } else {
      window.alert("Clipboard action not supported in this browser.");
    }
  };

  const handleSendWhatsApp = async () => {
    if (!editedWhatsAppMessage) return;

    try {
      // Log audit action
      try {
        await fetch("/api/renewals/whatsapp-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: selectedCustomer.mobile,
            logAudit: true,
          }),
        });
      } catch (e) {
        console.error("Failed to log WhatsApp audit:", e);
      }

      // Direct message send
      const res = await fetch("/api/operations/whatsapp/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: whatsappPhone,
          message: editedWhatsAppMessage,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.alert(`WhatsApp message sent successfully to ${selectedCustomer.insuredName}!`);
      } else {
        window.alert(`Failed to send WhatsApp message: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      window.alert("Failed to connect to the CRM WhatsApp API.");
    }

    setWhatsAppPreviewOpen(false);
    await fetchCustomers(true);
  };

  const handleCall = (cust) => {
    if (cust.mobile && !cust.mobile.startsWith("NO-MOBILE-")) {
      window.open(`tel:${cust.mobile}`);
    } else {
      window.alert("No phone number associated with this customer portfolio.");
    }
  };

  const renderPortal = (content) => {
    if (typeof document === "undefined") return content;
    return createPortal(content, document.body);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="rn-filters-bar">
        <div style={{ display: "flex", alignItems: "center", position: "relative", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "12px", color: "var(--rn-text-muted)" }} />
          <input
            type="text"
            className="rn-input"
            style={{ paddingLeft: "36px", width: "100%" }}
            placeholder="Search by contact person, mobile, or company..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className="rn-input"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All Customer Statuses</option>
          <option value="Due Soon">Expiry Soon / Due Soon</option>
          <option value="Expired">Expired</option>
          <option value="Renewed">Renewed</option>
          <option value="Lost">Lost</option>
        </select>

        <button type="submit" className="rn-btn">
          Search
        </button>
      </form>

      {/* Active filters display */}
      {(activeCompanyFilter !== "All" || activePolicyTypeFilter !== "All") && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
            padding: "4px 8px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid var(--rn-border)",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--rn-text-secondary)", fontWeight: "600" }}>
            Active Filters:
          </span>
          {activeCompanyFilter !== "All" && (
            <span
              className="rn-badge tone-info"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                borderRadius: "6px",
              }}
              onClick={() => {
                setActiveCompanyFilter("All");
                const params = new window.URLSearchParams(window.location.search);
                params.delete("company");
                router.replace(`${window.location.pathname}?${params.toString()}`);
              }}
            >
              Company: {activeCompanyFilter}
              <span style={{ fontSize: "14px", fontWeight: "700", marginLeft: "4px" }}>&times;</span>
            </span>
          )}
          {activePolicyTypeFilter !== "All" && (
            <span
              className="rn-badge tone-info"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                borderRadius: "6px",
              }}
              onClick={() => {
                setActivePolicyTypeFilter("All");
                const params = new window.URLSearchParams(window.location.search);
                params.delete("policyType");
                router.replace(`${window.location.pathname}?${params.toString()}`);
              }}
            >
              Policy Type: {activePolicyTypeFilter}
              <span style={{ fontSize: "14px", fontWeight: "700", marginLeft: "4px" }}>&times;</span>
            </span>
          )}
          <button
            type="button"
            style={{
              fontSize: "11px",
              color: "var(--rn-danger)",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: "700",
              textTransform: "uppercase",
              padding: "4px",
            }}
            onClick={() => {
              setActiveCompanyFilter("All");
              setActivePolicyTypeFilter("All");
              router.replace(window.location.pathname);
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid Table */}
      <div className="rn-table-container">
        <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>
            Contact Portfolios
          </h3>
        </div>

        {/* LOB Category filter tabs */}
        <div className="rn-lob-tabs">
          <button
            className={activePolicyTypeFilter === "All" ? "active" : ""}
            type="button"
            onClick={() => {
              setPage(1);
              setActivePolicyTypeFilter("All");
            }}
          >
            All Portfolios
            <span>{tabCounts.all}</span>
          </button>
          <button
            className={activePolicyTypeFilter === "Motor" ? "active" : ""}
            type="button"
            onClick={() => {
              setPage(1);
              setActivePolicyTypeFilter("Motor");
            }}
          >
            Motor Policy
            <span>{tabCounts.motor}</span>
          </button>
          <button
            className={activePolicyTypeFilter === "Fire" ? "active" : ""}
            type="button"
            onClick={() => {
              setPage(1);
              setActivePolicyTypeFilter("Fire");
            }}
          >
            Warehouse Policy
            <span>{tabCounts.warehouse}</span>
          </button>
          <button
            className={activePolicyTypeFilter === "Other" ? "active" : ""}
            type="button"
            onClick={() => {
              setPage(1);
              setActivePolicyTypeFilter("Other");
            }}
          >
            Other Policies
            <span>{tabCounts.other}</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <p>Loading customers list...</p>
          </div>
        ) : customers.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 0",
              gap: "8px",
            }}
          >
            <AlertCircle size={24} style={{ color: "var(--rn-text-muted)" }} />
            <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px" }}>
              No customer portfolios found.
            </p>
          </div>
        ) : (
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
              {customers.map((cust, idx) => {
                const isNoMobile = cust.mobile.startsWith("NO-MOBILE-");
                return (
                  <tr key={cust.mobile || idx}>
                    {/* 1. Contact Person Name */}
                    <td
                      style={{ width: colWidths[0] + "px" }}
                      onMouseEnter={(e) => handleHoverEnter(cust, e)}
                      onMouseLeave={handleHoverLeave}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "var(--rn-border-light)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--rn-text-secondary)",
                          }}
                        >
                          <User size={16} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span
                            className="rn-cell-link"
                            onClick={() =>
                              router.push(`/dashboard/renewals/customers/${encodeURIComponent(cust.mobile)}`)
                            }
                          >
                            {cust.contact_person_name || cust.contact_person || "Contact not available"}
                          </span>
                          {cust.company_names && (
                            <span
                              style={{ fontSize: "11px", color: "var(--rn-text-muted)", marginTop: "2px" }}
                            >
                              {cust.company_names}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Mobile Number */}
                    <td
                      style={{ width: colWidths[1] + "px" }}
                      onMouseEnter={(e) => handleHoverEnter(cust, e)}
                      onMouseLeave={handleHoverLeave}
                    >
                      {isNoMobile ? "Not Available" : cust.mobile}
                    </td>

                    {/* 3. Total Companies */}
                    <td style={{ width: colWidths[2] + "px", fontWeight: "500" }}>{cust.total_companies}</td>

                    {/* 4. Total Policies */}
                    <td style={{ width: colWidths[3] + "px", fontWeight: "500" }}>{cust.total_policies}</td>

                    {/* 5. Policies Due */}
                    <td
                      style={{
                        width: colWidths[4] + "px",
                        color: cust.policies_due > 0 ? "var(--rn-warning)" : "var(--rn-text-secondary)",
                        fontWeight: "600",
                      }}
                    >
                      {cust.policies_due}
                    </td>

                    {/* 6. Nearest Expiry Date */}
                    <td style={{ width: colWidths[5] + "px" }}>{formatDate(cust.nearest_expiry)}</td>

                    {/* 7. Assigned Agent */}
                    <td style={{ width: colWidths[6] + "px" }}>{cust.assigned_user || "Unassigned"}</td>

                    {/* 8. Customer Status */}
                    <td style={{ width: colWidths[7] + "px" }}>
                      <span
                        className={`rn-badge ${
                          cust.customer_status === "renewed" || cust.customer_status === "Renewed"
                            ? "rn-badge-success"
                            : cust.customer_status === "lost" || cust.customer_status === "Lost"
                              ? "rn-badge-danger"
                              : cust.customer_status === "expiry_soon" || cust.customer_status === "Due Soon"
                                ? "rn-badge-warning"
                                : ["Overdue", "Expired", "expired"].includes(cust.customer_status)
                                  ? "rn-badge-danger"
                                  : "rn-badge-active"
                        }`}
                      >
                        {cust.customer_status === "expiry_soon"
                          ? "Expiry Soon"
                          : cust.customer_status === "expired"
                            ? "Expired"
                            : cust.customer_status === "renewed"
                              ? "Renewed"
                              : cust.customer_status === "lost"
                                ? "Lost"
                                : cust.customer_status === "active"
                                  ? "Active"
                                  : cust.customer_status}
                      </span>
                    </td>

                    {/* 9. Actions (3-dot dropdown) */}
                    <td style={{ width: colWidths[8] + "px" }} onMouseEnter={() => setHoverCard(null)}>
                      <div className="rn-dropdown">
                        <button className="rn-dropdown-btn" onClick={(e) => openActionMenu(cust.mobile, e)}>
                          <MoreVertical size={16} />
                        </button>
                        {activeDropdownRowId === cust.mobile &&
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
                                    router.push(
                                      `/dashboard/renewals/customers/${encodeURIComponent(cust.mobile)}`,
                                    );
                                  }}
                                >
                                  <Eye size={14} /> View Profile
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleCall(cust);
                                  }}
                                >
                                  <Phone size={14} /> Call Customer
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleWhatsApp(cust);
                                  }}
                                >
                                  <Send size={14} style={{ color: "#25d366" }} /> Send WhatsApp
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleEditRenewal(cust);
                                  }}
                                >
                                  <Edit3 size={14} /> Edit Contact
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleAddRemark(cust);
                                  }}
                                >
                                  <MessageSquare size={14} /> Add Remark
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleReassignUser(cust);
                                  }}
                                >
                                  <UserPlus size={14} /> Assign Agent
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    router.push(
                                      `/dashboard/renewals/customers/${encodeURIComponent(cust.mobile)}`,
                                    );
                                  }}
                                >
                                  <FileText size={14} /> View Policies
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleViewPolicyDrawer(cust);
                                  }}
                                >
                                  <Clipboard size={14} /> View Renewal Timeline
                                </button>
                                <button
                                  className="rn-dropdown-item"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleMarkRenewed(cust);
                                  }}
                                >
                                  <CheckCircle size={14} style={{ color: "var(--rn-success)" }} /> Mark
                                  Renewed
                                </button>
                                <button
                                  className="rn-dropdown-item rn-dropdown-item-danger"
                                  onClick={() => {
                                    setActiveDropdownRowId(null);
                                    handleMarkLost(cust);
                                  }}
                                >
                                  <XCircle size={14} /> Mark Lost
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
        )}

        {/* Pagination */}
        <div className="rn-pagination">
          <span style={{ fontSize: "13px", color: "var(--rn-text-secondary)" }}>
            Page {page} of {totalPages} ({totalCount} customer portfolios)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="rn-btn" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button
              className="rn-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Floating Hover Card */}
      {hoverCard && hoverCard.customer && !activeDropdownRowId && (
        <div
          className="rn-hover-card"
          style={{
            position: "absolute",
            top: hoverCard.top + "px",
            left: hoverCard.left + "px",
          }}
        >
          <h4 className="rn-hover-title">{hoverCard.customer.contact_person_name || "Contact Details"}</h4>
          <div className="rn-hover-grid">
            <div className="rn-hover-item">
              <span className="rn-hover-label">Phone</span>
              <span className="rn-hover-value">
                {hoverCard.customer.mobile.startsWith("NO-MOBILE-") ? "N/A" : hoverCard.customer.mobile}
              </span>
            </div>
            <div className="rn-hover-item">
              <span className="rn-hover-label">Status</span>
              <span className="rn-hover-value">
                {hoverCard.customer.customer_status === "expiry_soon"
                  ? "Expiry Soon"
                  : hoverCard.customer.customer_status === "expired"
                    ? "Expired"
                    : hoverCard.customer.customer_status === "renewed"
                      ? "Renewed"
                      : hoverCard.customer.customer_status === "lost"
                        ? "Lost"
                        : hoverCard.customer.customer_status === "active"
                          ? "Active"
                          : hoverCard.customer.customer_status || "Active"}
              </span>
            </div>
            <div className="rn-hover-item">
              <span className="rn-hover-label">Companies</span>
              <span className="rn-hover-value">{hoverCard.customer.total_companies}</span>
            </div>
            <div className="rn-hover-item">
              <span className="rn-hover-label">Total Policies</span>
              <span className="rn-hover-value">{hoverCard.customer.total_policies}</span>
            </div>
            <div className="rn-hover-item">
              <span className="rn-hover-label">Policies Due</span>
              <span className="rn-hover-value">{hoverCard.customer.policies_due}</span>
            </div>
            <div className="rn-hover-item rn-hover-item-full">
              <span className="rn-hover-label">Nearest Expiry</span>
              <span className="rn-hover-value">{formatDate(hoverCard.customer.nearest_expiry)}</span>
            </div>
            <div className="rn-hover-item rn-hover-item-full">
              <span className="rn-hover-label">Assignee</span>
              <span className="rn-hover-value">{hoverCard.customer.assigned_user || "Unassigned"}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PROFILE SIDE DRAWER */}
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
                    <h4 className="rn-drawer-section-title">Renewal Portfolio Status</h4>
                    <div className="rn-drawer-grid">
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Current Status</span>
                        <span className="rn-drawer-value">
                          <span
                            className={`rn-badge ${
                              profileDrawerData.profile?.customerStatus === "Renewed"
                                ? "rn-badge-success"
                                : profileDrawerData.profile?.customerStatus === "Lost"
                                  ? "rn-badge-danger"
                                  : profileDrawerData.profile?.customerStatus === "Due Soon"
                                    ? "rn-badge-warning"
                                    : ["Overdue", "Expired"].includes(
                                          profileDrawerData.profile?.customerStatus,
                                        )
                                      ? "rn-badge-danger"
                                      : "rn-badge-active"
                            }`}
                          >
                            {profileDrawerData.profile?.customerStatus || "ACTIVE"}
                          </span>
                        </span>
                      </div>
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Assigned User</span>
                        <span className="rn-drawer-value">
                          {profileDrawerData.profile?.assignedTo || "Unassigned"}
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
                          if (log.action === "Status Updated") dotClass = "status-updated";
                          if (log.action === "Policy Renewed") dotClass = "renewed";
                          if (log.action === "Marked Lost") dotClass = "lost";
                          if (log.action === "User Reassigned") dotClass = "reassigned";

                          return (
                            <div className="rn-audit-item" key={log.id}>
                              <div className={`rn-audit-dot ${dotClass}`} />
                              <div className="rn-audit-header">
                                <span className="rn-audit-user">{log.userName || "System"}</span>
                                <span>{formatDate(log.createdAt)}</span>
                              </div>
                              <div className="rn-audit-body">
                                <strong>{log.action}</strong>
                                <span style={{ color: "var(--rn-text-secondary)" }}>{log.detailText}</span>
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
                        type="date"
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
                      background: "var(--rn-primary)",
                      color: "#fff",
                      borderColor: "var(--rn-primary)",
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
              className="tb-modal-content"
              style={{ maxWidth: "600px" }}
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
                <h3>Edit Renewal Record</h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={submitEdit}>
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
                      placeholder="Enter contact person name"
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
                  <div>
                    <label className="customer-meta-label">Customer Status</label>
                    <select
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      value={editForm.renewalStatus}
                      onChange={(e) => setEditForm({ ...editForm, renewalStatus: e.target.value })}
                    >
                      <option value="ACTIVE">Active (Auto-Calculate)</option>
                      <option value="RENEWED">Renewed</option>
                      <option value="LOST">Lost</option>
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
                  <div>
                    <label className="customer-meta-label">New Policy Number *</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      placeholder="Enter new policy number"
                      value={renewForm.policyNumber}
                      onChange={(e) => setRenewForm({ ...renewForm, policyNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label className="customer-meta-label">Start Date *</label>
                      <input
                        type="date"
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        value={renewForm.startDate}
                        onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="customer-meta-label">Expiry Date *</label>
                      <input
                        type="date"
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        value={renewForm.expiryDate}
                        onChange={(e) => setRenewForm({ ...renewForm, expiryDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                    <div>
                      <label className="customer-meta-label">New Premium Amount *</label>
                      <input
                        type="number"
                        className="rn-input"
                        style={{ width: "100%", marginTop: "4px" }}
                        value={renewForm.premium}
                        onChange={(e) => setRenewForm({ ...renewForm, premium: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="customer-meta-label">Remarks</label>
                    <input
                      type="text"
                      className="rn-input"
                      style={{ width: "100%", marginTop: "4px" }}
                      placeholder="e.g. customer negotiated well"
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
                    {actionLoading ? "Processing..." : "Complete Renewal"}
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
        selectedCustomer &&
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
                <h3>Reassign Portfolio Agent</h3>
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
      {whatsappPreviewOpen &&
        selectedCustomer &&
        renderPortal(
          <div
            className="tb-modal-backdrop renewal-action-modal-backdrop"
            onClick={() => setWhatsAppPreviewOpen(false)}
          >
            <div
              className="tb-modal-content"
              style={{ maxWidth: "550px" }}
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
                <h3>WhatsApp Reminder Preview</h3>
                <button
                  onClick={() => setWhatsAppPreviewOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
                >
                  &times;
                </button>
              </div>

              {whatsappTemplates && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                  <div>
                    <label className="customer-meta-label">Template Context</label>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      {Object.keys(whatsappTemplates).map((type) => (
                        <button
                          key={type}
                          type="button"
                          className="rn-btn"
                          style={{
                            fontSize: "12px",
                            padding: "6px 10px",
                            ...(selectedTemplateType === type && {
                              background: "var(--rn-primary-light)",
                              color: "var(--rn-primary)",
                              borderColor: "var(--rn-primary)",
                            }),
                          }}
                          onClick={() => {
                            setSelectedTemplateType(type);
                            setEditedWhatsAppMessage(whatsappTemplates[type]);
                          }}
                        >
                          {type.replace("_", " ").toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="customer-meta-label">Message Preview & Edit</label>
                    <textarea
                      className="rn-input"
                      style={{
                        width: "100%",
                        height: "180px",
                        marginTop: "4px",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        lineHeight: "1.4",
                      }}
                      value={editedWhatsAppMessage}
                      onChange={(e) => setEditedWhatsAppMessage(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--rn-border)",
                  marginTop: "24px",
                  paddingTop: "12px",
                }}
              >
                <button
                  type="button"
                  className="rn-btn"
                  onClick={handleCopyMessage}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Clipboard size={14} /> Copy text
                </button>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" className="rn-btn" onClick={() => setWhatsAppPreviewOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rn-btn"
                    onClick={handleSendWhatsApp}
                    style={{ background: "#25d366", color: "#fff", borderColor: "#25d366" }}
                  >
                    <Send size={14} /> Send WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>,
        )}
    </div>
  );
}
