"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { 
  Phone, 
  MessageSquare, 
  ArrowLeft,
  MoreVertical,
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  UserPlus,
  Send,
  Clipboard,
  User
} from "lucide-react";

const COL_HEADERS = [
  "Policy Number", 
  "Company Name",
  "Insurance Company", 
  "Policy Type", 
  "Premium", 
  "Sum Insured / IDV", 
  "Start Date", 
  "Expiry Date", 
  "Days Left", 
  "Renewal Status", 
  "Actions"
];

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(d.getDate()).padStart(2,"0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
  } catch { return dateStr; }
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
  if (status.includes("lost") || status.includes("wrong") || status.includes("not_interested") || status.includes("not interested") || status.includes("expired") || status.includes("overdue")) return "tone-danger";
  if (status.includes("follow") || status.includes("due") || status.includes("call")) return "tone-warning";
  if (status.includes("new") || status.includes("interest")) return "tone-info";
  return "tone-neutral";
};

export default function CustomerProfilePage(props) {
  const params = use(props.params);
  const router = useRouter();
  const phone = params.id;

  // Data state
  const [profile, setProfile] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({ totalPremium: 0, totalSumInsured: 0, totalPolicies: 0, policiesDue: 0, totalCompanies: 0 });
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Forms states
  const [remarkForm, setRemarkForm] = useState({ text: "", nextFollowUpDate: "", status: "Follow-Up", mode: "Call", priority: "Normal", nextAction: "" });
  const [editForm, setEditForm] = useState({ insuredName: "", contactNumber: "", policyNumber: "", insuranceCompany: "", policyType: "", premium: "", expiryDate: "", assignedToUserId: "", renewalStatus: "ACTIVE", remark: "", nextFollowUpDate: "" });
  const [renewForm, setRenewForm] = useState({ policyNumber: "", startDate: "", expiryDate: "", premium: "", remark: "" });
  const [lostForm, setLostForm] = useState({ lostReason: "Premium High", remarks: "" });
  const [reassignForm, setReassignForm] = useState({ assignedToUserId: "", note: "" });
  const [whatsappTemplates, setWhatsAppTemplates] = useState(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState("due_soon");
  const [editedWhatsAppMessage, setEditedWhatsAppMessage] = useState("");
  const [whatsappPhone, setWhatsAppPhone] = useState("");

  const [teamMembers, setTeamMembers] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Resizable columns
  const STORAGE_KEY = "rn-contact-policies-col-widths-v2";
  const DEFAULT_WIDTHS = [135, 160, 145, 120, 95, 110, 100, 105, 90, 120, 70];
  const [colWidths, setColWidths] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTHS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) && 
          parsed.length === DEFAULT_WIDTHS.length &&
          parsed.every(w => typeof w === "number" && !isNaN(w) && w > 0)
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
      setColWidths(prev => {
        const next = [...prev];
        next[index] = newWidth;
        return next;
      });
    };
    const onUp = () => {
      handle.classList.remove("resizing");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setColWidths(prev => {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prev)); } catch {}
        return prev;
      });
    };
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
    try {
      setLoading(true);
      const res = await fetch(`/api/renewals/customers/${phone}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.profile);
        setPolicies(data.policies || []);
        setCompanies(data.companies || []);
        setStats(data.stats);
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error("Failed to load customer profile details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
  }, [phone]);

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

  const handleCall = () => {
    if (profile && profile.phone && !profile.phone.startsWith("NO-MOBILE-")) {
      window.open(`tel:${profile.phone}`);
    } else {
      window.alert("No contact number available.");
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
        policy
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
    setRemarkForm({ text: "", nextFollowUpDate: "", status: "Follow-Up", mode: "Call", priority: "Normal", nextAction: "" });
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
          nextAction: remarkForm.nextAction
        })
      });
      if (res.ok) {
        setRemarkModalOpen(false);
        await fetchCustomerProfile();
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
  const handleEditRenewal = (policy) => {
    setSelectedPolicy(policy);
    
    const fmtDate = (dStr) => {
      if (!dStr) return "";
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      } catch { return ""; }
    };

    setEditForm({
      insuredName: policy.insuredName || "",
      contactNumber: policy.contactNumber || "",
      policyNumber: policy.policyNumber || "",
      insuranceCompany: policy.insuranceCompany || "",
      policyType: policy.policyType || "",
      premium: policy.premium || policy.totalPremium || "",
      expiryDate: fmtDate(policy.expiryDate),
      assignedToUserId: policy.assignedToId || "",
      renewalStatus: policy.renewalStatus || "ACTIVE",
      remark: "",
      nextFollowUpDate: ""
    });
    setEditModalOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editForm.insuredName.trim() || !editForm.policyNumber.trim() || !editForm.insuranceCompany.trim() || !editForm.policyType.trim() || !editForm.expiryDate) {
      window.alert("Please fill in all required fields.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/renewals/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy.id,
          ...editForm
        })
      });
      if (res.ok) {
        setEditModalOpen(false);
        await fetchCustomerProfile();
      } else {
        const err = await res.json();
        window.alert(err.error || "Failed to update policy.");
      }
    } catch {
      window.alert("Failed to update policy.");
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
      remark: ""
    });
    setRenewModalOpen(true);
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
            remark: renewForm.remark
          }
        })
      });
      if (res.ok) {
        setRenewModalOpen(false);
        await fetchCustomerProfile();
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
          remarks: lostForm.remarks
        })
      });
      if (res.ok) {
        setLostModalOpen(false);
        await fetchCustomerProfile();
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
  const handleReassignUser = (policy) => {
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
          note: reassignForm.note
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReassignModalOpen(false);
        await fetchCustomerProfile();
      } else {
        window.alert(data.error || "Failed to reassign agent.");
      }
    } catch {
      window.alert("Failed to reassign agent.");
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp Combined Message
  const handleWhatsApp = async (policy = null) => {
    setWhatsAppPhone("");
    setWhatsAppTemplates(null);
    setSelectedTemplateType("due_soon");
    setEditedWhatsAppMessage("");

    try {
      setActionLoading(true);
      // We pass the phone so it consolidates all due policies
      const res = await fetch("/api/renewals/whatsapp-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: profile.phone,
          policyId: policy ? policy.id : undefined
        })
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
      await fetch("/api/renewals/whatsapp-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: profile.phone,
          logAudit: true
        })
      });
    } catch (e) {
      console.error("Failed to log WhatsApp audit:", e);
    }

    const encoded = encodeURIComponent(editedWhatsAppMessage);
    window.open(`https://wa.me/${whatsappPhone}?text=${encoded}`, "_blank");
    setWhatsAppPreviewOpen(false);
    await fetchCustomerProfile();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p>Loading customer profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Customer portfolio profile not found.</p>
        <button className="rn-btn" onClick={() => router.push("/dashboard/renewals/customers")}>Back to Customers</button>
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
          onClick={() => router.push("/dashboard/renewals/customers")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={14} /> Back to Portfolios
        </button>
      </div>

      <div className="customer-profile-layout">
        {/* Left Panel: Customer summary & KPIs */}
        <div className="customer-summary-panel">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--rn-border-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rn-text-secondary)" }}>
              <User size={20} />
            </div>
            <div>
              <h3 className="customer-profile-title" style={{ fontSize: "18px" }}>{profile.contactPerson || profile.name || "Contact Details"}</h3>
              <span className={`rn-badge ${
                profile.customerStatus === "Renewed" ? "rn-badge-success" :
                profile.customerStatus === "Lost" ? "rn-badge-danger" :
                profile.customerStatus === "Due Soon" ? "rn-badge-warning" : 
                ["Overdue", "Expired"].includes(profile.customerStatus) ? "rn-badge-danger" : "rn-badge-active"
              }`} style={{ marginTop: "4px" }}>
                {profile.customerStatus}
              </span>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button className="rn-btn" style={{ flex: 1 }} onClick={handleCall} disabled={isNoMobile}><Phone size={14} /> Call</button>
            <button className="rn-btn" style={{ flex: 1 }} onClick={() => handleWhatsApp()} disabled={isNoMobile}><MessageSquare size={14} /> WhatsApp</button>
          </div>

          <div style={{ borderTop: "1px solid var(--rn-border-light)", paddingTop: "16px" }} />
          
          <div className="customer-meta-item">
            <span className="customer-meta-label">Mobile Number</span>
            <span className="customer-meta-value">{isNoMobile ? "Not Available" : profile.phone}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Contact Person Name</span>
            <span className="customer-meta-value">{profile.contactPerson || "-"}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Email Address</span>
            <span className="customer-meta-value">{profile.email || "-"}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Address</span>
            <span className="customer-meta-value">{profile.address || "-"}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Assigned Agent</span>
            <span className="customer-meta-value">{profile.assignedTo || "Unassigned"}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Renewal Status</span>
            <span className="customer-meta-value">{profile.customerStatus || "Active"}</span>
          </div>

          <div style={{ borderTop: "1px solid var(--rn-border-light)", paddingTop: "16px" }} />

          <div className="customer-meta-item">
            <span className="customer-meta-label">Total Companies</span>
            <span className="customer-meta-value">{stats.totalCompanies || companies.length}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Total Premium (Booked)</span>
            <span className="customer-meta-value" style={{ fontWeight: "700" }}>₹{stats.totalPremium.toLocaleString("en-IN")}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Total Sum Insured</span>
            <span className="customer-meta-value">₹{stats.totalSumInsured.toLocaleString("en-IN")}</span>
          </div>

          <div className="customer-meta-item">
            <span className="customer-meta-label">Total policies</span>
            <span className="customer-meta-value">{stats.totalPolicies} ({stats.policiesDue} due)</span>
          </div>
        </div>

        {/* Right Panel: Associated Policies list and timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Associated Companies */}
          <div className="rn-table-container">
            <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>Associated Companies</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "16px" }}>
              {(companies.length ? companies : ["No company linked"]).map((company) => (
                <span key={company} className="rn-badge rn-company-badge" style={{ whiteSpace: "normal", textAlign: "left" }}>
                  {company}
                </span>
              ))}
            </div>
          </div>
          
          {/* Associated Policies Table */}
          <div className="rn-table-container">
            <div style={{ padding: "16px", borderBottom: "1px solid var(--rn-border)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: 0 }}>Associated Policies</h3>
            </div>
            
            <table 
              className="rn-table"
              style={{ 
                width: "100%", 
                minWidth: colWidths.reduce((sum, w) => sum + w, 0) + "px",
                tableLayout: "fixed"
              }}
            >
              <thead>
                <tr>
                  {COL_HEADERS.map((header, idx) => (
                    <th key={header} style={{ width: colWidths[idx] + "px", position: "relative" }}>
                      {header}
                      <div
                        className="rn-resize-handle"
                        onMouseDown={(e) => handleResizeStart(idx, e)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => {
                  const daysLeft = p.daysRemaining !== undefined ? p.daysRemaining : null;
                  
                  return (
                    <tr key={p.id}>
                      {/* 1. Policy Number */}
                      <td style={{ width: colWidths[0] + "px", fontWeight: "600" }}>
                        <span className="rn-cell-link" onClick={() => handleViewPolicyDrawer(p)}>
                          {p.policyNumber || "N/A"}
                        </span>
                      </td>

                      {/* 2. Company Name */}
                      <td style={{ width: colWidths[1] + "px" }}>{p.insuredName || "-"}</td>

                      {/* 3. Insurance Company */}
                      <td style={{ width: colWidths[2] + "px" }}>{p.insuranceCompany || "-"}</td>

                      {/* 4. Policy Type */}
                      <td style={{ width: colWidths[3] + "px" }}>{p.displayPolicyType || p.policyType || "-"}</td>

                      {/* 5. Premium */}
                      <td style={{ width: colWidths[4] + "px" }}>{formatPremium(p.premium || p.totalPremium)}</td>

                      {/* 6. Sum Insured */}
                      <td style={{ width: colWidths[5] + "px" }}>{formatPremium(p.sumInsured)}</td>

                      {/* 7. Start Date */}
                      <td style={{ width: colWidths[6] + "px" }}>{formatDate(p.startDate)}</td>

                      {/* 8. Expiry Date */}
                      <td style={{ width: colWidths[7] + "px" }}>{formatDate(p.expiryDate)}</td>

                      {/* 9. Days Left */}
                      <td style={{ width: colWidths[8] + "px" }}>
                        <span className={getDaysClass(daysLeft)}>{getDaysText(daysLeft)}</span>
                      </td>

                      {/* 10. Renewal Status */}
                      <td style={{ width: colWidths[9] + "px" }}>
                        <span className={`rn-badge ${
                          p.renewalStatus === "RENEWED" ? "rn-badge-success" :
                          ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(p.renewalStatus) ? "rn-badge-danger" :
                          p.renewalStatus === "Follow-Up" ? "rn-badge-warning" :
                          p.renewalStatus === "EXPIRED" ? "rn-badge-danger" : "rn-badge-active"
                        }`}>
                          {p.renewalStatus || "ACTIVE"}
                        </span>
                      </td>

                      {/* 11. Actions (3-dot dropdown) */}
                      <td 
                        style={{ width: colWidths[10] + "px" }}
                      >
                        <div className="rn-dropdown">
                          <button 
                            className="rn-dropdown-btn" 
                            onClick={(e) => openActionMenu(p.id, e)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeDropdownRowId === p.id && typeof document !== "undefined" && createPortal(
                            <>
                              <div 
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                                onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} 
                              />
                              <div 
                                className="rn-dropdown-menu" 
                                style={{ 
                                  position: "fixed",
                                  zIndex: 10000,
                                  top: `${dropdownPosition?.top || 0}px`,
                                  left: `${dropdownPosition?.left || 0}px`,
                                  right: "auto",
                                  width: `${dropdownPosition?.width || 230}px`
                                }}
                              >
                                <button className="rn-dropdown-item" onClick={() => { setActiveDropdownRowId(null); handleViewPolicyDrawer(p); }}><Eye size={14} /> View Details</button>
                                <button className="rn-dropdown-item" onClick={() => { setActiveDropdownRowId(null); handleEditRenewal(p); }}><Edit3 size={14} /> Edit Renewal</button>
                                <button className="rn-dropdown-item" onClick={() => { setActiveDropdownRowId(null); handleAddRemark(p); }}><MessageSquare size={14} /> Add Remark</button>
                                <button className="rn-dropdown-item" onClick={() => { setActiveDropdownRowId(null); handleCall(); }}><Phone size={14} /> Call Customer</button>
                                <button className="rn-dropdown-item" onClick={() => { setActiveDropdownRowId(null); handleWhatsApp(p); }}><Send size={14} style={{ color: '#25d366' }} /> Send WhatsApp</button>
                                <button className="rn-dropdown-item" onClick={() => { setActiveDropdownRowId(null); handleMarkRenewed(p); }}><CheckCircle size={14} style={{ color: 'var(--rn-success)' }} /> Mark Renewed</button>
                                <button className="rn-dropdown-item rn-dropdown-item-danger" onClick={() => { setActiveDropdownRowId(null); handleMarkLost(p); }}><XCircle size={14} /> Mark Lost</button>
                                <button className="rn-dropdown-item" onClick={() => { setActiveDropdownRowId(null); handleReassignUser(p); }}><UserPlus size={14} /> Reassign User</button>
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Timeline Feed Panel */}
          <div className="rn-table-container" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--rn-text-primary)", margin: "0 0 20px 0" }}>Renewal Timeline & Remarks</h3>
            
            {timeline.length === 0 ? (
              <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px", margin: 0 }}>No comments or timeline logs recorded.</p>
            ) : (
              <div className="rn-timeline">
                {timeline.map((item) => (
                  <div key={item.id} className="rn-timeline-item">
                    <div className={`rn-timeline-dot ${
                      item.type === "RENEWED" ? "renewed" : 
                      item.type === "LOST" || item.type === "NOT_INTERESTED" ? "lost" : ""
                    }`} />
                    <div className="rn-timeline-content">
                      <div className="rn-timeline-header">
                        <span className="rn-timeline-author">{item.createdBy}</span>
                        <span>{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="rn-timeline-body">
                        <div style={{ marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--rn-text-muted)" }}>POLICY: {item.policyType} ({item.policyNumber})</span>
                        </div>
                        <p style={{ margin: "4px 0 8px 0" }}>{item.text}</p>
                        {item.nextFollowUpDate && (
                          <div style={{ fontSize: "11px", color: "var(--rn-primary)", fontWeight: "500" }}>
                            Next Follow-Up scheduled for: {formatDate(item.nextFollowUpDate)} via {item.followUpMode || "Call"}
                          </div>
                        )}
                        <div style={{ marginTop: "6px" }}>
                          <span className={`rn-timeline-badge ${getRenewalToneClass(item.newStatus || item.type)}`}>
                            {item.oldStatus} &rarr; {item.newStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW DETAILS SIDE DRAWER */}
      {profileDrawerOpen && profileDrawerData && (
        <div className="rn-drawer-backdrop" onClick={() => setProfileDrawerOpen(false)}>
          <div className="rn-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="rn-drawer-header">
              <h3 className="rn-drawer-title">Profile & Policy View</h3>
              <button className="rn-drawer-close" onClick={() => setProfileDrawerOpen(false)}>&times;</button>
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
                        <span className="rn-drawer-value">{profileDrawerData.profile?.contactPerson || profileDrawerData.profile?.name || "N/A"}</span>
                      </div>
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Phone Number</span>
                        <span className="rn-drawer-value">{profileDrawerData.profile?.phone?.startsWith("NO-MOBILE-") ? "N/A" : profileDrawerData.profile?.phone}</span>
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
                          <span className="rn-drawer-value">{profileDrawerData.policy.policyNumber || "N/A"}</span>
                        </div>
                        <div className="rn-drawer-item">
                          <span className="rn-drawer-label">Insurance Company</span>
                          <span className="rn-drawer-value">{profileDrawerData.policy.insuranceCompany || "N/A"}</span>
                        </div>
                        <div className="rn-drawer-item">
                          <span className="rn-drawer-label">Product Type</span>
                          <span className="rn-drawer-value">{profileDrawerData.policy.displayPolicyType || profileDrawerData.policy.policyType || "N/A"}</span>
                        </div>
                        <div className="rn-drawer-item">
                          <span className="rn-drawer-label">Premium</span>
                          <span className="rn-drawer-value">₹{(profileDrawerData.policy.premium || profileDrawerData.policy.totalPremium || 0).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="rn-drawer-item rn-drawer-grid-full">
                          <span className="rn-drawer-label">Validity Period</span>
                          <span className="rn-drawer-value">
                            {formatDate(profileDrawerData.policy.startDate)} to {formatDate(profileDrawerData.policy.expiryDate)} 
                            ({profileDrawerData.policy.daysRemaining !== undefined && profileDrawerData.policy.daysRemaining !== null ? `${profileDrawerData.policy.daysRemaining} days` : "N/A"})
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
                          <span className={`rn-badge ${
                            profileDrawerData.policy?.renewalStatus === "RENEWED" ? "rn-badge-success" :
                            ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(profileDrawerData.policy?.renewalStatus) ? "rn-badge-danger" :
                            profileDrawerData.policy?.renewalStatus === "Follow-Up" ? "rn-badge-warning" :
                            profileDrawerData.policy?.renewalStatus === "EXPIRED" ? "rn-badge-danger" : "rn-badge-active"
                          }`}>
                            {profileDrawerData.policy?.renewalStatus || "ACTIVE"}
                          </span>
                        </span>
                      </div>
                      <div className="rn-drawer-item">
                        <span className="rn-drawer-label">Assigned User</span>
                        <span className="rn-drawer-value">{profileDrawerData.policy?.assignedTo || "Unassigned"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Trail Timeline */}
                  <div className="rn-drawer-section">
                    <h4 className="rn-drawer-section-title">Timeline & Logs</h4>
                    <div className="rn-audit-timeline">
                      {profileAuditLogs.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "var(--rn-text-muted)", margin: 0 }}>No audit logs recorded for this policy.</p>
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
                                        {ch.field}: {String(ch.oldValue || 'N/A')} &rarr; {String(ch.newValue || 'N/A')}
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
      {remarkModalOpen && selectedPolicy && renderPortal(
        <div className="tb-modal-backdrop renewal-action-modal-backdrop" onClick={() => setRemarkModalOpen(false)}>
          <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rn-border)", paddingBottom: "12px" }}>
              <h3>Add Follow-up Remark</h3>
              <button onClick={() => setRemarkModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
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
                    onChange={(e) => setRemarkForm({...remarkForm, text: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, status: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, nextFollowUpDate: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, priority: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, mode: e.target.value})}
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
                      onChange={(e) => setRemarkForm({...remarkForm, nextAction: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--rn-border)", marginTop: "24px", paddingTop: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setRemarkModalOpen(false)}>Cancel</button>
                <button type="submit" className="rn-btn" style={{ background: "var(--rn-primary)", color: "#fff", borderColor: "var(--rn-primary)" }} disabled={actionLoading}>
                  {actionLoading ? "Submitting..." : "Save Remark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RENEWAL MODAL */}
      {editModalOpen && selectedPolicy && renderPortal(
        <div className="tb-modal-backdrop renewal-action-modal-backdrop" onClick={() => setEditModalOpen(false)}>
          <div className="tb-modal-content" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rn-border)", paddingBottom: "12px" }}>
              <h3>Edit Renewal Record</h3>
              <button onClick={() => setEditModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <form onSubmit={submitEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                <div>
                  <label className="customer-meta-label">Company Name *</label>
                  <input 
                    type="text" 
                    className="rn-input" 
                    style={{ width: "100%", marginTop: "4px" }}
                    value={editForm.insuredName}
                    onChange={(e) => setEditForm({...editForm, insuredName: e.target.value})}
                    required
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
                    onChange={(e) => setEditForm({...editForm, contactNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="customer-meta-label">Policy Number *</label>
                  <input 
                    type="text" 
                    className="rn-input" 
                    style={{ width: "100%", marginTop: "4px" }}
                    value={editForm.policyNumber}
                    onChange={(e) => setEditForm({...editForm, policyNumber: e.target.value})}
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
                    onChange={(e) => setEditForm({...editForm, insuranceCompany: e.target.value})}
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
                    onChange={(e) => setEditForm({...editForm, policyType: e.target.value})}
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
                    onChange={(e) => setEditForm({...editForm, premium: e.target.value})}
                  />
                </div>
                <div>
                  <label className="customer-meta-label">Expiry Date *</label>
                  <input 
                    type="date" 
                    className="rn-input" 
                    style={{ width: "100%", marginTop: "4px" }}
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({...editForm, expiryDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="customer-meta-label">Assigned User</label>
                  <select 
                    className="rn-input" 
                    style={{ width: "100%", marginTop: "4px" }}
                    value={editForm.assignedToUserId}
                    onChange={(e) => setEditForm({...editForm, assignedToUserId: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", borderTop: "1px solid var(--rn-border-light)", paddingTop: "12px" }}>
                <label className="customer-meta-label">Status change remark (Optional)</label>
                <input 
                  type="text" 
                  className="rn-input" 
                  style={{ width: "100%" }}
                  placeholder="Enter details of changes..."
                  value={editForm.remark}
                  onChange={(e) => setEditForm({...editForm, remark: e.target.value})}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--rn-border)", marginTop: "24px", paddingTop: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="rn-btn" style={{ background: "var(--rn-primary)", color: "#fff", borderColor: "var(--rn-primary)" }} disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENEW POLICY FORM MODAL */}
      {renewModalOpen && selectedPolicy && renderPortal(
        <div className="tb-modal-backdrop renewal-action-modal-backdrop" onClick={() => setRenewModalOpen(false)}>
          <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rn-border)", paddingBottom: "12px" }}>
              <h3>Mark Policy as Renewed</h3>
              <button onClick={() => setRenewModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
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
                    onChange={(e) => setRenewForm({...renewForm, policyNumber: e.target.value})}
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
                      onChange={(e) => setRenewForm({...renewForm, startDate: e.target.value})}
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
                      onChange={(e) => setRenewForm({...renewForm, expiryDate: e.target.value})}
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
                      onChange={(e) => setRenewForm({...renewForm, premium: e.target.value})}
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
                    onChange={(e) => setRenewForm({...renewForm, remark: e.target.value})}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--rn-border)", marginTop: "24px", paddingTop: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setRenewModalOpen(false)}>Cancel</button>
                <button type="submit" className="rn-btn" style={{ background: "var(--rn-primary)", color: "#fff", borderColor: "var(--rn-primary)" }} disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "Complete Renewal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK LOST MODAL */}
      {lostModalOpen && selectedPolicy && renderPortal(
        <div className="tb-modal-backdrop renewal-action-modal-backdrop" onClick={() => setLostModalOpen(false)}>
          <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rn-border)", paddingBottom: "12px" }}>
              <h3>Mark Policy as Lost</h3>
              <button onClick={() => setLostModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <form onSubmit={submitLost}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div>
                  <label className="customer-meta-label">Reason for Loss *</label>
                  <select 
                    className="rn-input" 
                    style={{ width: "100%", marginTop: "4px" }}
                    value={lostForm.lostReason}
                    onChange={(e) => setLostForm({...lostForm, lostReason: e.target.value})}
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
                    onChange={(e) => setLostForm({...lostForm, remarks: e.target.value})}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--rn-border)", marginTop: "24px", paddingTop: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setLostModalOpen(false)}>Cancel</button>
                <button type="submit" className="rn-btn" style={{ color: "var(--rn-danger)", borderColor: "var(--rn-danger)" }} disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "Confirm Lost Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN USER MODAL */}
      {reassignModalOpen && selectedPolicy && renderPortal(
        <div className="tb-modal-backdrop renewal-action-modal-backdrop" onClick={() => setReassignModalOpen(false)}>
          <div className="tb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rn-border)", paddingBottom: "12px" }}>
              <h3>Reassign Policy Agent</h3>
              <button onClick={() => setReassignModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            <form onSubmit={submitReassign}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div>
                  <label className="customer-meta-label">Select Agent *</label>
                  <select 
                    className="rn-input" 
                    style={{ width: "100%", marginTop: "4px" }}
                    value={reassignForm.assignedToUserId}
                    onChange={(e) => setReassignForm({...reassignForm, assignedToUserId: e.target.value})}
                    required
                  >
                    <option value="">Choose Agent...</option>
                    {teamMembers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
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
                    onChange={(e) => setReassignForm({...reassignForm, note: e.target.value})}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--rn-border)", marginTop: "24px", paddingTop: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setReassignModalOpen(false)}>Cancel</button>
                <button type="submit" className="rn-btn" style={{ background: "var(--rn-primary)", color: "#fff", borderColor: "var(--rn-primary)" }} disabled={actionLoading}>
                  {actionLoading ? "Reassigning..." : "Confirm Reassignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP TEMPLATE PREVIEW MODAL */}
      {whatsappPreviewOpen && renderPortal(
        <div className="tb-modal-backdrop renewal-action-modal-backdrop" onClick={() => setWhatsAppPreviewOpen(false)}>
          <div className="tb-modal-content" style={{ maxWidth: "550px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rn-border)", paddingBottom: "12px" }}>
              <h3>WhatsApp Reminder Preview</h3>
              <button onClick={() => setWhatsAppPreviewOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>&times;</button>
            </div>
            
            {whatsappTemplates && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div>
                  <label className="customer-meta-label">Template Context</label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    {Object.keys(whatsappTemplates).map(type => (
                      <button 
                        key={type} 
                        type="button" 
                        className="rn-btn"
                        style={{ 
                          fontSize: "12px", 
                          padding: "6px 10px",
                          ...(selectedTemplateType === type && { background: "var(--rn-primary-light)", color: "var(--rn-primary)", borderColor: "var(--rn-primary)" })
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
                    style={{ width: "100%", height: "180px", marginTop: "4px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.4" }}
                    value={editedWhatsAppMessage}
                    onChange={(e) => setEditedWhatsAppMessage(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--rn-border)", marginTop: "24px", paddingTop: "12px" }}>
              <button type="button" className="rn-btn" onClick={handleCopyMessage} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Clipboard size={14} /> Copy text
              </button>
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" className="rn-btn" onClick={() => setWhatsAppPreviewOpen(false)}>Cancel</button>
                <button type="button" className="rn-btn" onClick={handleSendWhatsApp} style={{ background: "#25d366", color: "#fff", borderColor: "#25d366" }}>
                  <Send size={14} /> Send WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

