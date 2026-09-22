"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Phone,
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Layers,
} from "lucide-react";
import { showToast } from "@/app/components/shared/ToastProvider";

export default function RenewalActionDrawer({
  policy,
  relatedPolicies = [],
  initialTab = "remark",
  onClose,
  onPolicyUpdated,
  onSaveAndNext,
}) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-policy selection scope
  const [interactionScope, setInteractionScope] = useState("all"); // "single" | "all" | "selected"
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(() =>
    relatedPolicies.length ? relatedPolicies.map((p) => p.id) : policy ? [policy.id] : []
  );

  // Remark Form
  const [remarkText, setRemarkText] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [renewalStatus, setRenewalStatus] = useState(policy?.renewalStatus || "Follow-Up");
  const [followUpMode, setFollowUpMode] = useState("Call");
  const [priority, setPriority] = useState("Normal");

  // Comprehensive Renew Form
  const [renewalType, setRenewalType] = useState("BHQ"); // "BHQ" | "ELSEWHERE"
  const [renewedPremium, setRenewedPremium] = useState(policy?.totalPremium || policy?.premium || "");
  const [netPremium, setNetPremium] = useState(policy?.netPremium || "");
  const [newPolicyNo, setNewPolicyNo] = useState("");
  const [newInsurer, setNewInsurer] = useState(policy?.insuranceCompany || "");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Collected");
  const [paymentMode, setPaymentMode] = useState("Online / UPI");
  const [renewRemark, setRenewRemark] = useState("");
  const [uploadPolicyNow, setUploadPolicyNow] = useState(false);
  const [policyCopyFile, setPolicyCopyFile] = useState(null);

  // Lost Form
  const [lostReason, setLostReason] = useState("Premium High");
  const [lostRemarks, setLostRemarks] = useState("");

  // WhatsApp
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState("");

  // Timeline
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Focus Trapping & Restoration Refs
  const previousFocusRef = useRef(null);
  const drawerRef = useRef(null);

  // Keyboard Shortcuts & Focus Management
  useEffect(() => {
    setMounted(true);
    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      // Escape closes drawer
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trapping inside drawer
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
            return;
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
            return;
          }
        }
      }

      // Ctrl + Enter to Save & Next
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave(true);
        return;
      }

      // Disable single-key shortcuts inside input, textarea, select, contenteditable, modal/dialog form fields
      const tag = (e.target?.tagName || "").toLowerCase();
      const isInput =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target?.isContentEditable ||
        e.target?.getAttribute("role") === "textbox" ||
        Boolean(e.target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], .tb-modal-card"));

      if (isInput) return;

      if (e.key === "w" || e.key === "W") {
        setActiveTab("whatsapp");
      } else if (e.key === "c" || e.key === "C") {
        handleCall();
      } else if (e.key === "f" || e.key === "F") {
        setActiveTab("remark");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to previously focused element (e.g. table row or action button)
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        try {
          previousFocusRef.current.focus();
        } catch {}
      }
    };
  }, [onClose, remarkText, followUpDate, renewalStatus, followUpMode, priority, interactionScope, selectedPolicyIds]);

  useEffect(() => {
    if (!policy) return;
    setActiveTab(initialTab || "remark");
    setRenewalStatus(policy.renewalStatus || "Follow-Up");
    setNewInsurer(policy.insuranceCompany || "");

    const allIds = relatedPolicies.length ? relatedPolicies.map((p) => p.id) : [policy.id];
    setSelectedPolicyIds(allIds);

    const contactName = policy.contactPerson || policy.contactPersonName || policy.insuredName || "Customer";
    const expiry = policy.expiryDate ? new Date(policy.expiryDate).toLocaleDateString("en-IN") : "soon";
    const defaultMsg = `Dear ${contactName},\n\nThis is a friendly reminder that your ${policy.policyType || "insurance"} policy (${policy.policyNumber || ""}) with ${policy.insuranceCompany || "us"} is expiring on ${expiry}.\n\nPlease let us know if you would like to proceed with the renewal.\n\nWarm regards,\n*Team Bima Headquarter*`;
    setCustomWhatsAppMessage(defaultMsg);

    // Fetch timeline
    if (policy.id) {
      setTimelineLoading(true);
      fetch(`/api/renewals/remarks?policyId=${policy.id}`)
        .then((res) => res.json())
        .then((data) => {
          setTimeline(Array.isArray(data.remarks) ? data.remarks : []);
        })
        .catch(() => setTimeline([]))
        .finally(() => setTimelineLoading(false));
    }
  }, [policy, initialTab, relatedPolicies]);

  if (!mounted || !policy) return null;

  const contactNumber = String(
    policy.renewalRecipientMobile || policy.contactNumber || policy.contactPersonMobile || ""
  ).replace(/\D/g, "");
  const cleanPhone = contactNumber.slice(-10);
  const contactPerson = policy.contactPerson || policy.contactPersonName || policy.renewalRecipientName || "—";

  const getTargetPolicyIds = () => {
    if (interactionScope === "single") return [policy.id];
    if (interactionScope === "all" && relatedPolicies.length) return relatedPolicies.map((p) => p.id);
    return selectedPolicyIds.length ? selectedPolicyIds : [policy.id];
  };

  const handleCall = () => {
    if (cleanPhone.length >= 10) {
      window.open(`tel:${cleanPhone}`);
    } else {
      showToast("No valid phone number available for this policy.", "error");
    }
  };

  const handleOpenWhatsAppWeb = () => {
    if (cleanPhone.length < 10) {
      showToast("No valid phone number for WhatsApp.", "error");
      return;
    }
    const phoneWithCountry = `91${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(customWhatsAppMessage)}`;
    window.open(url, "_blank");
  };

  const handleSave = async (andNext = false) => {
    if (activeTab === "remark") {
      await handleSaveRemark(null, andNext);
    } else if (activeTab === "renew") {
      await handleMarkRenewed(null, andNext);
    } else if (activeTab === "lost") {
      await handleMarkLost(null, andNext);
    }
  };

  const handleSaveRemark = async (e, andNext = false) => {
    if (e) e.preventDefault();
    if (!remarkText.trim()) {
      showToast("Please enter a remark note.", "error");
      return;
    }

    const targetIds = getTargetPolicyIds();
    const previousPolicyState = { ...policy };
    const optimisticUpdatedPolicy = {
      ...policy,
      renewalStatus: renewalStatus,
      lastRemark: remarkText.trim(),
      nextFollowUpDate: followUpDate || policy.nextFollowUpDate,
      _recentlyUpdated: true,
    };

    // Optimistic Update
    if (onPolicyUpdated) {
      onPolicyUpdated(optimisticUpdatedPolicy, targetIds);
    }

    const expectedUpdatedAts = targetIds.reduce((acc, id) => {
      const found = [policy, ...(relatedPolicies || [])].find((p) => p.id === id);
      if (found?.updatedAt) acc[id] = found.updatedAt;
      return acc;
    }, {});

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: policy.id,
          policyIds: targetIds,
          remark: remarkText.trim(),
          nextFollowUpDate: followUpDate,
          followUpStatus: renewalStatus,
          followUpMode: followUpMode,
          priority: priority,
          expectedUpdatedAt: policy.updatedAt,
          expectedUpdatedAts,
        }),
      });

      if (res.ok) {
        showToast(
          targetIds.length > 1
            ? `Remark logged for ${targetIds.length} policies!`
            : "Remark recorded successfully!",
          "success"
        );
        if (andNext && onSaveAndNext) {
          onSaveAndNext(optimisticUpdatedPolicy);
        } else {
          onClose();
        }
      } else {
        // Rollback on failure or conflict
        const data = await res.json().catch(() => ({}));
        if (onPolicyUpdated) onPolicyUpdated(previousPolicyState, targetIds);
        showToast(data.error || "Failed to save remark.", "error");
      }
    } catch {
      // Rollback on network failure
      if (onPolicyUpdated) onPolicyUpdated(previousPolicyState, targetIds);
      showToast("Network error: Failed to save remark.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkRenewed = async (e, andNext = false) => {
    if (e) e.preventDefault();
    const previousPolicyState = { ...policy };
    const optimisticUpdatedPolicy = {
      ...policy,
      renewalStatus: "Renewed",
      lastRemark: renewRemark.trim() || `Renewed (${renewalType})`,
      _recentlyUpdated: true,
    };

    if (onPolicyUpdated) onPolicyUpdated(optimisticUpdatedPolicy);

    setIsSubmitting(true);
    try {
      const renewalPayload = {
        renewalType,
        policyNumber: newPolicyNo.trim() || undefined,
        insuranceCompany: newInsurer || undefined,
        startDate: startDate || undefined,
        expiryDate: expiryDate || undefined,
        premium: renewedPremium || undefined,
        netPremium: netPremium || undefined,
        paymentStatus,
        paymentMode,
        remark: renewRemark.trim() || `Renewed through ${renewalType}`,
        expectedUpdatedAt: policy.updatedAt,
      };

      const idempotencyKey = `${policy.id}-${Date.now()}`;
      let res;

      // If user chose to upload renewed policy copy now, perform unified atomic submission
      if (uploadPolicyNow && policyCopyFile) {
        const formData = new FormData();
        formData.append("previousPolicyId", policy.id);
        formData.append("idempotencyKey", idempotencyKey);
        formData.append("file", policyCopyFile);
        formData.append("renewedData", JSON.stringify(renewalPayload));

        res = await fetch("/api/renewals/renew", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/renewals/renew", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previousPolicyId: policy.id,
            idempotencyKey,
            renewedData: renewalPayload,
          }),
        });
      }

      if (res.ok) {
        showToast(
          uploadPolicyNow && policyCopyFile
            ? `Policy ${policy.policyNumber} renewed & policy document uploaded!`
            : `Policy ${policy.policyNumber} marked as Renewed!`,
          "success"
        );
        if (andNext && onSaveAndNext) {
          onSaveAndNext(optimisticUpdatedPolicy);
        } else {
          onClose();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (onPolicyUpdated) onPolicyUpdated(previousPolicyState);
        showToast(data.error || "Failed to renew policy.", "error");
      }
    } catch {
      if (onPolicyUpdated) onPolicyUpdated(previousPolicyState);
      showToast("Network error: Failed to renew policy.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkLost = async (e, andNext = false) => {
    if (e) e.preventDefault();
    const previousPolicyState = { ...policy };
    const optimisticUpdatedPolicy = {
      ...policy,
      renewalStatus: "Lost",
      lostReason: lostReason,
      lastRemark: lostRemarks.trim() || `Lost: ${lostReason}`,
      _recentlyUpdated: true,
    };

    if (onPolicyUpdated) onPolicyUpdated(optimisticUpdatedPolicy);

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/renewals/lost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: policy.id,
          lostReason: lostReason,
          remarks: lostRemarks.trim(),
          expectedUpdatedAt: policy.updatedAt,
        }),
      });

      if (res.ok) {
        showToast("Policy marked as Lost.", "info");
        if (andNext && onSaveAndNext) {
          onSaveAndNext(optimisticUpdatedPolicy);
        } else {
          onClose();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (onPolicyUpdated) onPolicyUpdated(previousPolicyState);
        showToast(data.error || "Failed to mark policy as lost.", "error");
      }
    } catch {
      if (onPolicyUpdated) onPolicyUpdated(previousPolicyState);
      showToast("Network error: Failed to mark policy as lost.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="rn-drawer-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <style>{`
        @media (max-width: 640px) {
          .rn-drawer-content {
            width: 100vw !important;
            min-width: 100vw !important;
            max-width: 100vw !important;
          }
        }
      `}</style>
      <div
        ref={drawerRef}
        className="rn-drawer-content"
        style={{
          width: "min(540px, 44vw)",
          minWidth: "420px",
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-8px 0 28px rgba(0, 0, 0, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            background: "#f8fafc",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#2563eb",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {policy.policyType || "Policy Record"} · {policy.insuranceCompany || ""}
            </span>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {policy.insuredName || "Unnamed Policyholder"}
            </h2>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px" }}>
              Policy: <strong style={{ color: "#1e293b", fontFamily: "monospace" }}>{policy.policyNumber || "—"}</strong>
              {policy.expiryDate && (
                <span style={{ marginLeft: "10px" }}>
                  Expires: <strong style={{ color: "#d97706" }}>{new Date(policy.expiryDate).toLocaleDateString("en-IN")}</strong>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              border: "none",
              background: "#f1f5f9",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-Policy Account Notice & Scope Selector */}
        {relatedPolicies.length > 1 && (
          <div
            style={{
              padding: "10px 24px",
              background: "#eff6ff",
              borderBottom: "1px solid #dbeafe",
              fontSize: "12px",
              color: "#1e40af",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "4px" }}>
              <Layers size={14} /> Multi-Policy Client: {relatedPolicies.length} expiring policies
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="interactionScope"
                  checked={interactionScope === "all"}
                  onChange={() => setInteractionScope("all")}
                />
                Apply to all {relatedPolicies.length} policies
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="interactionScope"
                  checked={interactionScope === "single"}
                  onChange={() => setInteractionScope("single")}
                />
                This policy only
              </label>
            </div>
          </div>
        )}

        {/* Quick Contact Action Strip */}
        <div
          style={{
            padding: "12px 24px",
            background: "#ffffff",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "11.5px", color: "#64748b" }}>Contact: {contactPerson}</div>
            <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }}>
              {cleanPhone ? `+91 ${cleanPhone}` : "No number recorded"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCall}
              disabled={!cleanPhone}
              title="Call Customer (Press 'C')"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1e293b",
                cursor: cleanPhone ? "pointer" : "not-allowed",
                opacity: cleanPhone ? 1 : 0.5,
              }}
            >
              <Phone size={14} style={{ color: "#2563eb" }} /> Call
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("whatsapp")}
              disabled={!cleanPhone}
              title="Open WhatsApp tab (Press 'W')"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                fontSize: "12px",
                fontWeight: 600,
                color: "#166534",
                cursor: cleanPhone ? "pointer" : "not-allowed",
                opacity: cleanPhone ? 1 : 0.5,
              }}
            >
              <Send size={14} style={{ color: "#16a34a" }} /> WhatsApp
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
            padding: "0 16px",
          }}
        >
          {[
            { id: "remark", label: "Log Call / Note", icon: MessageSquare },
            { id: "renew", label: "Mark Renewed", icon: CheckCircle2 },
            { id: "lost", label: "Mark Lost", icon: XCircle },
            { id: "whatsapp", label: "WhatsApp", icon: Send },
            { id: "timeline", label: "Timeline", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "12px 10px",
                  fontSize: "12px",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#2563eb" : "#64748b",
                  borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
                  background: "none",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  cursor: "pointer",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          {/* TAB 1: Log Call / Remark */}
          {activeTab === "remark" && (
            <form onSubmit={handleSaveRemark} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>
                  QUICK OUTCOME CHIPS
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    { label: "Interested (Send Quote)", text: "Customer is interested, requested renewal quote.", status: "Interested", days: 1 },
                    { label: "Call Back Tomorrow", text: "Customer asked to call back tomorrow.", status: "Follow-Up", days: 1 },
                    { label: "Call Back (3 Days)", text: "Customer asked to follow up after 3 days.", status: "Follow-Up", days: 3 },
                    { label: "Ringing / No Answer", text: "Phone ringing, no response.", status: "Called", days: 1 },
                    { label: "Not Reachable", text: "Phone switched off or network unreachable.", status: "Called", days: 2 },
                    { label: "Not Interested", text: "Customer stated they do not wish to renew.", status: "Called", days: 0 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        if (chip.days > 0) d.setDate(d.getDate() + chip.days);
                        const isoStr = chip.days > 0 ? d.toISOString().slice(0, 16) : "";
                        setRemarkText(chip.text);
                        setRenewalStatus(chip.status);
                        if (isoStr) setFollowUpDate(isoStr);
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "14px",
                        fontSize: "11.5px",
                        fontWeight: 500,
                        background: "rgba(37, 99, 235, 0.08)",
                        color: "#2563eb",
                        border: "1px solid rgba(37, 99, 235, 0.25)",
                        cursor: "pointer",
                      }}
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Remark Notes *
                </label>
                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Enter details of your call or interaction..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Status Outcome
                  </label>
                  <select
                    value={renewalStatus}
                    onChange={(e) => setRenewalStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="Called">Called</option>
                    <option value="Follow-Up">Follow-Up</option>
                    <option value="Quote Sent">Quote Sent</option>
                    <option value="Interested">Interested</option>
                    <option value="Negotiation">Negotiation</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Next Follow-Up Date
                  </label>
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Follow-Up Mode
                  </label>
                  <select
                    value={followUpMode}
                    onChange={(e) => setFollowUpMode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="Office Visit">Office Visit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: Save & Save & Next */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave(true)}
                  style={{
                    flex: 1.3,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  Save & Next Customer <ChevronRight size={15} />
                </button>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                Tip: Press <strong>Ctrl + Enter</strong> to Save & Next
              </div>
            </form>
          )}

          {/* TAB 2: Mark Renewed */}
          {activeTab === "renew" && (
            <form onSubmit={handleMarkRenewed} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "12.5px", color: "#166534" }}>
                Marking renewed updates this renewal task and preserves policy retention metrics.
              </div>

              {/* Renewal Type Radio */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Renewal Issuance Source *
                </label>
                <div style={{ display: "flex", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="renewalType"
                      checked={renewalType === "BHQ"}
                      onChange={() => setRenewalType("BHQ")}
                    />
                    Renewed through Bima Headquarter (BHQ)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="renewalType"
                      checked={renewalType === "ELSEWHERE"}
                      onChange={() => setRenewalType("ELSEWHERE")}
                    />
                    Renewed Elsewhere
                  </label>
                </div>
              </div>

              {renewalType === "BHQ" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        New Policy No.
                      </label>
                      <input
                        type="text"
                        value={newPolicyNo}
                        onChange={(e) => setNewPolicyNo(e.target.value)}
                        placeholder="e.g. 2311/00431289"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        Insurance Company
                      </label>
                      <input
                        type="text"
                        value={newInsurer}
                        onChange={(e) => setNewInsurer(e.target.value)}
                        placeholder="Insurer name"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        Gross Premium (₹)
                      </label>
                      <input
                        type="number"
                        value={renewedPremium}
                        onChange={(e) => setRenewedPremium(e.target.value)}
                        placeholder="Total Premium"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        Net Premium (₹)
                      </label>
                      <input
                        type="number"
                        value={netPremium}
                        onChange={(e) => setNetPremium(e.target.value)}
                        placeholder="Net Premium"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        Payment Status
                      </label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#fff" }}
                      >
                        <option value="Collected">Collected</option>
                        <option value="Pending Collection">Pending Collection</option>
                        <option value="Cheque Awaiting Clearance">Cheque Awaiting Clearance</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                        Payment Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#fff" }}
                      >
                        <option value="Online / UPI">Online / UPI</option>
                        <option value="Credit / Debit Card">Credit / Debit Card</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Notes
                </label>
                <textarea
                  value={renewRemark}
                  onChange={(e) => setRenewRemark(e.target.value)}
                  placeholder="e.g. Paid online, renewed policy copy to be sent on WhatsApp"
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontFamily: "inherit" }}
                />
              </div>

              {/* Optional in-place Document Upload */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#1e293b", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={uploadPolicyNow}
                    onChange={(e) => {
                      setUploadPolicyNow(e.target.checked);
                      if (!e.target.checked) setPolicyCopyFile(null);
                    }}
                  />
                  Upload Policy Copy Now
                </label>
                {uploadPolicyNow && (
                  <div style={{ marginTop: "10px" }}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPolicyCopyFile(e.target.files?.[0] || null)}
                      style={{ fontSize: "12.5px", width: "100%", padding: "4px" }}
                    />
                    {policyCopyFile ? (
                      <div style={{ fontSize: "12px", color: "#166534", marginTop: "5px", fontWeight: 600 }}>
                        Selected: {policyCopyFile.name} ({(policyCopyFile.size / 1024).toFixed(1)} KB)
                      </div>
                    ) : (
                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                        Attach the issued policy schedule PDF to upload in-place while keeping your queue and filters.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? "Saving..." : "Confirm Renewal"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleMarkRenewed(null, true)}
                  style={{
                    flex: 1.2,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#065f46",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  Renew & Next <ChevronRight size={15} />
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Mark Lost */}
          {activeTab === "lost" && (
            <form onSubmit={handleMarkLost} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "10px 14px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "12.5px", color: "#991b1b" }}>
                Moving to Lost records the loss reason for retention analysis and takes it off daily pending work.
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Reason for Loss *
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#ffffff" }}
                >
                  <option value="Premium High">Premium Too High</option>
                  <option value="Renewed with Competitor">Renewed with Another Agent / Competitor</option>
                  <option value="Vehicle Sold">Vehicle / Asset Sold</option>
                  <option value="Dissatisfied with Service">Dissatisfied with Previous Service / Claim</option>
                  <option value="Company Direct">Renewed Directly with Insurance Company</option>
                  <option value="Not Reachable After Multiple Attempts">Not Reachable After Multiple Attempts</option>
                  <option value="Customer Declined">Customer Refused / Declined</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Remarks / Explanation
                </label>
                <textarea
                  value={lostRemarks}
                  onChange={(e) => setLostRemarks(e.target.value)}
                  placeholder="Explain why customer did not renew..."
                  rows={3}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? "Saving..." : "Confirm Policy Lost"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleMarkLost(null, true)}
                  style={{
                    flex: 1.2,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#991b1b",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  Lost & Next <ChevronRight size={15} />
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: WhatsApp Message */}
          {activeTab === "whatsapp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Message Preview (WhatsApp)
                </label>
                <textarea
                  value={customWhatsAppMessage}
                  onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                  rows={7}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleOpenWhatsAppWeb}
                disabled={!cleanPhone}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: cleanPhone ? "pointer" : "not-allowed",
                  opacity: cleanPhone ? 1 : 0.6,
                }}
              >
                <ExternalLink size={15} /> Open in WhatsApp Web & Send
              </button>
            </div>
          )}

          {/* TAB 5: Timeline History */}
          {activeTab === "timeline" && (
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "12px" }}>
                Remarks & Interaction History
              </div>
              {timelineLoading ? (
                <div style={{ fontSize: "13px", color: "#64748b", padding: "16px 0" }}>Loading history...</div>
              ) : timeline.length === 0 ? (
                <div style={{ fontSize: "13px", color: "#64748b", padding: "16px 0" }}>
                  No previous remarks recorded for this policy yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {timeline.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        fontSize: "12.5px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.author || item.userName || "Agent"}</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "Recent"}
                        </span>
                      </div>
                      <div style={{ color: "#334155", whiteSpace: "pre-wrap" }}>{item.remark || item.text}</div>
                      {item.nextFollowUpDate && (
                        <div style={{ fontSize: "11.5px", color: "#2563eb", marginTop: "4px" }}>
                          📅 Next follow-up: {new Date(item.nextFollowUpDate).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
