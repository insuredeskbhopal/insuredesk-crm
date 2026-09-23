"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
  ExternalLink,
  Edit3,
  UserPlus,
  FileText,
  Copy,
  AlertCircle,
  Building2,
  Mail,
  User,
  MessageCircle,
  Calendar,
  Zap,
  Ban,
  Car,
  Users,
  Warehouse,
  Flame,
  HeartPulse,
  Shield,
  ArrowRight,
  Paperclip,
  Loader2,
  Check,
  Sparkles,
  UploadCloud,
  Download,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { showToast } from "@/app/components/shared/ToastProvider";
import WhatsAppRecipientPicker from "@/app/components/whatsapp/WhatsAppRecipientPicker";

function getCategoryIcon(cat, size = 13, style = { color: "#475569" }) {
  const c = String(cat || "").toUpperCase();
  if (c.includes("WAREHOUSE")) return <Warehouse size={size} style={style} />;
  if (c.includes("MOTOR") || c.includes("VEHICLE") || c.includes("CAR") || c.includes("BIKE")) return <Car size={size} style={style} />;
  if (c.includes("FIRE")) return <Flame size={size} style={style} />;
  if (c.includes("HEALTH") || c.includes("MEDICLAIM")) return <HeartPulse size={size} style={style} />;
  if (c.includes("LIFE")) return <Shield size={size} style={style} />;
  if (c.includes("BUILDING") || c.includes("PROPERTY") || c.includes("OFFICE")) return <Building2 size={size} style={style} />;
  return <Shield size={size} style={style} />;
}

function getCustomerInitials(name) {
  if (!name || typeof name !== "string") return "CU";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getCustomerKey(p) {
  if (!p) return "";
  if (p.customerPortfolioId) return String(p.customerPortfolioId);
  const rawContact = p.contactNumber || p.renewalRecipientMobile || p.contactPersonMobile || "";
  const digits = String(rawContact).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : `NO-MOBILE-${p.id}`;
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function RenewalActionDrawer({
  policy: initialPolicy,
  relatedPolicies = [],
  initialTab = "remark",
  onClose,
  onPolicyUpdated,
  onSaveAndNext,
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activePolicy, setActivePolicy] = useState(initialPolicy);
  const [activeTab, setActiveTab] = useState(initialTab || "remark");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-policy selection scope
  const allPolicies = relatedPolicies.length > 0 ? relatedPolicies : initialPolicy ? [initialPolicy] : [];
  const [interactionScope, setInteractionScope] = useState("all"); // "single" | "all"

  // Resizable Drawer state
  const [drawerWidth, setDrawerWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("rn-drawer-width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 480 && parsed <= 1180) {
          setDrawerWidth(parsed);
          return;
        } else if (parsed > 1180) {
          setDrawerWidth(1150);
          return;
        }
      }
      setDrawerWidth(Math.min(1050, Math.max(540, Math.round(window.innerWidth * 0.58))));
    }
  }, []);

  const startResizing = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - moveEvent.clientX;
      const minW = 480;
      const maxW = Math.min(1180, Math.round(window.innerWidth * 0.85));
      const clamped = Math.max(minW, Math.min(newWidth, maxW));
      setDrawerWidth(clamped);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setDrawerWidth((curr) => {
        try {
          window.localStorage.setItem("rn-drawer-width", String(curr));
        } catch {}
        return curr;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };


  // Remark Form
  const [selectedChip, setSelectedChip] = useState("Interested (Send Quote)");
  const [remarkText, setRemarkText] = useState("Customer is interested, requested renewal quote.");
  const [followUpDate, setFollowUpDate] = useState("");
  const [renewalStatus, setRenewalStatus] = useState("Interested");
  const [followUpMode, setFollowUpMode] = useState("Call");
  const [priority, setPriority] = useState("Normal");

  // Edit Contact Form
  const [editInsuredName, setEditInsuredName] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRenewalRecipientName, setEditRenewalRecipientName] = useState("");
  const [editRenewalRecipientMobile, setEditRenewalRecipientMobile] = useState("");
  const [editRenewalRecipientEmail, setEditRenewalRecipientEmail] = useState("");
  const [editPolicyNumber, setEditPolicyNumber] = useState("");
  const [editInsuranceCompany, setEditInsuranceCompany] = useState("");
  const [editPolicyType, setEditPolicyType] = useState("");
  const [editPremium, setEditPremium] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editScope, setEditScope] = useState("all");

  // Assign Agent Form
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assignScope, setAssignScope] = useState("all");

  // Comprehensive Renew Form
  const [renewalType, setRenewalType] = useState("BHQ"); // "BHQ" | "ELSEWHERE"
  const [renewedPremium, setRenewedPremium] = useState("");
  const [netPremium, setNetPremium] = useState("");
  const [newPolicyNo, setNewPolicyNo] = useState("");
  const [newInsurer, setNewInsurer] = useState("");
  const [startDate, _setStartDate] = useState("");
  const [expiryDate, _setExpiryDate] = useState("");
  const [paymentStatus, _setPaymentStatus] = useState("Collected");
  const [paymentMode, _setPaymentMode] = useState("Online / UPI");
  const [renewRemark, setRenewRemark] = useState("");
  const [uploadPolicyNow, _setUploadPolicyNow] = useState(false);
  const [policyCopyFile, _setPolicyCopyFile] = useState(null);

  // Lost Form
  const [lostReason, setLostReason] = useState("Premium High");
  const [lostRemarks, setLostRemarks] = useState("");

  // WhatsApp Message & Templates
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState("");
  const [whatsappTemplates, setWhatsappTemplates] = useState({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("renewal_msg");
  const [whatsappContactDetails, setWhatsappContactDetails] = useState(null);
  const [_whatsappLoading, setWhatsappLoading] = useState(false);
  const [sendingViaApi, setSendingViaApi] = useState(false);
  const [whatsappRecipientType, setWhatsAppRecipientType] = useState("individual");
  const [whatsappGroupId, setWhatsAppGroupId] = useState("");

  // WhatsApp Attachments
  const [attachedFile, setAttachedFile] = useState(null); // { name, size, type, base64, dataUrl, isPolicyDoc }
  const [loadingAttachment, setLoadingAttachment] = useState(false);
  const fileInputRef = useRef(null);

  // Timeline
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Focus Trapping & Restoration Refs
  const previousFocusRef = useRef(null);
  const drawerRef = useRef(null);

  // Sync state when activePolicy changes
  useEffect(() => {
    if (!initialPolicy) return;
    setActivePolicy(initialPolicy);
  }, [initialPolicy]);

  useEffect(() => {
    if (!activePolicy) return;
    setAttachedFile(null);
    setLoadingAttachment(false);
    setWhatsAppRecipientType("individual");
    setWhatsAppGroupId("");
    setRenewalStatus(activePolicy.renewalStatus || "Follow-Up");
    setNewInsurer(activePolicy.insuranceCompany || "");
    setRenewedPremium(activePolicy.totalPremium || activePolicy.premium || "");
    setNetPremium(activePolicy.netPremium || "");

    // Edit contact fields
    setEditInsuredName(activePolicy.insuredName || "");
    const cpName = activePolicy.contactPerson || activePolicy.contactPersonName || "";
    setEditContactPerson(["Contact not available", "Unknown Contact"].includes(cpName) ? "" : cpName);
    const rawMob = activePolicy.contactNumber || activePolicy.contactPersonMobile || "";
    setEditPhone(String(rawMob).replace(/\D/g, "").slice(-10));
    setEditEmail(activePolicy.contactPersonEmail || activePolicy.email || "");

    setEditRenewalRecipientName(activePolicy.renewalRecipientName || cpName || "");
    const rawRecMob = activePolicy.renewalRecipientMobile || rawMob;
    setEditRenewalRecipientMobile(String(rawRecMob).replace(/\D/g, "").slice(-10));
    setEditRenewalRecipientEmail(activePolicy.renewalRecipientEmail || activePolicy.contactPersonEmail || activePolicy.email || "");

    setEditPolicyNumber(String(activePolicy.policyNumber || "").replace(/:+$/, "").trim());
    setEditInsuranceCompany(activePolicy.insuranceCompany || "");
    setEditPolicyType(activePolicy.policyType || activePolicy.displayPolicyType || "");
    const pVal = activePolicy.totalPremium || activePolicy.premium || "";
    setEditPremium(String(pVal).replace(/[^0-9.-]/g, ""));
    const expDateStr = activePolicy.expiryDate
      ? new Date(activePolicy.expiryDate).toISOString().split("T")[0]
      : "";
    setEditExpiryDate(expDateStr);

    // Assign fields
    setSelectedAgentId(activePolicy.assignedToId || activePolicy.data?.assignedToId || "");

    // Fetch official WhatsApp message & templates from API
    setWhatsappLoading(true);
    fetch("/api/renewals/whatsapp-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policyId: activePolicy.id,
        phone: rawRecMob || rawMob,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) {
          setWhatsappTemplates(data.templates);
          const initialMsg = data.templates.renewal_msg || data.templates.due_soon || data.renewalMessage || "";
          setCustomWhatsAppMessage(initialMsg);
          setSelectedTemplateKey("renewal_msg");
        } else if (data.renewalMessage) {
          setCustomWhatsAppMessage(data.renewalMessage);
        }
        if (data.contactDetails) {
          setWhatsappContactDetails(data.contactDetails);
        } else {
          setWhatsappContactDetails({
            name: activePolicy.insuredName || "Customer",
            mobile: String(rawRecMob || rawMob).replace(/\D/g, "").slice(-10),
            whatsapp: String(rawRecMob || rawMob).replace(/\D/g, "").slice(-10),
            email: activePolicy.renewalRecipientEmail || activePolicy.email || "",
            company: activePolicy.insuredName || "",
            role: "Primary Contact",
          });
        }
      })
      .catch(() => {
        const contactName = activePolicy.contactPerson || activePolicy.insuredName || "Customer";
        const expiry = activePolicy.expiryDate
          ? new Date(activePolicy.expiryDate).toLocaleDateString("en-IN")
          : "soon";
        const defaultMsg = `Dear ${contactName},\n\nThis is a friendly reminder that your ${activePolicy.policyType || "insurance"} policy (${activePolicy.policyNumber || ""}) with ${activePolicy.insuranceCompany || "us"} is expiring on ${expiry}.\n\nPlease let us know if you would like to proceed with the renewal.\n\nWarm regards,\n*Team Bima Headquarter*`;
        setCustomWhatsAppMessage(defaultMsg);
        setWhatsappContactDetails({
          name: activePolicy.insuredName || "Customer",
          mobile: String(rawRecMob || rawMob).replace(/\D/g, "").slice(-10),
          whatsapp: String(rawRecMob || rawMob).replace(/\D/g, "").slice(-10),
          email: activePolicy.renewalRecipientEmail || activePolicy.email || "",
          company: activePolicy.insuredName || "",
          role: "Primary Contact",
        });
      })
      .finally(() => setWhatsappLoading(false));

    // Fetch timeline
    if (activePolicy.id) {
      setTimelineLoading(true);
      fetch(`/api/renewals/remarks?policyId=${activePolicy.id}`)
        .then((res) => res.json())
        .then((data) => {
          setTimeline(Array.isArray(data.remarks) ? data.remarks : []);
        })
        .catch(() => setTimeline([]))
        .finally(() => setTimelineLoading(false));
    }
  }, [activePolicy]);

  // Set initial tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fetch team members when assign tab is opened
  useEffect(() => {
    if (activeTab === "assign" && teamMembers.length === 0) {
      setTeamLoading(true);
      fetch("/api/renewals/team")
        .then((res) => res.json())
        .then((data) => {
          setTeamMembers(Array.isArray(data.users) ? data.users : []);
        })
        .catch(() => setTeamMembers([]))
        .finally(() => setTeamLoading(false));
    }
  }, [activeTab, teamMembers.length]);

  // Keyboard Shortcuts & Focus Management
  useEffect(() => {
    setMounted(true);
    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trapping
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

      // Check if inside input
      const tag = (e.target?.tagName || "").toLowerCase();
      const isInput =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target?.isContentEditable ||
        Boolean(e.target?.closest("input, textarea, select, [contenteditable='true']"));

      if (isInput) return;

      if (e.key === "w" || e.key === "W") setActiveTab("whatsapp");
      else if (e.key === "c" || e.key === "C") handleCall();
      else if (e.key === "f" || e.key === "F") setActiveTab("remark");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        try {
          previousFocusRef.current.focus();
        } catch {}
      }
    };
  }, [onClose, remarkText, followUpDate, renewalStatus, followUpMode, priority, interactionScope]);

  if (!mounted || !activePolicy) return null;

  const rawPhone = String(
    activePolicy.renewalRecipientMobile || activePolicy.contactNumber || activePolicy.contactPersonMobile || ""
  ).replace(/\D/g, "");
  const cleanPhone = rawPhone.slice(-10);
  const contactPerson =
    activePolicy.contactPerson || activePolicy.contactPersonName || activePolicy.renewalRecipientName || "—";
  const initials = getCustomerInitials(activePolicy.insuredName);
  const vehicleNumber = activePolicy.vehicleNumber || activePolicy.registrationNumber || "—";
  const policyCategory = (activePolicy.policyType || activePolicy.displayPolicyType || "Motor Policy").toUpperCase();
  const insuranceCompany = (activePolicy.insuranceCompany || activePolicy.companyName || "Insurer").toUpperCase();

  const getTargetPolicyIds = (scope = interactionScope) => {
    if (scope === "all" && allPolicies.length > 0) {
      return allPolicies.map((p) => p.id);
    }
    return [activePolicy.id];
  };

  const handleOpenProfile = () => {
    const key = getCustomerKey(activePolicy);
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const params = new window.URLSearchParams({ returnTo, policyId: activePolicy.id });
    window.sessionStorage.setItem("rn-customer-return-url", returnTo);
    window.sessionStorage.setItem("rn-customer-scroll-y", String(window.scrollY || 0));
    router.push(`/dashboard/renewals/customers/${encodeURIComponent(key)}?${params}`);
  };

  const handleCall = () => {
    if (cleanPhone.length >= 10) {
      window.open(`tel:${cleanPhone}`);
    } else {
      showToast("No valid phone number available for this policy.", "error");
    }
  };

  const handleCopyMessage = () => {
    if (!customWhatsAppMessage) return;
    if (typeof window !== "undefined" && window.navigator?.clipboard?.writeText) {
      window.navigator.clipboard.writeText(customWhatsAppMessage);
      showToast("Message copied to clipboard!", "success");
    } else {
      showToast("Clipboard copy not supported in this browser.", "error");
    }
  };

  const handleAttachPolicyPdf = async () => {
    if (!activePolicy?.id) {
      showToast("No policy record found.", "error");
      return;
    }
    setLoadingAttachment(true);
    try {
      const res = await fetch(`/api/records/${activePolicy.id}/pdf`);
      if (!res.ok) {
        let errMsg = "Policy PDF document not available for this record.";
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }
      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Policy document is empty.");
      }
      const reader = new (window.FileReader || FileReader)();
      reader.onloadend = () => {
        const base64Data = reader.result;
        const cleanBase64 = typeof base64Data === "string" && base64Data.includes(",")
          ? base64Data.split(",")[1]
          : base64Data;

        const cleanNumber = String(activePolicy.policyNumber || "Policy").replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = `${cleanNumber}.pdf`;
        setAttachedFile({
          name: fileName,
          size: blob.size,
          type: "application/pdf",
          base64: cleanBase64,
          dataUrl: base64Data,
          isPolicyDoc: true,
        });
        showToast("Policy document attached!", "success");
        setLoadingAttachment(false);
      };
      reader.onerror = () => {
        showToast("Failed to process policy PDF file.", "error");
        setLoadingAttachment(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Error attaching policy PDF:", err);
      showToast(err.message || "Failed to attach policy document.", "error");
      setLoadingAttachment(false);
    }
  };

  const handleCustomFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      showToast("File size exceeds 16MB limit.", "error");
      return;
    }
    const reader = new (window.FileReader || FileReader)();
    reader.onloadend = () => {
      const base64Data = reader.result;
      const cleanBase64 = typeof base64Data === "string" && base64Data.includes(",")
        ? base64Data.split(",")[1]
        : base64Data;
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        base64: cleanBase64,
        dataUrl: base64Data,
        isPolicyDoc: false,
      });
      showToast(`Attached ${file.name}`, "success");
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
  };

  const handleOpenWhatsAppWeb = () => {
    if (attachedFile) {
      try {
        const link = document.createElement("a");
        link.href = attachedFile.dataUrl || `data:${attachedFile.type || "application/pdf"};base64,${attachedFile.base64}`;
        link.download = attachedFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Document "${attachedFile.name}" downloaded! Opening WhatsApp Web — attach it to the chat.`, "info");
      } catch (err) {
        console.error("Auto-download failed:", err);
      }
    }

    if (whatsappRecipientType === "group") {
      if (customWhatsAppMessage) {
        window.navigator.clipboard.writeText(customWhatsAppMessage);
      }
      window.open("https://web.whatsapp.com", "_blank");
      if (!attachedFile) {
        showToast("Message copied! Opening WhatsApp Web to paste into group.", "info");
      }
      return;
    }

    if (cleanPhone.length < 10) {
      showToast("No valid phone number for WhatsApp.", "error");
      return;
    }
    const phoneWithCountry = `91${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(customWhatsAppMessage)}`;
    window.open(url, "_blank");
  };

  const handleSendViaApi = async () => {
    const isGroup = whatsappRecipientType === "group";
    const targetRecipient = isGroup ? whatsappGroupId : cleanPhone;

    if (isGroup) {
      if (!whatsappGroupId) {
        showToast("Please select a WhatsApp group before sending.", "error");
        return;
      }
    } else {
      if (cleanPhone.length < 10) {
        showToast("Add a valid 10-digit mobile number before sending.", "error");
        return;
      }
    }

    if (!customWhatsAppMessage.trim()) {
      showToast("Message cannot be empty.", "error");
      return;
    }

    setSendingViaApi(true);
    try {
      const payload = {
        recipient: targetRecipient,
        phone: targetRecipient,
        message: customWhatsAppMessage,
        policyId: activePolicy?.id,
      };

      if (attachedFile) {
        payload.attachments = [
          {
            filename: attachedFile.name,
            mediaBase64: attachedFile.base64,
            mediaType: attachedFile.type?.includes("pdf") || attachedFile.name?.toLowerCase().endsWith(".pdf")
              ? "document"
              : attachedFile.type?.startsWith("image/")
              ? "image"
              : "document",
          },
        ];
      }

      const res = await fetch("/api/operations/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "WhatsApp gateway failed. Try 'Open in WhatsApp Web'.");
      }

      // Log audit
      try {
        await fetch("/api/renewals/whatsapp-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            policyId: activePolicy.id,
            recipient: targetRecipient,
            phone: targetRecipient,
            message: customWhatsAppMessage,
            messageId: data.messageId || undefined,
            logAudit: true,
            isGroup,
            hasAttachment: Boolean(attachedFile),
            attachmentName: attachedFile?.name || null,
          }),
        });
      } catch (auditErr) {
        console.error("Failed to log WhatsApp audit:", auditErr);
      }

      showToast(
        isGroup
          ? (attachedFile ? "WhatsApp message and attachment sent to group!" : "WhatsApp message sent to group successfully!")
          : (attachedFile ? "WhatsApp message and attachment sent successfully!" : "WhatsApp message sent successfully!"),
        "success"
      );
    } catch (err) {
      showToast(`Gateway note: ${err.message}. You can send via WhatsApp Web below.`, "error");
    } finally {
      setSendingViaApi(false);
    }
  };

  const handleSave = async (andNext = false) => {
    if (activeTab === "remark") {
      await handleSaveRemark(null, andNext);
    } else if (activeTab === "renew") {
      await handleMarkRenewed(null, andNext);
    } else if (activeTab === "lost") {
      await handleMarkLost(null, andNext);
    } else if (activeTab === "edit") {
      await handleSaveContact(null);
    } else if (activeTab === "assign") {
      await handleSaveAssignment(null);
    }
  };

  // 1. SAVE REMARK / CALL NOTE
  const handleSaveRemark = async (e, andNext = false) => {
    if (e) e.preventDefault();
    if (!remarkText.trim()) {
      showToast("Please enter a remark note.", "error");
      return;
    }

    const targetIds = getTargetPolicyIds();
    const previousPolicyState = { ...activePolicy };
    const optimisticUpdatedPolicy = {
      ...activePolicy,
      renewalStatus: renewalStatus,
      lastRemark: remarkText.trim(),
      nextFollowUpDate: followUpDate || activePolicy.nextFollowUpDate,
      _recentlyUpdated: true,
    };

    if (onPolicyUpdated) {
      onPolicyUpdated(optimisticUpdatedPolicy, targetIds);
    }

    const expectedUpdatedAts = targetIds.reduce((acc, id) => {
      const found = allPolicies.find((p) => p.id === id);
      if (found?.updatedAt) acc[id] = found.updatedAt;
      return acc;
    }, {});

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/renewals/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: activePolicy.id,
          policyIds: targetIds,
          remark: remarkText.trim(),
          nextFollowUpDate: followUpDate,
          followUpStatus: renewalStatus,
          followUpMode: followUpMode,
          priority: priority,
          expectedUpdatedAt: activePolicy.updatedAt,
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
        const data = await res.json().catch(() => ({}));
        if (onPolicyUpdated) onPolicyUpdated(previousPolicyState, targetIds);
        showToast(data.error || "Failed to save remark.", "error");
      }
    } catch {
      if (onPolicyUpdated) onPolicyUpdated(previousPolicyState, targetIds);
      showToast("Network error: Failed to save remark.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. SAVE CONTACT DETAILS
  const handleSaveContact = async (e) => {
    if (e) e.preventDefault();
    if (!editInsuredName.trim()) {
      showToast("Customer Name is required.", "error");
      return;
    }
    if (!editPolicyNumber.trim()) {
      showToast("Policy Number is required.", "error");
      return;
    }
    if (!editInsuranceCompany.trim()) {
      showToast("Insurance Company is required.", "error");
      return;
    }
    if (!editPolicyType.trim()) {
      showToast("Policy Type is required.", "error");
      return;
    }
    if (!editExpiryDate) {
      showToast("Expiry Date is required.", "error");
      return;
    }
    if (editPhone.trim() && editPhone.trim().length !== 10) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    const targetIds = getTargetPolicyIds(editScope);
    setIsSubmitting(true);

    try {
      for (const targetId of targetIds) {
        const res = await fetch("/api/renewals/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            policyId: targetId,
            insuredName: editInsuredName.trim(),
            contactPersonName: editContactPerson.trim(),
            contactNumber: editPhone.trim(),
            contactPersonEmail: editEmail.trim(),
            renewalRecipientName: editRenewalRecipientName.trim() || editContactPerson.trim(),
            renewalRecipientMobile: editRenewalRecipientMobile.trim() || editPhone.trim(),
            renewalRecipientEmail: editRenewalRecipientEmail.trim() || editEmail.trim(),
            policyNumber: editPolicyNumber.trim(),
            insuranceCompany: editInsuranceCompany.trim(),
            policyType: editPolicyType.trim(),
            premium: editPremium || undefined,
            expiryDate: editExpiryDate,
            contactUpdateMode: "policy_only",
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update contact details");
        }
      }

      showToast(
        targetIds.length > 1
          ? `Contact updated for all ${targetIds.length} policies!`
          : "Contact details updated successfully!",
        "success"
      );

      const updated = {
        ...activePolicy,
        insuredName: editInsuredName.trim(),
        contactPerson: editContactPerson.trim(),
        contactPersonName: editContactPerson.trim(),
        contactNumber: editPhone.trim(),
        contactPersonEmail: editEmail.trim(),
        renewalRecipientName: editRenewalRecipientName.trim() || editContactPerson.trim(),
        renewalRecipientMobile: editRenewalRecipientMobile.trim() || editPhone.trim(),
        renewalRecipientEmail: editRenewalRecipientEmail.trim() || editEmail.trim(),
        policyNumber: editPolicyNumber.trim(),
        insuranceCompany: editInsuranceCompany.trim(),
        policyType: editPolicyType.trim(),
        expiryDate: editExpiryDate,
        totalPremium: editPremium || activePolicy.totalPremium,
        _recentlyUpdated: true,
      };

      setActivePolicy(updated);
      if (onPolicyUpdated) {
        onPolicyUpdated(updated, targetIds);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. ASSIGN AGENT
  const handleSaveAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAgentId) {
      showToast("Please select a team member to assign.", "error");
      return;
    }

    const targetIds = getTargetPolicyIds(assignScope);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/renewals/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyIds: targetIds,
          assignedToUserId: selectedAgentId,
          note: assignNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign agent");
      }

      showToast(
        targetIds.length > 1
          ? `Assigned ${targetIds.length} policies to ${data.assignedTo || "team member"}!`
          : `Assigned to ${data.assignedTo || "team member"}!`,
        "success"
      );

      const updated = {
        ...activePolicy,
        assignedTo: data.assignedTo,
        assignedToId: data.assignedToId,
        _recentlyUpdated: true,
      };

      setActivePolicy(updated);
      if (onPolicyUpdated) {
        onPolicyUpdated(updated, targetIds);
      }
      setActiveTab("timeline");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. MARK RENEWED
  const handleMarkRenewed = async (e, andNext = false) => {
    if (e) e.preventDefault();
    const previousPolicyState = { ...activePolicy };
    const optimisticUpdatedPolicy = {
      ...activePolicy,
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
        expectedUpdatedAt: activePolicy.updatedAt,
      };

      const idempotencyKey = `${activePolicy.id}-${Date.now()}`;
      let res;

      if (uploadPolicyNow && policyCopyFile) {
        const formData = new FormData();
        formData.append("previousPolicyId", activePolicy.id);
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
            previousPolicyId: activePolicy.id,
            idempotencyKey,
            renewedData: renewalPayload,
          }),
        });
      }

      if (res.ok) {
        showToast(
          uploadPolicyNow && policyCopyFile
            ? `Policy ${activePolicy.policyNumber} renewed & policy document uploaded!`
            : `Policy ${activePolicy.policyNumber} marked as Renewed!`,
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

  // 5. MARK LOST
  const handleMarkLost = async (e, andNext = false) => {
    if (e) e.preventDefault();
    const previousPolicyState = { ...activePolicy };
    const optimisticUpdatedPolicy = {
      ...activePolicy,
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
          policyId: activePolicy.id,
          lostReason: lostReason,
          remarks: lostRemarks.trim(),
          expectedUpdatedAt: activePolicy.updatedAt,
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

  const TABS = [
    { id: "remark", label: "Log Call / Note", icon: MessageSquare },
    { id: "edit", label: "Edit Contact", icon: User },
    { id: "assign", label: "Assign Agent", icon: UserPlus },
    { id: "policies", label: "Policies", icon: FileText, count: allPolicies.length },
    { id: "renew", label: "Mark Renewed", icon: CheckCircle2 },
    { id: "lost", label: "Mark Lost", icon: XCircle },
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { id: "timeline", label: "Timeline", icon: Clock },
  ];

  const QUICK_OUTCOMES = [
    { label: "Interested (Send Quote)", icon: Zap, text: "Customer is interested, requested renewal quote.", status: "Interested", days: 1 },
    { label: "Call Back Tomorrow", icon: Calendar, text: "Customer asked to call back tomorrow.", status: "Follow-Up", days: 1 },
    { label: "Call Back (3 Days)", icon: Calendar, text: "Customer asked to follow up after 3 days.", status: "Follow-Up", days: 3 },
    { label: "Ringing / No Answer", icon: Phone, text: "Phone ringing, no response.", status: "Called", days: 1 },
    { label: "Not Reachable", icon: Ban, text: "Phone switched off or network unreachable.", status: "Called", days: 2 },
    { label: "Not Interested", icon: X, text: "Customer stated they do not wish to renew.", status: "Called", days: 0 },
  ];

  const missingMobile = cleanPhone.length < 10;

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
        justifyContent: "flex-end", // RIGHT DRAWER!
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
        .rn-tab-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .rn-tab-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        ref={drawerRef}
        className="rn-drawer-content"
        style={{
          width: `${drawerWidth}px`,
          minWidth: "380px",
          maxWidth: "min(1180px, 90vw)",
          height: "100%", // Full height right drawer
          backgroundColor: "#ffffff",
          boxShadow: "-8px 0 28px rgba(0, 0, 0, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          position: "relative",
          transition: isResizing ? "none" : "width 0.1s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Edge Resize Handle */}
        <div
          className={`rn-drawer-resize-handle ${isResizing ? "resizing" : ""}`}
          onMouseDown={startResizing}
          title="Drag to resize drawer"
        >
          <div className="rn-drawer-resize-handle__bar" />
        </div>
        {/* Top Header */}
        <div className="rad-header">
          <div className="rad-header-inner">
            {/* Top utility row: Badges + Close button */}
            <div className="rad-badge-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className="rad-category-pill">
                  {getCategoryIcon(policyCategory)} {policyCategory}
                </span>
                <span style={{ width: "1px", height: "14px", backgroundColor: "#cbd5e1" }} />
                <span className="rad-insurer-name">
                  {insuranceCompany}
                </span>
                {activePolicy.renewalStatus && (
                  <>
                    <span style={{ width: "1px", height: "14px", backgroundColor: "#cbd5e1" }} />
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #e2e8f0"
                    }}>
                      {activePolicy.renewalStatus}
                    </span>
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="rad-profile-btn"
                  title="View full customer profile"
                >
                  <ExternalLink size={13} /> View Profile
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rad-close-btn"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Header Card: Customer Info + Contact & Quick Actions */}
            <div className="rad-hero-card">
              {/* Left: Avatar + Name + Meta Chips */}
              <div className="rad-hero-left">
                <div className="rad-avatar">
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2
                    className="rad-customer-name"
                    onClick={handleOpenProfile}
                    style={{ cursor: "pointer" }}
                    title="Click to view customer profile"
                  >
                    {activePolicy.insuredName || "Unnamed Customer"}
                  </h2>
                  <div className="rad-meta-chips">
                    <span className="rad-meta-chip">
                      <span className="rad-meta-chip-label">Policy:</span>
                      <strong style={{ fontFamily: "monospace" }}>
                        {String(activePolicy.policyNumber || "—").replace(/:+$/, "")}
                      </strong>
                    </span>
                    <span className="rad-meta-chip">
                      <span className="rad-meta-chip-label">Expiry:</span>
                      <strong>
                        {activePolicy.expiryDate ? new Date(activePolicy.expiryDate).toLocaleDateString("en-IN") : "—"}
                      </strong>
                    </span>
                    {vehicleNumber && vehicleNumber !== "—" && (
                      <span className="rad-meta-chip">
                        <span className="rad-meta-chip-label">Vehicle:</span>
                        <strong style={{ fontFamily: "monospace" }}>{vehicleNumber}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Contact Person & Action Buttons */}
              <div className="rad-hero-right">
                <div className="rad-contact-info-block">
                  <div className="rad-contact-name-label">
                    <User size={12} style={{ color: "#64748b" }} />
                    <span>{contactPerson && contactPerson !== activePolicy.insuredName ? contactPerson : "Primary Contact"}</span>
                  </div>
                  <div className="rad-contact-phone-val">
                    {cleanPhone ? `+91 ${cleanPhone}` : "No phone recorded"}
                  </div>
                </div>

                <div className="rad-hero-action-buttons">
                  <button
                    type="button"
                    onClick={handleCall}
                    disabled={!cleanPhone}
                    title="Call Customer"
                    className="rad-btn-call"
                  >
                    <Phone size={13} /> Call
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("whatsapp")}
                    disabled={!cleanPhone}
                    title="Send WhatsApp message"
                    className="rad-btn-whatsapp"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className="rn-drawer-tabs-wrapper">
          <div className="rn-drawer-tabs-segmented">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rn-drawer-seg-btn ${isActive ? "active" : ""}`}
                >
                  <Icon size={13} style={{ flexShrink: 0 }} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="rn-drawer-seg-badge">{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="rn-drawer-body-scroll">
          <div className="rn-drawer-body-inner">
          {/* TAB 1: Log Call / Note */}
          {activeTab === "remark" && (
            <form onSubmit={handleSaveRemark} className="rad-workspace">
              {/* Top: Quick Outcome Bar */}
              <div className="rad-card rad-quick-outcome-banner">
                <div className="rad-card-header-row">
                  <div>
                    <span className="rad-card-title">⚡ Quick Outcome</span>
                    <span className="rad-card-subtitle">Click an outcome to auto-populate notes & next follow-up</span>
                  </div>
                  {selectedChip && (
                    <span className="rad-selected-pill">Active: {selectedChip}</span>
                  )}
                </div>
                <div className="rad-quick-chips-grid">
                  {QUICK_OUTCOMES.map((chip) => {
                    const ChipIcon = chip.icon;
                    const isSelected = selectedChip === chip.label;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setSelectedChip(chip.label);
                          const d = new Date();
                          if (chip.days > 0) d.setDate(d.getDate() + chip.days);
                          const isoStr = chip.days > 0 ? d.toISOString().slice(0, 16) : "";
                          setRemarkText(chip.text);
                          setRenewalStatus(chip.status);
                          if (isoStr) setFollowUpDate(isoStr);
                        }}
                        className={`rad-chip-btn ${isSelected ? "selected" : ""}`}
                      >
                        <ChipIcon size={14} className="rad-chip-icon" />
                        <span className="rad-chip-text">{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main 2-Column Split Workspace */}
              <div className="rad-workspace-cols">
                {/* Left Column: Call Notes & Follow-up Settings */}
                <div className="rad-card rad-form-card">
                  {allPolicies.length > 1 && (
                    <div className="rad-multi-policy-notice">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                        <Layers size={13} /> Multi-Policy Client ({allPolicies.length} expiring policies)
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                        <button
                          type="button"
                          onClick={() => setInteractionScope("all")}
                          className={`rad-scope-btn ${interactionScope === "all" ? "active" : ""}`}
                        >
                          Apply to all {allPolicies.length} policies
                        </button>
                        <button
                          type="button"
                          onClick={() => setInteractionScope("single")}
                          className={`rad-scope-btn ${interactionScope === "single" ? "active" : ""}`}
                        >
                          This policy only
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remark Notes */}
                  <div className="rad-field-group">
                    <div className="rad-field-header">
                      <label className="rad-field-label">
                        Remark Notes <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <span className="rad-char-count">{remarkText.length}/1000</span>
                    </div>
                    <textarea
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="Enter details of your call or interaction..."
                      rows={4}
                      className="rad-textarea"
                      required
                    />
                  </div>

                  {/* 2x2 Grid: Follow-up & Priority */}
                  <div className="rad-fields-2x2">
                    <div className="rad-field-group">
                      <label className="rad-field-label">Status Outcome</label>
                      <select
                        value={renewalStatus}
                        onChange={(e) => setRenewalStatus(e.target.value)}
                        className="rad-select"
                      >
                        <option value="Called">Called</option>
                        <option value="Follow-Up">Follow-Up</option>
                        <option value="Quote Sent">Quote Sent</option>
                        <option value="Interested">Interested</option>
                        <option value="Negotiation">Negotiation</option>
                      </select>
                    </div>

                    <div className="rad-field-group">
                      <label className="rad-field-label">Next Follow-Up Date</label>
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="rad-input"
                      />
                    </div>

                    <div className="rad-field-group">
                      <label className="rad-field-label">Follow-Up Mode</label>
                      <select
                        value={followUpMode}
                        onChange={(e) => setFollowUpMode(e.target.value)}
                        className="rad-select"
                      >
                        <option value="Call">Phone Call</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">Email</option>
                        <option value="Office Visit">Office Visit</option>
                      </select>
                    </div>

                    <div className="rad-field-group">
                      <label className="rad-field-label">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="rad-select"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="rad-form-actions">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rad-btn-save-secondary"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSave(true)}
                      className="rad-btn-save-primary"
                    >
                      <span>Save & Next Customer</span> <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="rad-shortcut-tip">
                    Tip: Press <strong style={{ color: "#0f172a" }}>Ctrl + Enter</strong> to Save & Next
                  </div>
                </div>

                {/* Right Column: Customer Details & Recent Interaction History */}
                <div className="rad-card rad-context-card">
                  {/* Mini Policy Details Box */}
                  <div className="rad-context-policy-box">
                    <div className="rad-context-policy-title">
                      <FileText size={13} style={{ color: "#475569" }} /> Current Policy Details
                    </div>
                    <div className="rad-context-policy-grid">
                      <div>
                        <div className="rad-c-label">Insurer</div>
                        <div className="rad-c-val">{insuranceCompany || "—"}</div>
                      </div>
                      <div>
                        <div className="rad-c-label">Category</div>
                        <div className="rad-c-val">{policyCategory || "—"}</div>
                      </div>
                      <div>
                        <div className="rad-c-label">Total Premium</div>
                        <div className="rad-c-val">
                          {activePolicy.totalPremium || activePolicy.premium ? `₹${Number(activePolicy.totalPremium || activePolicy.premium).toLocaleString("en-IN")}` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="rad-c-label">Expiry Date</div>
                        <div className="rad-c-val" style={{ color: "#b91c1c", fontWeight: 700 }}>
                          {activePolicy.expiryDate ? new Date(activePolicy.expiryDate).toLocaleDateString("en-IN") : "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline History Feed */}
                  <div className="rad-context-timeline-box">
                    <div className="rad-card-title" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <Clock size={13} style={{ color: "#475569" }} /> Interaction History ({timeline.length})
                    </div>
                    {timelineLoading ? (
                      <div style={{ fontSize: "12px", color: "#64748b", padding: "12px 0" }}>Loading activity history...</div>
                    ) : timeline.length === 0 ? (
                      <div className="rad-timeline-empty">
                        <MessageCircle size={20} style={{ color: "#94a3b8", marginBottom: "4px" }} />
                        <div>No previous remarks recorded for this customer yet.</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>Your note logged here will appear in this timeline.</div>
                      </div>
                    ) : (
                      <div className="rad-timeline-feed">
                        {timeline.slice(0, 6).map((item, idx) => (
                          <div key={item.id || idx} className="rad-timeline-bubble">
                            <div className="rad-timeline-bubble-head">
                              <span className="rad-timeline-author">{item.author || item.userName || "Agent"}</span>
                              <span className="rad-timeline-time">
                                {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                              </span>
                            </div>
                            <div className="rad-timeline-text">{item.remark || item.text}</div>
                            {item.nextFollowUpDate && (
                              <div className="rad-timeline-badge">
                                📅 Next: {new Date(item.nextFollowUpDate).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: Edit Contact */}
          {activeTab === "edit" && (
            <form onSubmit={handleSaveContact} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "8px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                Update customer identity, renewal recipient, and policy details.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Company / Insured Name *
                  </label>
                  <input
                    type="text"
                    value={editInsuredName}
                    onChange={(e) => setEditInsuredName(e.target.value)}
                    placeholder="e.g. LION ENGINEERING CONSULTANT"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#ffffff", color: "#0f172a" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    placeholder="e.g. Arjun Nair"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#ffffff", color: "#0f172a" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Customer Mobile (10 digits)
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="8085070248"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontFamily: "monospace", background: "#ffffff", color: "#0f172a" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="customer@example.com"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#ffffff", color: "#0f172a" }}
                  />
                </div>
              </div>

              {/* Renewal Recipient Section */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "2px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Renewal Recipient (WhatsApp / Notice Contact)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={editRenewalRecipientName}
                      onChange={(e) => setEditRenewalRecipientName(e.target.value)}
                      placeholder="Recipient Name"
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff", color: "#0f172a" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Recipient Mobile
                    </label>
                    <input
                      type="tel"
                      value={editRenewalRecipientMobile}
                      onChange={(e) => setEditRenewalRecipientMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile"
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontFamily: "monospace", background: "#ffffff", color: "#0f172a" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      value={editRenewalRecipientEmail}
                      onChange={(e) => setEditRenewalRecipientEmail(e.target.value)}
                      placeholder="recipient@example.com"
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff", color: "#0f172a" }}
                    />
                  </div>
                </div>
              </div>

              {/* Policy Parameters */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "2px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Policy Parameters
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Policy Number *
                    </label>
                    <input
                      type="text"
                      value={editPolicyNumber}
                      onChange={(e) => setEditPolicyNumber(e.target.value)}
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontFamily: "monospace", background: "#ffffff", color: "#0f172a" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Insurance Company *
                    </label>
                    <input
                      type="text"
                      value={editInsuranceCompany}
                      onChange={(e) => setEditInsuranceCompany(e.target.value)}
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff", color: "#0f172a" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Policy Type *
                    </label>
                    <input
                      type="text"
                      value={editPolicyType}
                      onChange={(e) => setEditPolicyType(e.target.value)}
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff", color: "#0f172a" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff", color: "#0f172a" }}
                      required
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "10.5px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                      Premium (₹)
                    </label>
                    <input
                      type="number"
                      value={editPremium}
                      onChange={(e) => setEditPremium(e.target.value)}
                      placeholder="e.g. 12500"
                      style={{ width: "100%", padding: "7px 9px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff", color: "#0f172a" }}
                    />
                  </div>
                </div>
              </div>

              {allPolicies.length > 1 && (
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                  <label style={{ display: "block", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Apply contact updates to:
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setEditScope("all")}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: editScope === "all" ? "1px solid #94a3b8" : "1px solid #e2e8f0",
                        background: editScope === "all" ? "#f1f5f9" : "#ffffff",
                        color: editScope === "all" ? "#0f172a" : "#64748b",
                        fontSize: "11.5px",
                        fontWeight: editScope === "all" ? 600 : 500,
                        boxShadow: editScope === "all" ? "0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      All {allPolicies.length} policies for this customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditScope("single")}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: editScope === "single" ? "1px solid #94a3b8" : "1px solid #e2e8f0",
                        background: editScope === "single" ? "#f1f5f9" : "#ffffff",
                        color: editScope === "single" ? "#0f172a" : "#64748b",
                        fontSize: "11.5px",
                        fontWeight: editScope === "single" ? 600 : 500,
                        boxShadow: editScope === "single" ? "0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      This policy only
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: "4px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "#f1f5f9",
                  color: "#0f172a",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "1px solid #94a3b8",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "Saving Contact..." : "Save Contact Details"}
              </button>
            </form>
          )}

          {/* TAB 3: Assign Agent */}
          {activeTab === "assign" && (
            <form onSubmit={handleSaveAssignment} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "8px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                Assign renewal follow-up to a specific team member.
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0f172a", marginBottom: "5px" }}>
                  Assign To Agent *
                </label>
                {teamLoading ? (
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Loading team members...</div>
                ) : (
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      color: "#0f172a",
                    }}
                    required
                  >
                    <option value="">-- Select Team Member --</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email} ({m.role || "Agent"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#0f172a", marginBottom: "5px" }}>
                  Assignment Note / Instruction (Optional)
                </label>
                <textarea
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Customer requested quote before Friday..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    fontFamily: "inherit",
                    background: "#ffffff",
                    color: "#0f172a",
                  }}
                />
              </div>

              {allPolicies.length > 1 && (
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                  <label style={{ display: "block", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Assign to:
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setAssignScope("all")}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: assignScope === "all" ? "1px solid #94a3b8" : "1px solid #e2e8f0",
                        background: assignScope === "all" ? "#f1f5f9" : "#ffffff",
                        color: assignScope === "all" ? "#0f172a" : "#64748b",
                        fontSize: "11.5px",
                        fontWeight: assignScope === "all" ? 600 : 500,
                        boxShadow: assignScope === "all" ? "0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      All {allPolicies.length} policies for this customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignScope("single")}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: assignScope === "single" ? "1px solid #94a3b8" : "1px solid #e2e8f0",
                        background: assignScope === "single" ? "#f1f5f9" : "#ffffff",
                        color: assignScope === "single" ? "#0f172a" : "#64748b",
                        fontSize: "11.5px",
                        fontWeight: assignScope === "single" ? 600 : 500,
                        boxShadow: assignScope === "single" ? "0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      This policy only
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || teamLoading}
                style={{
                  marginTop: "4px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "#f1f5f9",
                  color: "#0f172a",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "1px solid #94a3b8",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "Assigning..." : "Assign Agent"}
              </button>
            </form>
          )}

          {/* TAB 4: View Policies */}
          {activeTab === "policies" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                <span>
                  <strong>{allPolicies.length}</strong> {allPolicies.length === 1 ? "Policy" : "Policies"} linked to this customer
                </span>
                <span>
                  Total Premium:{" "}
                  <strong>
                    ₹
                    {allPolicies
                      .reduce((sum, p) => sum + (Number(p.totalPremium || p.premium || 0) || 0), 0)
                      .toLocaleString("en-IN")}
                  </strong>
                </span>
              </div>

              {allPolicies.map((p) => {
                const isSelected = p.id === activePolicy.id;
                const cleanNo = String(p.policyNumber || "—").replace(/:+$/, "").trim();
                const exp = p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-IN") : "—";
                const prem = Number(p.totalPremium || p.premium || 0);

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: isSelected ? "1px solid #94a3b8" : "1px solid #e2e8f0",
                      background: isSelected ? "#f8fafc" : "#ffffff",
                      boxShadow: isSelected ? "0 1px 3px rgba(0, 0, 0, 0.04)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                        {cleanNo}
                      </span>
                      {isSelected ? (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a", background: "#e2e8f0", padding: "2px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                          Active in Drawer
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePolicy(p);
                            showToast(`Switched active policy to ${cleanNo}`, "info");
                          }}
                          style={{
                            fontSize: "11.5px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#0f172a",
                            cursor: "pointer",
                          }}
                        >
                          Switch to this
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {p.insuranceCompany || "Insurer"} · {p.policyType || "General"}
                      {p.vehicleNumber && ` · ${p.vehicleNumber}`}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "2px" }}>
                      <span>
                        Expires: <strong style={{ color: "#0f172a" }}>{exp}</strong>
                      </span>
                      <span>
                        Premium: <strong style={{ color: "#0f172a" }}>₹{prem.toLocaleString("en-IN")}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: Mark Renewed */}
          {activeTab === "renew" && (
            <form onSubmit={handleMarkRenewed} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Info banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  color: "#0f172a",
                  lineHeight: 1.4,
                }}
              >
                <CheckCircle2 size={16} style={{ color: "#0f172a", flexShrink: 0 }} />
                <span>Marking renewed updates this renewal task and preserves retention metrics.</span>
              </div>

              {/* Renewal Issuance Source - Segmented Button Cards */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
                  Renewal Issuance Source <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setRenewalType("BHQ")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: renewalType === "BHQ" ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
                      background: renewalType === "BHQ" ? "#f8fafc" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      boxShadow: renewalType === "BHQ" ? "0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: renewalType === "BHQ" ? "5px solid #64748b" : "2px solid #cbd5e1",
                        background: "#ffffff",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    />
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: renewalType === "BHQ" ? 700 : 600, color: "#0f172a" }}>
                        Through BHQ
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Bima Headquarter
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewalType("ELSEWHERE")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: renewalType === "ELSEWHERE" ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
                      background: renewalType === "ELSEWHERE" ? "#f8fafc" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      boxShadow: renewalType === "ELSEWHERE" ? "0 1px 2px rgba(0, 0, 0, 0.04)" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: renewalType === "ELSEWHERE" ? "5px solid #64748b" : "2px solid #cbd5e1",
                        background: "#ffffff",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    />
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: renewalType === "ELSEWHERE" ? 700 : 600, color: "#0f172a" }}>
                        Renewed Elsewhere
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Direct / Other Agent
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Row 1: Policy Number & Insurer */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                    New Policy Number
                  </label>
                  <input
                    type="text"
                    value={newPolicyNo}
                    onChange={(e) => setNewPolicyNo(e.target.value)}
                    placeholder="e.g. 3001/404930511/01/000"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                    Insurance Company
                  </label>
                  <input
                    type="text"
                    value={newInsurer}
                    onChange={(e) => setNewInsurer(e.target.value)}
                    placeholder="e.g. ICICI Lombard"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Renewed Premium & Net Premium */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                    Renewed Premium (₹)
                  </label>
                  <input
                    type="number"
                    value={renewedPremium}
                    onChange={(e) => setRenewedPremium(e.target.value)}
                    placeholder="e.g. 15400"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                    Net Premium (₹)
                  </label>
                  <input
                    type="number"
                    value={netPremium}
                    onChange={(e) => setNetPremium(e.target.value)}
                    placeholder="e.g. 13050"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Remarks */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "5px" }}>
                  Renewal Remarks / Notes
                </label>
                <textarea
                  value={renewRemark}
                  onChange={(e) => setRenewRemark(e.target.value)}
                  placeholder="e.g. Policy renewed with 50% NCB..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    fontFamily: "inherit",
                    background: "#ffffff",
                    color: "#0f172a",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSubmitting ? "Saving..." : "Confirm Renewed"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleMarkRenewed(null, true)}
                  style={{
                    flex: 1.3,
                    padding: "11px 16px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Renew & Next <ChevronRight size={15} />
                </button>
              </div>

              <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "2px" }}>
                Tip: Press <strong style={{ color: "#64748b" }}>Ctrl + Enter</strong> to Renew & Next
              </div>
            </form>
          )}

          {/* TAB 6: Mark Lost */}
          {activeTab === "lost" && (
            <form onSubmit={handleMarkLost} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "8px 12px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                Record reason why customer decided not to renew with us.
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                  Primary Reason for Loss *
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", background: "#ffffff", color: "#0f172a" }}
                  required
                >
                  <option value="Premium High">Premium High / Cheaper Rate Elsewhere</option>
                  <option value="Vehicle Sold">Vehicle Sold / Asset Transferred</option>
                  <option value="Direct With Insurer">Renewed Direct With Company</option>
                  <option value="Service Issue">Dissatisfied with Service / Claims</option>
                  <option value="Other Broker">Went to Another Broker / Agent</option>
                  <option value="No Response">Unreachable / No Response</option>
                  <option value="Not Required">Policy No Longer Required</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                  Detailed Remarks
                </label>
                <textarea
                  value={lostRemarks}
                  onChange={(e) => setLostRemarks(e.target.value)}
                  placeholder="Enter any additional feedback or details..."
                  rows={4}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontFamily: "inherit", background: "#ffffff", color: "#0f172a" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1.5px solid #dc2626",
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
                    flex: 1.3,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  Lost & Next <ChevronRight size={14} />
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: WhatsApp Message */}
          {activeTab === "whatsapp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* WhatsApp Recipient Destination Picker (Individual vs Group with Auto-Match) */}
              <WhatsAppRecipientPicker
                type={whatsappRecipientType}
                onTypeChange={(val) => {
                  setWhatsAppRecipientType(val);
                  if (val === "individual") {
                    setWhatsAppGroupId("");
                  }
                }}
                groupId={whatsappGroupId}
                onGroupChange={setWhatsAppGroupId}
                contactPhone={cleanPhone}
                disabled={sendingViaApi}
              />

              {/* Executive Recipient Card */}
              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                  padding: "14px 16px",
                  boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "14px",
                        letterSpacing: "0.5px",
                        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                        flexShrink: 0,
                      }}
                    >
                      {getCustomerInitials(whatsappContactDetails?.name || activePolicy.insuredName)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                          {whatsappContactDetails?.name || activePolicy.insuredName || "Valued Customer"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "2px 7px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 700,
                            background: "#dcfce7",
                            color: "#15803d",
                            letterSpacing: "0.02em",
                          }}
                        >
                          <Check size={10} strokeWidth={3} /> Verified Contact
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
                        {activePolicy.displayPolicyType || activePolicy.policyType || "Policy"} • {activePolicy.policyNumber ? `#${activePolicy.policyNumber}` : "No Policy #"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#334155",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                </div>

                {missingMobile && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      borderRadius: "8px",
                      fontSize: "11.5px",
                      color: "#be123c",
                      marginBottom: "10px",
                      fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>A valid 10-digit mobile is required to dispatch WhatsApp reminders.</span>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px 14px",
                    padding: "10px 12px",
                    borderRadius: "9px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", color: missingMobile ? "#dc2626" : "#0f172a" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: missingMobile ? "#fee2e2" : "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MessageCircle size={12} style={{ color: missingMobile ? "#dc2626" : "#16a34a" }} />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "block", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>WhatsApp</span>
                      <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "12px" }}>
                        {cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : "Missing mobile"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#0f172a" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Building2 size={12} style={{ color: "#475569" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "block", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Insurer</span>
                      <span style={{ fontWeight: 600, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {activePolicy.insuranceCompany || "Not specified"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#0f172a" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Mail size={12} style={{ color: "#475569" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "block", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Email</span>
                      <span style={{ fontWeight: 500, fontSize: "11.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", color: whatsappContactDetails?.email || activePolicy.email ? "#0f172a" : "#94a3b8" }}>
                        {whatsappContactDetails?.email || activePolicy.email || "Not available"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#0f172a" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <User size={12} style={{ color: "#475569" }} />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "block", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Role</span>
                      <span style={{ fontWeight: 600, fontSize: "12px" }}>
                        {whatsappContactDetails?.role || "Primary Policyholder"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Context */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Sparkles size={12} style={{ color: "#059669" }} />
                    Notice Scenario
                  </label>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>One-click scenario prefill</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    background: "#f8fafc",
                    padding: "5px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {[
                    { key: "renewal_msg", label: "Official Notice", icon: Zap, color: "#16a34a", activeBg: "#f0fdf4", activeBorder: "#86efac", textColor: "#166534" },
                    { key: "due_soon", label: "Due Soon", icon: Clock, color: "#2563eb", activeBg: "#eff6ff", activeBorder: "#93c5fd", textColor: "#1e40af" },
                    { key: "today", label: "Due Today", icon: Calendar, color: "#ea580c", activeBg: "#fff7ed", activeBorder: "#fdba74", textColor: "#9a3412" },
                    { key: "expired", label: "Overdue", icon: AlertTriangle, color: "#dc2626", activeBg: "#fef2f2", activeBorder: "#fca5a5", textColor: "#991b1b" },
                    { key: "follow_up", label: "Follow-Up", icon: MessageSquare, color: "#7c3aed", activeBg: "#faf5ff", activeBorder: "#d8b4fe", textColor: "#6b21a8" },
                  ].map((t) => {
                    const isSelected = selectedTemplateKey === t.key;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateKey(t.key);
                          if (whatsappTemplates[t.key]) {
                            setCustomWhatsAppMessage(whatsappTemplates[t.key]);
                          }
                        }}
                        style={{
                          flex: "1 1 auto",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "7px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? t.activeBg : "#ffffff",
                          color: isSelected ? t.textColor : "#64748b",
                          border: isSelected ? `1px solid ${t.activeBorder}` : "1px solid #e2e8f0",
                          boxShadow: isSelected ? "0 1px 3px rgba(0, 0, 0, 0.05)" : "0 1px 2px rgba(0, 0, 0, 0.02)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon
                          size={13}
                          style={{
                            color: isSelected ? t.color : "#94a3b8",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            color: isSelected ? t.textColor : "#64748b",
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Studio Composer */}
              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 3px 12px -2px rgba(15, 23, 42, 0.05)",
                }}
              >
                {/* Studio Topbar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#25D366",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                      }}
                    >
                      <MessageCircle size={12} />
                    </div>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>WhatsApp Message Studio</span>
                    <span style={{ fontSize: "10.5px", color: "#64748b", background: "#ffffff", padding: "1px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                      Auto-Signed
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      color: "#475569",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Copy message to clipboard"
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>

                {/* Studio Textarea */}
                <div style={{ position: "relative", background: "#fafafa" }}>
                  <textarea
                    value={customWhatsAppMessage}
                    onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                    rows={8}
                    placeholder="Type your WhatsApp message..."
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "none",
                      outline: "none",
                      fontSize: "12.5px",
                      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                      lineHeight: "1.55",
                      background: "transparent",
                      color: "#0f172a",
                      whiteSpace: "pre-wrap",
                      resize: "vertical",
                      minHeight: "140px",
                    }}
                  />
                </div>

                {/* Studio Footer bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 12px",
                    background: "#ffffff",
                    borderTop: "1px solid #f1f5f9",
                    fontSize: "11px",
                    color: "#94a3b8",
                  }}
                >
                  <span>Supports standard WhatsApp markup (*bold*, _italic_)</span>
                  <span>{customWhatsAppMessage.length} characters</span>
                </div>
              </div>

              {/* Luxury Attachment Dock */}
              <div style={{ marginTop: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Paperclip size={12} style={{ color: "#059669" }} />
                    Attached Documents & Media
                  </label>
                  {attachedFile && (
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#059669", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <CheckCircle2 size={12} /> 1 file queued for delivery
                    </span>
                  )}
                </div>

                {attachedFile ? (
                  /* Attached State - Premium Frosted Emerald Card */
                  <div
                    style={{
                      borderRadius: "12px",
                      border: "1.5px solid #a7f3d0",
                      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      boxShadow: "0 2px 10px -2px rgba(16, 185, 129, 0.12)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(5, 150, 105, 0.22)",
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={19} strokeWidth={2} style={{ display: "block" }} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#064e3b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "280px",
                            }}
                            title={attachedFile.name}
                          >
                            {attachedFile.name}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              background: attachedFile.isPolicyDoc ? "#dcfce7" : "#f1f5f9",
                              color: attachedFile.isPolicyDoc ? "#166534" : "#334155",
                              border: attachedFile.isPolicyDoc ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                              padding: "2px 7px",
                              borderRadius: "5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              flexShrink: 0,
                              lineHeight: "1.2",
                              display: "inline-block",
                            }}
                          >
                            {attachedFile.isPolicyDoc ? "Official Policy" : "Custom File"}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#047857", marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 600 }}>{formatFileSize(attachedFile.size)}</span>
                          <span>•</span>
                          <span style={{ color: "#059669", fontWeight: 600 }}>Ready to transmit via WhatsApp</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      {attachedFile.dataUrl && (
                        <a
                          href={attachedFile.dataUrl}
                          download={attachedFile.name}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            minWidth: "32px",
                            minHeight: "32px",
                            maxWidth: "32px",
                            maxHeight: "32px",
                            padding: 0,
                            boxSizing: "border-box",
                            borderRadius: "8px",
                            background: "#ffffff",
                            border: "1px solid #a7f3d0",
                            color: "#065f46",
                            cursor: "pointer",
                            textDecoration: "none",
                            flexShrink: 0,
                            transition: "all 0.15s ease",
                          }}
                          title="Download copy"
                        >
                          <Download size={15} strokeWidth={2} style={{ display: "block" }} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          minWidth: "32px",
                          minHeight: "32px",
                          maxWidth: "32px",
                          maxHeight: "32px",
                          padding: 0,
                          boxSizing: "border-box",
                          borderRadius: "8px",
                          background: "#fee2e2",
                          border: "1px solid #fecdd3",
                          color: "#dc2626",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                        title="Remove attachment"
                      >
                        <Trash2 size={15} strokeWidth={2} style={{ display: "block" }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty State - Dual Luxury Cards */
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {/* Option 1: Attach Official Policy PDF */}
                    <button
                      type="button"
                      onClick={handleAttachPolicyPdf}
                      disabled={loadingAttachment}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 13px",
                        borderRadius: "10px",
                        border: "1.5px dashed #cbd5e1",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        color: "#0f172a",
                        textAlign: "left",
                        cursor: loadingAttachment ? "wait" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {loadingAttachment ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {loadingAttachment ? "Fetching Document..." : "Attach Policy PDF"}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                          {activePolicy.policyNumber ? `Auto-link #${activePolicy.policyNumber}` : "From records storage"}
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Upload Custom Media */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 13px",
                        borderRadius: "10px",
                        border: "1.5px dashed #cbd5e1",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        color: "#0f172a",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#475569",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <UploadCloud size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                          Upload Custom File
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                          PDF, Image, Quote (max 16MB)
                        </div>
                      </div>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleCustomFileUpload}
                      accept=".pdf,image/*,.doc,.docx"
                      style={{ display: "none" }}
                    />
                  </div>
                )}
              </div>

              {/* Executive Dispatch Command Bar */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  paddingTop: "6px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                {/* Utility Button: Copy Text */}
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  style={{
                    padding: "11px 14px",
                    borderRadius: "10px",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                  title="Copy text to clipboard"
                >
                  <Copy size={13} /> Copy
                </button>

                {/* WhatsApp Web Action */}
                <button
                  type="button"
                  onClick={handleOpenWhatsAppWeb}
                  disabled={whatsappRecipientType === "individual" && !cleanPhone}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: "10px",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1.5px solid #0f172a",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    cursor: (whatsappRecipientType === "group" || cleanPhone) ? "pointer" : "not-allowed",
                    opacity: (whatsappRecipientType === "group" || cleanPhone) ? 1 : 0.5,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <ExternalLink size={14} />
                  <span>{whatsappRecipientType === "group" ? "Open Web & Paste" : "Open in WhatsApp Web"}</span>
                </button>

                {/* Primary Action: Direct WhatsApp API Gateway */}
                <button
                  type="button"
                  onClick={handleSendViaApi}
                  disabled={(whatsappRecipientType === "group" ? !whatsappGroupId : !cleanPhone) || sendingViaApi}
                  style={{
                    flex: 1.25,
                    padding: "11px 18px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    border: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: (whatsappRecipientType === "group" ? Boolean(whatsappGroupId) : Boolean(cleanPhone)) && !sendingViaApi ? "pointer" : "not-allowed",
                    opacity: (whatsappRecipientType === "group" ? Boolean(whatsappGroupId) : Boolean(cleanPhone)) ? 1 : 0.5,
                    boxShadow: "0 4px 14px -1px rgba(5, 150, 105, 0.4)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {sendingViaApi ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : attachedFile ? (
                    <Paperclip size={15} />
                  ) : whatsappRecipientType === "group" ? (
                    <Users size={15} />
                  ) : (
                    <Send size={15} />
                  )}
                  <span>
                    {sendingViaApi
                      ? "Transmitting..."
                      : attachedFile
                      ? "Send with Attachment"
                      : whatsappRecipientType === "group"
                      ? "Send to Group"
                      : "Send via WhatsApp"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: Timeline History */}
          {activeTab === "timeline" && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a", marginBottom: "10px" }}>
                Remarks & Activity History
              </div>
              {timelineLoading ? (
                <div style={{ fontSize: "12.5px", color: "#64748b", padding: "12px 0" }}>Loading history...</div>
              ) : timeline.length === 0 ? (
                <div style={{ fontSize: "12.5px", color: "#64748b", padding: "12px 0" }}>
                  No previous remarks or activities recorded for this policy yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {timeline.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{item.author || item.userName || "Agent"}</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "Recent"}
                        </span>
                      </div>
                      <div style={{ color: "#334155", whiteSpace: "pre-wrap" }}>{item.remark || item.text}</div>
                      {item.nextFollowUpDate && (
                        <div style={{ fontSize: "11px", color: "#0f172a", marginTop: "4px", fontWeight: 500, background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px", border: "1px solid #e2e8f0" }}>
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
      </div>
    </div>,
    document.body
  );
}
