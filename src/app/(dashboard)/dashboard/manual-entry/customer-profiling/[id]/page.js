"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  CheckCircle,
  Clipboard,
  MessageSquare,
  Phone,
  Send,
  UserRound,
  X,
  LayoutGrid,
  MoreVertical,
  Plus,
  User,
  MapPin,
  Shield,
} from "lucide-react";
import { formatPhoneForWhatsapp } from "@/lib/customer-profiles/utils";

const PROFILE_STATUS = [
  "New Lead",
  "Follow-up Required",
  "Interested",
  "Not Interested",
  "Converted",
  "Lost",
];
const FOLLOW_UP_OUTCOMES = [
  "Interested",
  "Call Back Later",
  "Not Interested",
  "Converted",
  "Wrong Number",
  "Not Reachable",
];
const WHATSAPP_TEMPLATE_LABELS = {
  follow_up: "Follow-up",
  information: "Information Request",
  quote_shared: "Quote Shared",
  meeting: "Meeting Reminder",
  thank_you: "Thank You",
  general: "General Update",
};
const LOB_OPTIONS = [
  "Motor Insurance",
  "Health Insurance",
  "Life Insurance",
  "Warehouse Insurance",
  "Fire Insurance",
  "Marine Insurance",
  "Travel Insurance",
  "Cyber Insurance",
  "Shop / Office Insurance",
  "Business Insurance",
  "Other",
];
const LOB_FIELDS = {
  "Motor Insurance": [
    ["vehicleType", "Vehicle Type"],
    ["vehicleNumber", "Vehicle Number"],
    ["existingPolicyAvailable", "Existing Policy Available?"],
    ["renewalDate", "Renewal Date", "date"],
  ],
  "Warehouse Insurance": [
    ["warehouseLocation", "Warehouse Location"],
    ["stockValue", "Stock Value"],
    ["existingInsuranceAvailable", "Existing Insurance Available?"],
    ["renewalDate", "Renewal Date", "date"],
  ],
  "Life Insurance": [
    ["age", "Age"],
    ["incomeRange", "Income Range"],
    ["familyMembers", "Family Members"],
    ["existingLifeCover", "Existing Life Cover?"],
  ],
  "Health Insurance": [
    ["familySize", "Family Size"],
    ["existingHealthCover", "Existing Health Cover?"],
    ["sumInsuredNeed", "Expected Sum Insured"],
    ["renewalDate", "Renewal Date", "date"],
  ],
  "Fire Insurance": [
    ["riskLocation", "Risk Location"],
    ["propertyValue", "Property Value"],
    ["occupancy", "Occupancy"],
    ["renewalDate", "Renewal Date", "date"],
  ],
  "Marine Insurance": [
    ["cargoType", "Cargo Type"],
    ["route", "Route"],
    ["annualTransitValue", "Annual Transit Value"],
    ["existingInsuranceAvailable", "Existing Insurance Available?"],
  ],
  "Travel Insurance": [
    ["destination", "Destination"],
    ["travelDate", "Travel Date", "date"],
    ["travellers", "Travellers"],
    ["tripDuration", "Trip Duration"],
  ],
  "Cyber Insurance": [
    ["businessWebsite", "Business Website"],
    ["dataExposure", "Customer/Data Exposure"],
    ["employeeCount", "Employee Count"],
    ["existingInsuranceAvailable", "Existing Insurance Available?"],
  ],
  "Shop / Office Insurance": [
    ["shopLocation", "Shop / Office Location"],
    ["assetValue", "Asset Value"],
    ["stockValue", "Stock Value"],
    ["renewalDate", "Renewal Date", "date"],
  ],
  "Business Insurance": [
    ["businessCategory", "Business Category"],
    ["turnoverRange", "Turnover Range"],
    ["employeeCount", "Employee Count"],
    ["keyRisk", "Key Risk"],
  ],
  Other: [
    ["insuranceNeed", "Insurance Need"],
    ["estimatedValue", "Estimated Value"],
    ["notes", "Notes"],
  ],
};

export default function CustomerProfileDetailPage({ params }) {
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [profile, setProfile] = useState(null);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [lobModalOpen, setLobModalOpen] = useState(false);
  const [lobForm, setLobForm] = useState({ policyInterests: [], policyDetails: {} });
  const [remarkForm, setRemarkForm] = useState({
    status: "New Lead",
    outcome: "Call Back Later",
    nextFollowUpDate: "",
    policyInterests: [],
    policyDetails: {},
    remark: "",
  });
  const [timelineFilters, setTimelineFilters] = useState({ q: "", status: "", policy: "", date: "" });
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  const [whatsappPreviewOpen, setWhatsAppPreviewOpen] = useState(false);
  const [whatsappMessage, setWhatsAppMessage] = useState("");
  const [whatsappTemplates, setWhatsAppTemplates] = useState({});
  const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState("follow_up");
  const [whatsappSignature, setWhatsAppSignature] = useState("");
  const [currentAgentId, setCurrentAgentId] = useState("");
  const [whatsappPhone, setWhatsAppPhone] = useState("");
  const [whatsappSending, setWhatsAppSending] = useState(false);
  const [whatsappError, setWhatsAppError] = useState("");
  const [alert, setAlert] = useState(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.resolve(params).then((resolved) => setProfileId(resolved.id));
  }, [params]);

  useEffect(() => {
    if (!profileId) return;
    startTransition(async () => {
      const response = await fetch(`/api/customer-profiles/${profileId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Customer profile could not be loaded." });
        return;
      }
      setProfile(payload);
    });
  }, [profileId]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success || !payload.user?.id) return;
        const agentId = payload.user.id;
        const savedSignature = window.localStorage.getItem(`lead-whatsapp-signature:${agentId}`);
        setCurrentAgentId(agentId);
        setWhatsAppSignature(savedSignature || buildDefaultAgentSignature(payload.user));
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!openActionMenuId) return undefined;

    const closeMenu = (event) => {
      if (!event.target.closest("[data-lead-detail-action-menu]")) setOpenActionMenuId("");
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenActionMenuId("");
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openActionMenuId]);

  const viewModel = useMemo(() => buildProfileView(profile), [profile]);
  const timelinePolicyOptions = useMemo(() => {
    const list = viewModel.timeline.flatMap((item) => {
      if (!item.policyInterest) return [];
      return String(item.policyInterest)
        .split(",")
        .map((t) => t.trim());
    });
    return unique(list);
  }, [viewModel.timeline]);

  const filteredTimeline = useMemo(
    () =>
      viewModel.timeline.filter((item) => {
        const searchText = [
          item.createdBy,
          item.title,
          item.remark,
          item.outcome,
          item.leadStatus,
          item.policyInterest,
          item.requirementDetails,
          item.policyLabel,
          item.statusBadge,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesQuery = !timelineFilters.q || searchText.includes(timelineFilters.q.toLowerCase());
        const matchesStatus = !timelineFilters.status || item.tone === timelineFilters.status;

        const itemPolicies = item.policyInterest
          ? String(item.policyInterest)
            .split(",")
            .map((t) => t.trim())
          : [];
        const matchesPolicy = !timelineFilters.policy || itemPolicies.includes(timelineFilters.policy);

        const matchesDate = !timelineFilters.date || toInputDate(item.createdAt) === timelineFilters.date;
        return matchesQuery && matchesStatus && matchesPolicy && matchesDate;
      }),
    [viewModel.timeline, timelineFilters],
  );

  function callCustomer() {
    if (!profile?.phone) {
      window.alert("No mobile number available.");
      return;
    }
    window.open(`tel:${profile.phone}`);
  }

  function openWhatsAppPreview(policy = null) {
    if (!profile?.phone) {
      window.alert("No mobile number available.");
      return;
    }
    const whatsappPhone = formatPhoneForWhatsapp(profile.phone);
    if (!whatsappPhone) {
      window.alert("Invalid mobile number format.");
      return;
    }
    const interestedLob = policy?.policyType || policy?.lob || profile.selectedLOBs?.[0] || "insurance";
    const followUpDate = policy?.renewalDate || profile.nextFollowUpDate;
    const templates = buildLeadWhatsAppTemplates({
      customerName: profile.name,
      interestedLob,
      followUpDate,
    });
    setWhatsAppPhone(whatsappPhone);
    setWhatsAppTemplates(templates);
    setSelectedWhatsAppTemplate("follow_up");
    setWhatsAppMessage(templates.follow_up);
    setWhatsAppError("");
    setWhatsAppPreviewOpen(true);
  }

  async function sendWhatsAppMessage() {
    const message = whatsappMessage.trim();
    if (!message || !whatsappPhone) return;

    try {
      setWhatsAppSending(true);
      setWhatsAppError("");
      const res = await fetch("/api/operations/whatsapp/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: whatsappPhone, message, signature: whatsappSignature }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsAppPreviewOpen(false);
        setAlert({ type: "success", message: `WhatsApp message sent successfully to ${profile.name || "Customer"}.` });
      } else {
        setWhatsAppError(data.error || "WhatsApp gateway could not send the message.");
      }
    } catch {
      setWhatsAppError("Failed to connect to the CRM WhatsApp gateway.");
    } finally {
      setWhatsAppSending(false);
    }
  }

  function updateWhatsAppSignature(value) {
    setWhatsAppSignature(value);
    if (currentAgentId) window.localStorage.setItem(`lead-whatsapp-signature:${currentAgentId}`, value);
  }

  function openRemarkModal(policy) {
    const policyInterest = normalizePolicyInterest(
      policy?.lob || policy?.policyType || profile.selectedLOBs?.[0],
    );
    setRemarkForm({
      status: profile.status || "New Lead",
      outcome: profile.followUpOutcome || "Call Back Later",
      nextFollowUpDate: profile.nextFollowUpDate
        ? new Date(profile.nextFollowUpDate).toISOString().slice(0, 10)
        : "",
      policyInterests: policyInterest ? [policyInterest] : [],
      policyDetails: policyInterest ? { [policyInterest]: profile.lobDetails?.[policyInterest] || {} } : {},
      remark: "",
    });
    setRemarkModalOpen(true);
  }

  function openLobModal() {
    setLobForm({ policyInterests: [], policyDetails: {} });
    setLobModalOpen(true);
  }

  function toggleNewLob(lob) {
    setLobForm((current) => {
      const interests = current.policyInterests.includes(lob)
        ? current.policyInterests.filter((t) => t !== lob)
        : [...current.policyInterests, lob];

      const details = { ...(current.policyDetails || {}) };
      if (!details[lob]) {
        details[lob] = {};
      }

      return {
        ...current,
        policyInterests: interests,
        policyDetails: details,
      };
    });
  }

  function updateNewLobDetail(lob, key, value) {
    setLobForm((current) => ({
      ...current,
      policyDetails: {
        ...(current.policyDetails || {}),
        [lob]: {
          ...(current.policyDetails?.[lob] || {}),
          [key]: value,
        },
      },
    }));
  }

  function saveLobs() {
    if (!lobForm.policyInterests.length) {
      setAlert({ type: "error", message: "Select at least one new LOB." });
      return;
    }

    startTransition(async () => {
      const lobDetails = { ...(profile.lobDetails || {}) };
      lobForm.policyInterests.forEach((lob) => {
        lobDetails[lob] = lobForm.policyDetails[lob] || {};
      });

      const response = await fetch(`/api/customer-profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          selectedLOBs: unique([...(profile.selectedLOBs || []), ...lobForm.policyInterests]),
          lobDetails,
        }),
      });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: updated.error || "LOB could not be added." });
        return;
      }

      setProfile(updated);
      setLobModalOpen(false);
      setAlert({ type: "success", message: "LOB added successfully." });
    });
  }

  async function saveRemark({ convert = false } = {}) {
    const text = remarkForm.remark.trim();
    if (!text) {
      setAlert({ type: "error", message: "Remark is required." });
      return null;
    }
    if (!remarkForm.policyInterests || remarkForm.policyInterests.length === 0) {
      setAlert({ type: "error", message: "Add a LOB before saving a follow-up remark." });
      return null;
    }

    const now = new Date().toISOString();
    const entry = {
      id: `${Date.now()}`,
      remark: text,
      rawRemark: text,
      outcome: convert ? "Converted" : remarkForm.outcome,
      mode: "Lead Generation",
      priority: "Normal",
      nextFollowUpDate: remarkForm.nextFollowUpDate,
      policyInterest: remarkForm.policyInterests.join(", "),
      policyDetails: remarkForm.policyDetails || {},
      status: convert ? "Converted" : remarkForm.status,
      createdAt: now,
      createdBy: profile.createdBy || profile.assignedTo || "Agent",
    };

    const payload = {
      ...profile,
      selectedLOBs: profile.selectedLOBs || [],
      status: convert ? "Converted" : remarkForm.status,
      followUpOutcome: convert ? "Converted" : remarkForm.outcome,
      followUpRemark: text,
      lastFollowUpDate: now,
      nextFollowUpDate: remarkForm.nextFollowUpDate || null,
      lobDetails: {
        ...(profile.lobDetails || {}),
        followUps: [
          entry,
          ...(Array.isArray(profile.lobDetails?.followUps) ? profile.lobDetails.followUps : []),
        ],
      },
    };

    const response = await fetch(`/api/customer-profiles/${profile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAlert({ type: "error", message: updated.error || "Customer profile remark could not be saved." });
      return null;
    }
    setProfile(updated);
    return updated;
  }

  function submitRemark() {
    startTransition(async () => {
      const updated = await saveRemark();
      if (!updated) return;
      setRemarkModalOpen(false);
      setAlert({ type: "success", message: "Follow-up remark saved." });
    });
  }

  function convertFromRemarkModal() {
    startTransition(async () => {
      const updated = await saveRemark({ convert: true });
      if (!updated) return;
      const response = await fetch(`/api/customer-profiles/${profile.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceType: remarkForm.policyInterests[0] || "General Insurance" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAlert({ type: "error", message: payload.error || "Customer profile could not be converted." });
        return;
      }
      setRemarkModalOpen(false);
      setAlert({
        type: "success",
        message: "Customer converted. You can share or print from the converted customer workflow.",
      });
    });
  }

  if (!profile && !alert) {
    return (
      <div className="customer-profiling-page customer-portfolio-page loading-skeleton">
        {/* Back Link Placeholder */}
        <button className="customer-portfolio-back" type="button" disabled style={{ opacity: 0.6 }}>
          <ArrowLeft size={15} /> Back to Profiles
        </button>

        <div className="customer-portfolio-layout">
          {/* Left Panel Sidebar Skeleton */}
          <aside
            className="customer-portfolio-sidebar"
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

            {/* 1. CATEGORY CARD */}
            <div className="sidebar-section-card">
              <div className="sidebar-section-header">
                <div className="skeleton" style={{ width: "15px", height: "15px", borderRadius: "3px" }} />
                <div className="skeleton" style={{ width: "60px", height: "11px", borderRadius: "2px" }} />
              </div>
              <div className="sidebar-grid-row">
                <div className="sidebar-grid-cell">
                  <div
                    className="skeleton"
                    style={{ width: "80px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                  />
                  <div className="skeleton" style={{ width: "50px", height: "12px", borderRadius: "3px" }} />
                </div>
                <div className="sidebar-grid-cell">
                  <div
                    className="skeleton"
                    style={{ width: "90px", height: "9px", marginBottom: "6px", borderRadius: "2px" }}
                  />
                  <div className="skeleton" style={{ width: "60px", height: "12px", borderRadius: "3px" }} />
                </div>
              </div>
            </div>

            {/* 2. CONTACT INFORMATION CARD */}
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

            {/* 3. ADDRESS CARD */}
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

            {/* 4. POLICY CARD */}
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

            {/* 5. ASSIGNMENT CARD */}
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
          </aside>

          {/* Right Panel Main Area Skeleton */}
          <main className="customer-portfolio-main">
            {/* Associated Companies Card */}
            <section className="customer-portfolio-card">
              <h2>Associated Companies</h2>
              <div className="customer-portfolio-chip-row">
                <div className="skeleton" style={{ width: "100px", height: "26px", borderRadius: "14px" }} />
                <div className="skeleton" style={{ width: "120px", height: "26px", borderRadius: "14px" }} />
              </div>
            </section>

            {/* Lead Follow-up Details Card */}
            <section className="customer-portfolio-card">
              <h2>Lead Follow-up Details</h2>
              <div className="customer-portfolio-table-wrap">
                <table className="customer-portfolio-table">
                  <thead>
                    <tr>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "80px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "90px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "90px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "70px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "110px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "60px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "50px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                      <th>
                        <div
                          className="skeleton"
                          style={{ width: "70px", height: "12px", borderRadius: "2px" }}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 2 }).map((_, index) => (
                      <tr key={index}>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "70px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "110px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "80px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "60px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "80px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "40px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "50px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                        <td>
                          <div
                            className="skeleton"
                            style={{ width: "60px", height: "14px", borderRadius: "3px" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Timeline & Remarks Card */}
            <section className="customer-portfolio-card">
              <h2>Follow-up Timeline & Remarks</h2>
              <div
                className="customer-portfolio-timeline-filters"
                style={{ pointerEvents: "none", opacity: 0.85 }}
              >
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

              <div className="customer-portfolio-timeline-scroll">
                <div className="customer-portfolio-timeline">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="customer-portfolio-timeline-item">
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
                      <div className="customer-portfolio-timeline-content">
                        <div className="customer-portfolio-timeline-head">
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
                          className="customer-portfolio-timeline-body"
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
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="customer-profiling-page">
        <button
          className="customer-portfolio-back"
          type="button"
          onClick={() => router.push("/dashboard/manual-entry/lead-generation")}
        >
          <ArrowLeft size={15} /> Back to Profiles
        </button>
        <div className="customer-profile-alert error">
          <AlertTriangle size={18} />
          <span>{alert.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-profiling-page customer-portfolio-page">
      <button
        className="customer-portfolio-back"
        type="button"
        onClick={() => router.push("/dashboard/manual-entry/lead-generation")}
      >
        <ArrowLeft size={15} /> Back to Profiles
      </button>

      {alert ? (
        <div className={`customer-profile-alert ${alert.type}`}>
          {alert.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{alert.message}</span>
        </div>
      ) : null}

      <div className="customer-portfolio-layout">
        <aside
          className="customer-portfolio-sidebar"
          style={{ border: "none", background: "transparent", boxShadow: "none", padding: 0 }}
        >
          {/* Header section with avatar, name, and badge */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "8px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#f1f5f9",
                border: "1px solid rgba(25, 28, 29, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              <UserRound size={28} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#0f172a",
                  margin: 0,
                  lineHeight: "1.2",
                }}
              >
                {profile.name || "Unnamed Customer"}
              </h1>
              <span
                className={`customer-portfolio-pill ${getStatusTone(profile.status)}`}
                style={{
                  textTransform: "uppercase",
                  fontSize: "11px",
                  fontWeight: "800",
                  marginTop: "2px",
                  width: "fit-content",
                }}
              >
                {profile.status || "New Lead"}
              </span>
            </div>
          </div>

          {/* Action buttons Call & WhatsApp */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "8px", marginTop: "8px" }}>
            <button type="button" className="sidebar-action-btn" onClick={callCustomer}>
              <Phone size={16} /> Call
            </button>
            <button type="button" className="sidebar-action-btn" onClick={() => openWhatsAppPreview()}>
              <MessageSquare size={16} /> WhatsApp
            </button>
          </div>

          {/* 1. CATEGORY */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <LayoutGrid size={15} />
              <span>Category</span>
            </div>
            <div className="sidebar-grid-row">
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Customer Type</span>
                <span className="sidebar-cell-value">{profile.customerType || "-"}</span>
              </div>
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Reference Source</span>
                <span className="sidebar-cell-value">{profile.referenceSource || "-"}</span>
              </div>
            </div>
          </div>

          {/* 2. CONTACT INFORMATION */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <User size={15} />
              <span>Contact Information</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Mobile Number</span>
              <span className="sidebar-cell-value">{profile.phone || "-"}</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Contact Person Name</span>
              <span className="sidebar-cell-value">{profile.contactPersonName || profile.name || "-"}</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Email Address</span>
              <span className="sidebar-cell-value">{profile.email || "-"}</span>
            </div>
          </div>

          {/* 3. ADDRESS */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <MapPin size={15} />
              <span>Address</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Address</span>
              <span className="sidebar-cell-value">
                {[profile.address, profile.city, profile.state].filter(Boolean).join(", ") || "-"}
              </span>
            </div>
          </div>

          {/* 4. FOLLOW-UP */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <Shield size={15} />
              <span>Follow-up</span>
            </div>
            <div className="sidebar-grid-row">
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Total Companies</span>
                <span className="sidebar-cell-value">{viewModel.companies.length}</span>
              </div>
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Lead Status</span>
                <span className="sidebar-cell-value">{profile.status || "-"}</span>
              </div>
            </div>
            <div className="sidebar-grid-row">
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Next Follow-up</span>
                <span className="sidebar-cell-value">{formatDate(profile.nextFollowUpDate)}</span>
              </div>
              <div className="sidebar-grid-cell">
                <span className="sidebar-cell-label">Follow-up Items</span>
                <span className="sidebar-cell-value">
                  {viewModel.policies.length} ({viewModel.dueCount} due)
                </span>
              </div>
            </div>
          </div>

          {/* 5. CREATOR */}
          <div className="sidebar-section-card">
            <div className="sidebar-section-header">
              <User size={15} />
              <span>Creator</span>
            </div>
            <div className="sidebar-full-cell">
              <span className="sidebar-cell-label">Created By</span>
              <span className="sidebar-cell-value">{profile.createdBy || profile.assignedTo || "-"}</span>
            </div>
          </div>
        </aside>

        <main className="customer-portfolio-main">
          <section className="customer-portfolio-card">
            <h2>Associated Companies</h2>
            <div className="customer-portfolio-chip-row">
              {viewModel.companies.length ? (
                viewModel.companies.map((company) => (
                  <span key={company} className="company-theme-chip">
                    {company}
                  </span>
                ))
              ) : (
                <p className="customer-portfolio-empty">No associated company captured.</p>
              )}
            </div>
          </section>

          <section className="customer-portfolio-card">
            <div className="lead-detail-section-head">
              <h2>Lead Follow-up Details</h2>
              <button type="button" className="lead-add-lob-button" onClick={openLobModal}>
                <Plus size={16} /> Add LOB
              </button>
            </div>
            <div className="customer-portfolio-table-wrap">
              <table className="customer-portfolio-table">
                <thead>
                  <tr>
                    <th>Lead Ref</th>
                    <th>Customer / Company</th>
                    <th>Interested LOB</th>
                    <th>Requirement Details</th>
                    <th>Next Follow-up</th>
                    <th>Days Left</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.policies.length ? (
                    viewModel.policies.map((policy) => (
                      <tr key={policy.id} className={openActionMenuId === policy.id ? "lead-detail-row-menu-open" : ""}>
                        <td>{policy.policyNumber || "-"}</td>
                        <td>{policy.company || "-"}</td>
                        <td>{policy.policyType || "-"}</td>
                        <td>{policy.requirementSummary || "-"}</td>
                        <td>{formatDate(policy.renewalDate || profile.nextFollowUpDate)}</td>
                        <td>{formatDaysLeft(policy.renewalDate || profile.nextFollowUpDate)}</td>
                        <td>
                          <span className={`customer-portfolio-pill ${getStatusTone(profile.status)}`}>
                            {profile.status || "-"}
                          </span>
                        </td>
                        <td className="lead-detail-actions-cell">
                          <div className="lead-detail-action-menu" data-lead-detail-action-menu>
                            <button
                              type="button"
                              className="lead-detail-action-trigger"
                              onClick={(event) => {
                                if (openActionMenuId === policy.id) {
                                  setOpenActionMenuId("");
                                  return;
                                }
                                const bounds = event.currentTarget.getBoundingClientRect();
                                const menuWidth = 190;
                                const menuHeight = 96;
                                setActionMenuPosition({
                                  top:
                                    bounds.bottom + menuHeight + 12 > window.innerHeight
                                      ? Math.max(12, bounds.top - menuHeight - 6)
                                      : bounds.bottom + 6,
                                  left: Math.max(12, bounds.right - menuWidth),
                                });
                                setOpenActionMenuId(policy.id);
                              }}
                              aria-label={`Open actions for ${policy.company || profile.name || "lead"}`}
                              aria-expanded={openActionMenuId === policy.id}
                            >
                              <MoreVertical size={18} />
                            </button>
                            {openActionMenuId === policy.id && typeof document !== "undefined"
                              ? createPortal(
                                <div
                                  className="lead-detail-action-popover"
                                  data-lead-detail-action-menu
                                  style={actionMenuPosition}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId("");
                                      openRemarkModal(policy);
                                    }}
                                  >
                                    <CalendarPlus size={15} /> Add Follow-up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId("");
                                      openWhatsAppPreview(policy);
                                    }}
                                  >
                                    <MessageSquare size={15} /> Send WhatsApp
                                  </button>
                                </div>,
                                document.body,
                              )
                              : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="customer-portfolio-empty-cell">
                        <div className="customer-portfolio-empty-action">
                          <span>No follow-up details captured.</span>
                          <button
                            type="button"
                            className="customer-portfolio-table-action"
                            onClick={() => openRemarkModal(null)}
                          >
                            Add Policy Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="customer-portfolio-card">
            <h2>Follow-up Timeline & Remarks</h2>
            {viewModel.timeline.length ? (
              <>
                <div className="customer-portfolio-timeline-filters">
                  <input
                    value={timelineFilters.q}
                    placeholder="Search remarks"
                    onChange={(event) =>
                      setTimelineFilters((current) => ({ ...current, q: event.target.value }))
                    }
                  />
                  <select
                    value={timelineFilters.status}
                    onChange={(event) =>
                      setTimelineFilters((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    <option value="">All Status</option>
                    <option value="info">New / Interested</option>
                    <option value="warning">Follow-up</option>
                    <option value="success">Converted / Active</option>
                    <option value="danger">Lost / Not Interested</option>
                    <option value="neutral">General</option>
                  </select>
                  <select
                    value={timelineFilters.policy}
                    onChange={(event) =>
                      setTimelineFilters((current) => ({ ...current, policy: event.target.value }))
                    }
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
                    value={timelineFilters.date}
                    onChange={(event) =>
                      setTimelineFilters((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </div>
                {filteredTimeline.length ? (
                  <div className="customer-portfolio-timeline-scroll">
                    <div className="customer-portfolio-timeline">
                      {filteredTimeline.map((item) => (
                        <div key={item.id} className="customer-portfolio-timeline-item">
                          <div className="customer-portfolio-timeline-dot" />
                          <div className="customer-portfolio-timeline-content">
                            <div className="customer-portfolio-timeline-head">
                              <strong>{item.createdBy || item.title}</strong>
                              <span>{formatDateTime(item.createdAt)}</span>
                            </div>
                            <div className="customer-portfolio-timeline-body">
                              {item.policyInterest || item.outcome || item.leadStatus || item.nextFollowUpDate ? (
                                <section className="lead-timeline-details-section">
                                  <span className="lead-timeline-section-label">Lead &amp; LOB Details</span>
                                  <div className="lead-timeline-details-grid">
                                    {item.policyInterest ? (
                                      <div><span>Interested LOB</span><strong>{item.policyInterest}</strong></div>
                                    ) : null}
                                    {item.outcome ? (
                                      <div><span>Outcome</span><strong>{item.outcome}</strong></div>
                                    ) : null}
                                    {item.leadStatus ? (
                                      <div><span>Lead Status</span><strong>{item.leadStatus}</strong></div>
                                    ) : null}
                                    {item.nextFollowUpDate ? (
                                      <div>
                                        <span>Next Follow-up</span>
                                        <strong>{formatDate(item.nextFollowUpDate)}</strong>
                                      </div>
                                    ) : null}
                                  </div>
                                  {item.requirementDetails ? (
                                    <p className="lead-timeline-requirement">{item.requirementDetails}</p>
                                  ) : null}
                                  {item.nextFollowUpDate ? (
                                    <em>Scheduled via {item.mode || "Lead Generation"}</em>
                                  ) : null}
                                  {item.statusBadge ? (
                                    <b className={`tone-${item.tone}`}>{item.statusBadge}</b>
                                  ) : null}
                                </section>
                              ) : null}
                              <section className="lead-timeline-remark-section">
                                <span className="lead-timeline-section-label">Remark</span>
                                <p>{item.remark || "-"}</p>
                              </section>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="customer-portfolio-empty timeline-filter-empty">
                    No timeline records match selected filters.
                  </p>
                )}
              </>
            ) : (
              <p className="customer-portfolio-empty">No comments or timeline logs recorded.</p>
            )}
          </section>
        </main>
      </div>

      {typeof window !== "undefined" &&
        remarkModalOpen &&
        createPortal(
          <div
            className="tb-modal-backdrop customer-profile-remark-backdrop"
            onClick={() => setRemarkModalOpen(false)}
          >
            <div className="customer-profile-remark-card" onClick={(event) => event.stopPropagation()}>
              <div className="customer-profile-remark-head">
                <h3>Add Follow-up Remark</h3>
                <button type="button" onClick={() => setRemarkModalOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="customer-profile-remark-body">
                <section className="lead-lob-client-summary follow-up-client-summary">
                  <div>
                    <span>Client</span>
                    <strong>{profile.name || "-"}</strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{profile.phone || "-"}</strong>
                  </div>
                  <div>
                    <span>Follow-up LOB</span>
                    <strong>{remarkForm.policyInterests.join(", ") || "-"}</strong>
                  </div>
                  <div>
                    <span>Assigned Agent</span>
                    <strong>{profile.createdBy || profile.assignedTo || "-"}</strong>
                  </div>
                </section>

                <section className="follow-up-form-section">
                  <div className="follow-up-form-section-head">
                    <strong>Follow-up Details</strong>
                    <span>Update the result and schedule the next action.</span>
                  </div>
                  <div className="customer-profile-remark-grid">
                    <label>
                      <span>Status</span>
                      <select
                        value={remarkForm.status}
                        onChange={(event) =>
                          setRemarkForm((current) => ({ ...current, status: event.target.value }))
                        }
                      >
                        {PROFILE_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Outcome</span>
                      <select
                        value={remarkForm.outcome}
                        onChange={(event) =>
                          setRemarkForm((current) => ({ ...current, outcome: event.target.value }))
                        }
                      >
                        {FOLLOW_UP_OUTCOMES.map((outcome) => (
                          <option key={outcome} value={outcome}>
                            {outcome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Next Follow-up Date</span>
                      <input
                        type="date"
                        value={remarkForm.nextFollowUpDate}
                        onChange={(event) =>
                          setRemarkForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="follow-up-form-section follow-up-remark-section">
                  <div className="follow-up-form-section-head">
                    <strong>Conversation Remark</strong>
                    <span>Record the key discussion, requirement, or commitment.</span>
                  </div>
                  <label className="customer-profile-remark-textarea">
                    <span>Remark Text *</span>
                    <textarea
                      value={remarkForm.remark}
                      onChange={(event) =>
                        setRemarkForm((current) => ({ ...current, remark: event.target.value }))
                      }
                      placeholder="Enter details of conversation..."
                    />
                  </label>
                </section>
              </div>

              <div className="customer-profile-remark-footer">
                <button type="button" onClick={() => setRemarkModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" onClick={convertFromRemarkModal} disabled={isPending}>
                  Convert Lead
                </button>
                <button type="button" className="primary" onClick={submitRemark} disabled={isPending}>
                  {isPending ? "Saving..." : "Save Remark"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {typeof window !== "undefined" &&
        lobModalOpen &&
        createPortal(
          <div
            className="tb-modal-backdrop customer-profile-remark-backdrop"
            onClick={() => setLobModalOpen(false)}
          >
            <div className="customer-profile-remark-card lead-add-lob-card" onClick={(event) => event.stopPropagation()}>
              <div className="customer-profile-remark-head">
                <div>
                  <h3>Add Interested LOB</h3>
                  <p>Select a new insurance requirement and capture its details.</p>
                </div>
                <button type="button" onClick={() => setLobModalOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="customer-profile-remark-body">
                <section className="lead-lob-client-summary">
                  <div>
                    <span>Client</span>
                    <strong>{profile.name || "-"}</strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{profile.phone || "-"}</strong>
                  </div>
                  <div className="lead-lob-count">
                    <span>Interested LOBs</span>
                    <strong>{profile.selectedLOBs?.length || 0}</strong>
                  </div>
                  <div>
                    <span>Assigned Agent</span>
                    <strong>{profile.createdBy || profile.assignedTo || "-"}</strong>
                  </div>
                </section>

                <div className="lead-lob-selection-layout">
                  <section className="lead-current-lobs">
                    <div>
                      <span>Current LOBs</span>
                      <small>Already added</small>
                    </div>
                    <div className="lead-current-lob-list">
                      {profile.selectedLOBs?.length ? (
                        profile.selectedLOBs.map((lob, index) => (
                          <span key={lob}>
                            <b>{index + 1}</b>
                            {lob}
                          </span>
                        ))
                      ) : (
                        <p>No LOB added yet.</p>
                      )}
                    </div>
                  </section>

                  <section className="lead-available-lobs">
                    <div>
                      <span>Add New LOB</span>
                      <small>Select one or more new requirements</small>
                    </div>
                    <div className="remark-checkbox-container">
                      {LOB_OPTIONS.filter((lob) => !profile.selectedLOBs?.includes(lob)).map((lob) => {
                        const isChecked = lobForm.policyInterests.includes(lob);
                        return (
                          <label key={lob} className={`remark-checkbox-label ${isChecked ? "checked" : ""}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleNewLob(lob)}
                            />
                            <span>{lob}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {lobForm.policyInterests.map((lob) => (
                  <section key={lob} className="lead-add-lob-details">
                    <h4>{lob} Details</h4>
                    <div className="customer-profile-remark-policy-grid">
                      {(LOB_FIELDS[lob] || LOB_FIELDS.Other).map(([key, label, type]) => (
                        <label key={key}>
                          <span>{label}</span>
                          <input
                            type={type || "text"}
                            value={lobForm.policyDetails?.[lob]?.[key] || ""}
                            onChange={(event) => updateNewLobDetail(lob, key, event.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="customer-profile-remark-footer">
                <button type="button" onClick={() => setLobModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="primary" onClick={saveLobs} disabled={isPending}>
                  {isPending ? "Saving..." : "Save LOB"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {typeof window !== "undefined" &&
        whatsappPreviewOpen &&
        createPortal(
          <div
            className="tb-modal-backdrop customer-profile-remark-backdrop"
            onClick={() => setWhatsAppPreviewOpen(false)}
          >
            <div className="lead-whatsapp-preview-card" onClick={(event) => event.stopPropagation()}>
              <div className="lead-whatsapp-preview-head">
                <div>
                  <h3>WhatsApp Message Preview</h3>
                  <p>Review and customize the message before sending.</p>
                </div>
                <button type="button" onClick={() => setWhatsAppPreviewOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="lead-whatsapp-recipient">
                <span>Recipient</span>
                <strong>{profile.name || "Customer"}</strong>
                <small>+{whatsappPhone}</small>
              </div>

              {whatsappError ? (
                <div className="lead-whatsapp-error">
                  <AlertTriangle size={17} />
                  <span>{whatsappError}</span>
                </div>
              ) : null}

              <div className="lead-whatsapp-template-picker">
                <span>Message Type</span>
                <div>
                  {Object.entries(WHATSAPP_TEMPLATE_LABELS).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      className={selectedWhatsAppTemplate === type ? "active" : ""}
                      onClick={() => {
                        setSelectedWhatsAppTemplate(type);
                        setWhatsAppMessage(whatsappTemplates[type]);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="lead-whatsapp-message-field">
                <span>Message Preview & Edit</span>
                <textarea
                  value={whatsappMessage}
                  onChange={(event) => setWhatsAppMessage(event.target.value)}
                  rows={8}
                />
              </label>

              <label className="lead-whatsapp-signature-field">
                <span>Agent Signature</span>
                <textarea
                  value={whatsappSignature}
                  onChange={(event) => updateWhatsAppSignature(event.target.value)}
                  rows={3}
                  placeholder="Regards,\nAgent name"
                />
                <small>Saved separately for each logged-in agent on this device.</small>
              </label>

              <div className="lead-whatsapp-preview-actions">
                <button
                  type="button"
                  onClick={() =>
                    window.navigator.clipboard?.writeText(
                      [whatsappMessage.trim(), whatsappSignature.trim()].filter(Boolean).join("\n\n"),
                    )
                  }
                >
                  <Clipboard size={15} /> Copy Text
                </button>
                <div>
                  <button type="button" onClick={() => setWhatsAppPreviewOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="send-whatsapp"
                    onClick={sendWhatsAppMessage}
                    disabled={whatsappSending || !whatsappMessage.trim()}
                  >
                    <Send size={15} /> {whatsappSending ? "Sending..." : "Send WhatsApp"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function buildLeadWhatsAppTemplates({ customerName, interestedLob, followUpDate }) {
  const name = customerName || "Customer";
  const lob = interestedLob || "insurance";
  const date = followUpDate ? formatDate(followUpDate) : "the agreed date";

  return {
    follow_up: `Hello ${name}, following up regarding your ${lob} requirement. Our next follow-up is scheduled for ${date}. Please let us know if you need any assistance.`,
    information: `Hello ${name}, to proceed with your ${lob} requirement, please share the pending information or documents at your convenience. Let us know if you need help with the details required.`,
    quote_shared: `Hello ${name}, we have shared the quotation for your ${lob} requirement. Please review it and let us know if you would like any clarification or changes.`,
    meeting: `Hello ${name}, this is a reminder about our discussion regarding your ${lob} requirement scheduled for ${date}. Please confirm your availability.`,
    thank_you: `Hello ${name}, thank you for discussing your ${lob} requirement with us. We appreciate your time and remain available for any questions or assistance.`,
    general: `Hello ${name}, we are contacting you with an update regarding your ${lob} requirement. Please let us know a convenient time to connect and discuss the next steps.`,
  };
}

function buildDefaultAgentSignature(user) {
  return [
    "*Warm regards,*",
    "",
    `*${user?.name || user?.email || "CRM Team"}*`,
    "Insurance Advisor",
    "",
    "*Bima Headquarter*",
    "by *InsureDesk IMF Pvt. Ltd.*",
    "",
    "Phone: +91 88188 89660",
    "Email: insuredeskbhopal@gmail.com",
    "Website: www.bimaheadquarter.com",
    "",
    "*Comprehensive Insurance Solutions*",
    "Motor Insurance • Health Insurance • Life Insurance • Commercial Insurance • Marine Insurance • Policy Renewals • Claims Assistance",
  ].join("\n");
}

function buildProfileView(profile) {
  if (!profile)
    return { companies: [], policies: [], timeline: [], totalPremium: 0, totalSumInsured: 0, dueCount: 0 };

  const selectedLOBs = profile.selectedLOBs || [];
  const lobDetails = profile.lobDetails || {};
  const companies = unique([
    profile.sourceCompany,
    profile.businessType,
    ...selectedLOBs.map((lob) => lobDetails[lob]?.companyName || lobDetails[lob]?.insuranceCompany),
  ]);

  const policies = selectedLOBs.map((lob, index) => {
    const details = lobDetails[lob] || {};
    const premium = numberFrom(details.premium || details.expectedPremium || details.estimatedValue);
    const sumInsured = numberFrom(
      details.sumInsured ||
      details.sumInsuredNeed ||
      details.stockValue ||
      details.propertyValue ||
      details.assetValue,
    );
    return {
      id: `${lob}-${index}`,
      lob,
      policyNumber: profile.sourcePolicyNumber || details.policyNumber || `Lead-${index + 1}`,
      company: profile.sourceCompany || details.companyName || details.insuranceCompany || profile.name,
      policyType: profile.sourcePolicyType || lob,
      requirementSummary: formatPolicyDetails(lob, { [lob]: details }) || profile.remarks || "Discussion pending",
      premium,
      sumInsured,
      renewalDate: details.renewalDate || details.travelDate || profile.nextFollowUpDate,
    };
  });

  if (!policies.length && (profile.sourcePolicyNumber || profile.sourcePolicyType || profile.sourceCompany)) {
    policies.push({
      id: "source-policy",
      policyNumber: profile.sourcePolicyNumber,
      company: profile.sourceCompany || profile.name,
      policyType: profile.sourcePolicyType || "Policy Interest",
      requirementSummary: profile.remarks || "Discussion pending",
      premium: 0,
      sumInsured: 0,
      renewalDate: profile.nextFollowUpDate,
    });
  }

  const followUps = Array.isArray(lobDetails.followUps) ? lobDetails.followUps : [];
  const hasLatestFollowUpLog = followUps.some(
    (item) =>
      (item.rawRemark || item.remark || "") === profile.followUpRemark &&
      (!profile.lastFollowUpDate || item.createdAt === profile.lastFollowUpDate),
  );
  const timeline = [
    ...followUps.map((item, index) => ({
      id: item.id || `followup-${index}`,
      title: item.status || item.outcome || "Follow-up",
      remark: item.rawRemark || item.remark || "-",
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      mode: item.mode,
      outcome: item.outcome || "",
      leadStatus: item.status || "",
      policyInterest: item.policyInterest || "",
      requirementDetails: formatPolicyDetails(item.policyInterest, item.policyDetails),
      nextFollowUpDate: item.nextFollowUpDate,
      policyLabel: item.policyInterest
        ? `POLICY: ${item.policyInterest}${profile.sourcePolicyNumber ? ` (${profile.sourcePolicyNumber})` : ""}`
        : "",
      statusBadge: item.status ? `${profile.status || item.status} -> ${item.status}` : "",
      tone: getStatusTone(item.status || item.outcome),
    })),
    profile.followUpRemark && !hasLatestFollowUpLog
      ? {
        id: "latest-followup",
        title: profile.followUpOutcome || "Latest Follow-up",
        remark: profile.followUpRemark,
        createdAt: profile.lastFollowUpDate || profile.updatedAt,
        createdBy: profile.createdBy || profile.assignedTo || "Agent",
        outcome: profile.followUpOutcome || "",
        leadStatus: profile.status || "",
        policyInterest: profile.sourcePolicyType || profile.selectedLOBs?.join(", ") || "",
        nextFollowUpDate: profile.nextFollowUpDate,
        policyLabel: profile.sourcePolicyType
          ? `POLICY: ${profile.sourcePolicyType}${profile.sourcePolicyNumber ? ` (${profile.sourcePolicyNumber})` : ""}`
          : "",
        statusBadge: profile.status ? `${profile.status} -> ${profile.status}` : "",
        tone: getStatusTone(profile.status),
      }
      : null,
    profile.remarks
      ? {
        id: "general-remarks",
        title: "General Remark",
        remark: profile.remarks,
        createdAt: profile.updatedAt,
        createdBy: profile.createdBy || profile.assignedTo || "Agent",
        policyInterest: profile.sourcePolicyType || "",
        policyLabel: profile.sourcePolicyType
          ? `POLICY: ${profile.sourcePolicyType}${profile.sourcePolicyNumber ? ` (${profile.sourcePolicyNumber})` : ""}`
          : "",
        tone: "neutral",
      }
      : null,
  ].filter(Boolean);

  const totalPremium = policies.reduce((sum, item) => sum + item.premium, 0);
  const totalSumInsured = policies.reduce((sum, item) => sum + item.sumInsured, 0);
  const dueCount = policies.filter(
    (item) => item.renewalDate && new Date(item.renewalDate) <= new Date(),
  ).length;

  return {
    companies: companies.length ? companies : unique([profile.name]),
    policies,
    timeline,
    totalPremium,
    totalSumInsured,
    dueCount,
  };
}

function formatPolicyDetails(policyType, details = {}) {
  if (!policyType || !details) return "";
  const types =
    typeof policyType === "string"
      ? policyType.split(",").map((t) => t.trim())
      : Array.isArray(policyType)
        ? policyType
        : [policyType];

  const allFields = [];
  types.forEach((type) => {
    const fields = LOB_FIELDS[type] || LOB_FIELDS.Other;
    const typeDetails = details[type] && typeof details[type] === "object" ? details[type] : details;
    const formatted = fields
      .map(([key, label, fieldType]) => {
        const value = typeDetails[key];
        if (!value) return "";
        return `${label}: ${fieldType === "date" ? formatDate(value) : value}`;
      })
      .filter(Boolean)
      .join(", ");
    if (formatted) {
      allFields.push(`[${type}] ${formatted}`);
    }
  });

  return allFields.join(" | ");
}

function normalizePolicyInterest(value = "") {
  if (!value) return "";
  const direct = LOB_OPTIONS.find((lob) => lob.toLowerCase() === String(value).toLowerCase());
  if (direct) return direct;
  const loose = LOB_OPTIONS.find((lob) => lob.toLowerCase().includes(String(value).toLowerCase()));
  return loose || value;
}

function getStatusTone(value = "") {
  const status = String(value).toLowerCase();
  if (status.includes("renew") || status.includes("convert") || status.includes("active")) return "success";
  if (
    status.includes("lost") ||
    status.includes("wrong") ||
    status.includes("not interested") ||
    status.includes("expired") ||
    status.includes("overdue")
  )
    return "danger";
  if (status.includes("follow") || status.includes("call") || status.includes("due")) return "warning";
  if (status.includes("new") || status.includes("interest")) return "info";
  return "neutral";
}

function unique(values) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  );
}

function numberFrom(value) {
  const num = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatDaysLeft(value) {
  if (!value) return "-";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `${days} days`;
  if (days === 0) return "Today";
  return `${days} days`;
}

function toInputDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}
