"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Save,
  FileText,
  Clock,
  Plus,
  AlertCircle,
  Zap,
  Users,
  ShieldCheck,
  Gift,
  Sparkles,
  Mail,
  MessageSquare,
  Radio,
  Layers,
  Info,
  RotateCcw,
  Star,
  Trash2,
  QrCode,
  Pause,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import WhatsAppRecipientPicker from "@/app/components/whatsapp/WhatsAppRecipientPicker";
import ModalPortal from "@/app/components/shared/ModalPortal";

const TEMPLATE_VARIABLES = [
  { tag: "{{customerName}}", desc: "Customer's Full Name" },
  { tag: "{{companyName}}", desc: "Your Organization Name" },
  { tag: "{{policyNumber}}", desc: "Policy Number" },
  { tag: "{{policyType}}", desc: "Policy Type (e.g. Motor, Health)" },
  { tag: "{{expiryDate}}", desc: "Policy Expiry Date" },
  { tag: "{{vehicleName}}", desc: "Vehicle Make / Model" },
  { tag: "{{registrationNumber}}", desc: "Vehicle Registration No." },
  { tag: "{{netPremium}}", desc: "Net Payable Premium" },
  { tag: "{{agentName}}", desc: "Assigned Servicing Agent" },
];

export default function WhatsAppSetupPage() {
  // Template Groups Module Definition with Lucide Icons
  const TEMPLATE_GROUPS = [
    {
      id: "renewals",
      label: "Renewals Module",
      icon: RefreshCw,
      description: "Customize all automated & manual renewal reminder templates used in Renewals & Customer Profile.",
      templates: [
        { id: "due_soon", label: "Due Soon Notice", icon: Clock },
        { id: "today", label: "Expires Today", icon: AlertTriangle },
        { id: "expired", label: "Policy Expired", icon: AlertCircle },
        { id: "follow_up", label: "Follow-Up", icon: Mail },
        { id: "renewal_reminder", label: "Renewal Reminder", icon: RefreshCw },
      ],
    },
    {
      id: "customer",
      label: "Customer Profiling & Greetings",
      icon: Users,
      description: "Customize birthday wishes, holiday greetings & generic customer communications.",
      templates: [
        { id: "birthday_wish", label: "Birthday Wish", icon: Gift },
        { id: "festival_greeting", label: "Festival Greeting", icon: Sparkles },
      ],
    },
    {
      id: "operations",
      label: "Policy & Claims Operations",
      icon: ShieldCheck,
      description: "Customize claim status updates and policy document attachment dispatches.",
      templates: [
        { id: "claim_update", label: "Claim Update", icon: Zap },
        { id: "policy_document", label: "Policy Documents", icon: FileText },
      ],
    },
  ];

  const [selectedModuleGroup, setSelectedModuleGroup] = useState("renewals");
  const currentModule = TEMPLATE_GROUPS.find((g) => g.id === selectedModuleGroup) || TEMPLATE_GROUPS[0];
  // Main Dashboard Tab Navigation
  const [activeMainSection, setActiveMainSection] = useState("templates"); // "templates" | "connection" | "logs"

  // Connection Status
  const [status, setStatus] = useState("UNREACHABLE");
  const [connected, setConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Multi-Account Management
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [qrModalAccount, setQrModalAccount] = useState(null);
  const [testAccountId, setTestAccountId] = useState("");
  const [accountActionLoading, setAccountActionLoading] = useState(null);
  const [metrics, setMetrics] = useState(null);

  // Test message
  const [testPhone, setTestPhone] = useState("");
  const [testRecipientType, setTestRecipientType] = useState("individual");
  const [testGroupId, setTestGroupId] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from Bima Headquarter CRM WhatsApp integration.");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [activeTemplateTab, setActiveTemplateTab] = useState("birthday_wish");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [, setTemplateSuccess] = useState(false);

  // Queue & Logs
  const [queueMessages, setQueueMessages] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [queueLimit] = useState(10);
  const [queueOffset, setQueueOffset] = useState(0);
  const [queueStatusFilter, setQueueStatusFilter] = useState("");
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isRetryingQueue, setIsRetryingQueue] = useState(false);
  const [isRunningAutomations, setIsRunningAutomations] = useState(false);

  // Global Alerts
  const [toast, setToast] = useState(null);

  // Polling ref for QR code
  const pollIntervalRef = useRef(null);
  const statusRequestRef = useRef(null);
  const queueRequestRef = useRef(null);
  const toastTimerRef = useRef(null);

  const compilePreviewText = (text) => {
    if (!text) return "Type a template message in the editor to see a live preview here...";
    return text
      .replace(/\{\{customerName\}\}/g, "John Doe")
      .replace(/\{\{companyName\}\}/g, "Bima Headquarter")
      .replace(/\{\{policyNumber\}\}/g, "45140031250100004298")
      .replace(/\{\{policyType\}\}/g, "Motor Insurance")
      .replace(/\{\{expiryDate\}\}/g, "15-Aug-2026")
      .replace(/\{\{vehicleName\}\}/g, "SUZUKI ACCESS")
      .replace(/\{\{registrationNumber\}\}/g, "MP04UF3275")
      .replace(/\{\{netPremium\}\}/g, "3,450")
      .replace(/\{\{agentName\}\}/g, "Rahul Sharma");
  };

  const activeTemplate = templates.find((t) => t.name === activeTemplateTab) || {
    body: "",
    mediaUrl: "",
    mediaType: "IMAGE",
  };

  useEffect(() => {
    fetchStatus();
    fetchAccounts();
    fetchTemplates();

    return () => {
      stopPollingStatus();
      statusRequestRef.current?.abort();
      statusRequestRef.current = null;
      queueRequestRef.current?.abort();
      queueRequestRef.current = null;
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetchQueue({ offset: queueOffset, statusFilter: queueStatusFilter });
    return () => queueRequestRef.current?.abort();
  }, [queueLimit, queueOffset, queueStatusFilter]);

  // Poll status when not connected
  useEffect(() => {
    if (!connected && status !== "UNREACHABLE") {
      startPollingStatus();
    } else {
      stopPollingStatus();
    }
    return () => stopPollingStatus();
  }, [connected, status]);

  const startPollingStatus = () => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = window.setInterval(() => {
      if (!document.hidden) fetchStatus(true);
    }, 5000);
  };

  const stopPollingStatus = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  async function fetchStatus(isSilent = false, force = false) {
    if (statusRequestRef.current) {
      if (!force) return;
      statusRequestRef.current.abort();
      statusRequestRef.current = null;
    }
    const controller = new window.AbortController();
    statusRequestRef.current = controller;
    if (!isSilent) setIsCheckingStatus(true);
    try {
      const res = await fetch("/api/operations/whatsapp/status", { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch connection status");
      const data = await res.json();
      setConnected(data.connected);
      setStatus(data.status);
      setQrCode(data.qrCode);
      setLastChecked(data.lastChecked ? new Date(data.lastChecked) : new Date());
      setStatusError(data.error);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setStatus("UNREACHABLE");
      setConnected(false);
      setQrCode(null);
      setStatusError(err.message);
      setLastChecked(new Date());
    } finally {
      if (statusRequestRef.current === controller) statusRequestRef.current = null;
      if (!isSilent && !controller.signal.aborted) setIsCheckingStatus(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setShowDisconnectModal(false);
    try {
      const res = await fetch("/api/operations/whatsapp/logout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect WhatsApp");
      showToast("success", "Successfully disconnected WhatsApp session");
      fetchStatus(false, true);
    } catch (err) {
      showToast("error", err.message || "Failed to disconnect WhatsApp");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function fetchAccounts() {
    setIsLoadingAccounts(true);
    setAccountsError(null);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load accounts");
      if (data.accounts) {
        setAccounts(data.accounts);
        if (data.metrics) setMetrics(data.metrics);
        if (qrModalAccount) {
          const current = data.accounts.find((a) => a.id === qrModalAccount.id);
          if (current?.connected) {
            showToast("success", `Account '${current.label}' connected successfully!`);
            setQrModalAccount(null);
          }
        }
      }
    } catch (err) {
      setAccountsError(err.message || "Failed to load accounts");
      console.warn("Could not load WhatsApp accounts:", err.message);
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  async function handleCreateAccount() {
    if (!newAccountLabel.trim()) {
      showToast("error", "Please enter a name for the new WhatsApp account");
      return;
    }
    setIsCreatingAccount(true);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", label: newAccountLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");
      showToast("success", `Account created. Loading QR code...`);
      setShowAddAccountModal(false);
      const createdId = data.account?.id || `account_${Date.now()}`;
      const createdLabel = data.account?.label || newAccountLabel;
      setNewAccountLabel("");
      await fetchAccounts();
      handleOpenQrModal(createdId, createdLabel);
    } catch (err) {
      showToast("error", err.message || "Failed to create account");
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function handleOpenQrModal(accountId, label) {
    try {
      const res = await fetch(`/api/operations/whatsapp/status?accountId=${encodeURIComponent(accountId)}`);
      const data = await res.json();
      setQrModalAccount({
        id: accountId,
        label: label || accountId,
        qrCode: data.qrCode || null,
        connected: data.connected || false,
      });
    } catch (err) {
      showToast("error", "Failed to retrieve QR code for account");
    }
  }

  async function handleSetDefaultAccount(accountId) {
    setAccountActionLoading(accountId);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-default", accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set active sender");
      showToast("success", "Active Operations Sender updated! Future messages will send from this account.");
      await fetchAccounts();
      fetchStatus(true, true);
    } catch (err) {
      showToast("error", err.message || "Failed to update active sender");
    } finally {
      setAccountActionLoading(null);
    }
  }

  async function handlePauseAccount(accountId) {
    setAccountActionLoading(accountId);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect account");
      showToast("success", "Session disconnected. Login credentials preserved on disk.");
      await fetchAccounts();
      fetchStatus(true, true);
    } catch (err) {
      showToast("error", err.message || "Failed to disconnect account");
    } finally {
      setAccountActionLoading(null);
    }
  }

  async function handleLogoutAccount(accountId) {
    setAccountActionLoading(accountId);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to logout account");
      showToast("success", "Account logged out from WhatsApp.");
      await fetchAccounts();
      fetchStatus(true, true);
    } catch (err) {
      showToast("error", err.message || "Failed to logout account");
    } finally {
      setAccountActionLoading(null);
    }
  }

  async function handleDeleteAccount(accountId) {
    if (!window.confirm("Are you sure you want to permanently delete this account and its credentials?")) return;
    setAccountActionLoading(accountId);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      showToast("success", "Account permanently removed.");
      await fetchAccounts();
      fetchStatus(true, true);
    } catch (err) {
      showToast("error", err.message || "Failed to delete account");
    } finally {
      setAccountActionLoading(null);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/operations/whatsapp/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      showToast("error", err.message || "Failed to load templates");
    }
  }

  async function fetchQueue({ offset = queueOffset, statusFilter = queueStatusFilter } = {}) {
    queueRequestRef.current?.abort();
    const controller = new window.AbortController();
    queueRequestRef.current = controller;
    setIsLoadingQueue(true);
    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : "";
      const res = await fetch(
        `/api/operations/whatsapp/queue?limit=${queueLimit}&offset=${offset}${statusParam}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("Failed to load queue");
      const data = await res.json();
      setQueueMessages(data.messages || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      if (err?.name === "AbortError") return;
      showToast("error", err.message || "Failed to load message queue");
    } finally {
      if (queueRequestRef.current === controller) {
        queueRequestRef.current = null;
        if (!controller.signal.aborted) setIsLoadingQueue(false);
      }
    }
  }

  const handleTemplateBodyChange = (e) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.name === activeTemplateTab ? { ...t, body: e.target.value } : t
      )
    );
  };

  const handleTemplateMediaChange = (e) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.name === activeTemplateTab ? { ...t, mediaUrl: e.target.value } : t
      )
    );
  };

  const handleTemplateMediaTypeChange = (e) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.name === activeTemplateTab ? { ...t, mediaType: e.target.value } : t
      )
    );
  };

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    setTemplateSuccess(false);
    try {
      const res = await fetch("/api/operations/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeTemplate.name,
          bodyText: activeTemplate.body,
          mediaUrl: activeTemplate.mediaUrl,
          mediaType: activeTemplate.mediaType,
        }),
      });

      if (!res.ok) throw new Error("Failed to save template");

      setTemplateSuccess(true);
      showToast("success", "Template updated successfully!");
      fetchTemplates();
    } catch (err) {
      showToast("error", err.message || "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    const recipient = testRecipientType === "group" ? testGroupId : testPhone;
    if (!recipient) {
      showToast("error", testRecipientType === "group" ? "Please select a WhatsApp group" : "Please specify a recipient phone number");
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/operations/whatsapp/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          message: testMessage,
          accountId: testAccountId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      setTestResult({ success: true, messageId: data.messageId, accountId: data.accountId });
      showToast("success", `Test message dispatched via ${data.accountId || "Active Sender"}!`);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      showToast("error", err.message || "Failed to send test message");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRetryMessage = async (msgId) => {
    try {
      const res = await fetch("/api/operations/whatsapp/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId }),
      });
      if (!res.ok) throw new Error("Failed to queue message for retry");
      showToast("success", "Message reset to PENDING. Will send shortly.");
      fetchQueue();
    } catch (err) {
      showToast("error", err.message || "Failed to retry message");
    }
  };

  const handleRetryAllFailed = async () => {
    setIsRetryingQueue(true);
    try {
      const res = await fetch("/api/operations/whatsapp/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to queue messages for retry");
      showToast("success", `Queued ${data.count || 0} messages for retry.`);
      fetchQueue();
    } catch (err) {
      showToast("error", err.message || "Failed to retry messages");
    } finally {
      setIsRetryingQueue(false);
    }
  };

  const handleRunAutomations = async () => {
    setIsRunningAutomations(true);
    try {
      const res = await fetch("/api/operations/whatsapp/run-automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchLimit: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run WhatsApp automation");

      const scans = data.scans || {};
      const sent = data.batch?.processedCount || 0;
      showToast(
        "success",
        `Automation completed. Queued ${scans.birthdaysQueued || 0} birthdays, ${scans.renewalsQueued || 0} renewals, ${scans.internalDigestQueued || 0} internal digests. Sent ${sent}.`
      );
      fetchQueue();
    } catch (err) {
      showToast("error", err.message || "Failed to run WhatsApp automation");
    } finally {
      setIsRunningAutomations(false);
    }
  };

  const handleInsertTag = (tag) => {
    const el = document.getElementById("template-textarea");
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newBody = before + tag + after;

    setTemplates((prev) =>
      prev.map((t) =>
        t.name === activeTemplateTab ? { ...t, body: newBody } : t
      )
    );

    // Reposition cursor
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + tag.length;
    }, 0);
  };

  const handlePageChange = (newOffset) => {
    setQueueOffset(newOffset);
  };

  const handleStatusFilterChange = (status) => {
    setQueueStatusFilter(status);
    setQueueOffset(0);
  };

  return (
    <div className="whatsapp-setup-page pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-slide-in">
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl border text-xs font-semibold ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <OperationsBackLink />

      {/* Hero Header & Action Bar - Light Theme */}
      <div
        className="rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05)",
          color: "#0f172a",
        }}
      >
        {/* Decorative Light Background Blurs */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#047857",
              }}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
              <span>WhatsApp Operations Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "#0f172a" }}>
              Automation & Messaging Center
            </h1>
            <p className="text-xs sm:text-sm max-w-2xl font-medium leading-relaxed" style={{ color: "#475569" }}>
              Configure your WhatsApp gateway session, build smart dynamic notification templates, and monitor automated queue dispatches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                fetchStatus();
                fetchTemplates();
                fetchQueue();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                color: "#334155",
              }}
            >
              <RefreshCw size={14} className={isCheckingStatus ? "animate-spin text-emerald-600" : ""} style={{ color: "#059669" }} />
              Sync Status
            </button>

            <button
              type="button"
              onClick={handleRunAutomations}
              disabled={isRunningAutomations || !connected}
              className="flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
              style={{ background: "#10b981", color: "#ffffff" }}
            >
              <Zap size={14} className={isRunningAutomations ? "animate-bounce" : ""} />
              {isRunningAutomations ? "Running..." : "Run Automations"}
            </button>
          </div>
        </div>

        {/* Mini KPI Dashboard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 relative z-10" style={{ borderTop: "1px solid #f1f5f9" }}>
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={connected
                ? { background: "#d1fae5", color: "#047857", border: "1px solid #a7f3d0" }
                : { background: "#ffe4e6", color: "#e11d48", border: "1px solid #fecdd3" }
              }
            >
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-semibold tracking-wider" style={{ color: "#64748b" }}>Gateway State</div>
              <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5" style={{ color: "#0f172a" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: connected ? "#10b981" : "#f43f5e" }} />
                {connected ? "Connected & Active" : status.replace(/_/g, " ")}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-semibold tracking-wider" style={{ color: "#64748b" }}>Queue Workload</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#0f172a" }}>
                {totalCount} Total Messages
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f3e8ff", color: "#7e22ce", border: "1px solid #e9d5ff" }}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase font-semibold tracking-wider" style={{ color: "#64748b" }}>Templates Configured</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "#0f172a" }}>
                {templates.length || 9} Active Workflows
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px mb-8 overflow-x-auto">
        {[
          { id: "templates", label: "Notification Templates", icon: MessageSquare },
          { id: "connection", label: "Gateway & Testing", icon: Smartphone },
          { id: "logs", label: "Message Queue & Logs", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMainSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveMainSection(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-slate-900 text-slate-900 bg-slate-50/60 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/40"
              }`}
            >
              <Icon size={15} className={isActive ? "text-slate-900" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: NOTIFICATION TEMPLATES */}
      {activeMainSection === "templates" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col gap-4 mb-6">
              {/* Level 1: Platform CRM Module Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap px-1">
                    CRM Module:
                  </span>
                  {TEMPLATE_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    const isModuleActive = selectedModuleGroup === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setSelectedModuleGroup(group.id);
                          setActiveTemplateTab(group.templates[0].id);
                          setTemplateSuccess(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                          isModuleActive
                            ? "bg-white text-slate-900 shadow-md border-2 border-slate-900"
                            : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <GroupIcon size={14} className={isModuleActive ? "text-slate-900" : "text-slate-400"} />
                        {group.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Level 2: Message Formats in Selected Module */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {currentModule.label} Formats
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {currentModule.description}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-100/70 rounded-xl border border-slate-200">
                  {currentModule.templates.map((tmpl) => {
                    const TmplIcon = tmpl.icon;
                    const isActive = activeTemplateTab === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setActiveTemplateTab(tmpl.id);
                          setTemplateSuccess(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                          isActive
                            ? "bg-white text-emerald-800 shadow-sm border-2 border-emerald-600"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                        }`}
                      >
                        <TmplIcon size={13} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                        {tmpl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column: Form Editor (2 Cols) */}
              <div className="xl:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-200">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Attachment Media URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.mediaUrl || ""}
                      onChange={handleTemplateMediaChange}
                      placeholder="https://example.com/image.png or base64 data"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Public image URL, PDF document, or brochure. Empty sends standard text-only.
                    </p>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Attachment Type
                    </label>
                    <select
                      value={activeTemplate.mediaType || "IMAGE"}
                      onChange={handleTemplateMediaTypeChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition font-medium"
                    >
                      <option value="IMAGE">IMAGE</option>
                      <option value="PDF">PDF / DOCUMENT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Message Body / Caption Text
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {activeTemplate.body ? `${activeTemplate.body.length} characters` : ""}
                    </span>
                  </div>
                  <textarea
                    id="template-textarea"
                    rows="7"
                    value={activeTemplate.body || ""}
                    onChange={handleTemplateBodyChange}
                    className="w-full px-4 py-3 bg-slate-50/40 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition font-mono leading-relaxed shadow-inner"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Available Dynamic Variables (Click to Insert)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertTag(v.tag)}
                        title={v.desc}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-xl text-[11px] font-semibold text-slate-700 font-mono transition flex items-center gap-1.5 hover:text-slate-900"
                      >
                        <Plus size={12} className="text-slate-500" />
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    * Dynamic fields automatically compile values from customer records upon dispatch.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className="flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 hover:bg-slate-50"
                    style={{
                      background: "#ffffff",
                      color: "#0f172a",
                      border: "1.5px solid #0f172a",
                    }}
                  >
                    <Save size={14} className="text-slate-900" />
                    {isSavingTemplate ? "Saving Template..." : "Save Template"}
                  </button>
                </div>
              </div>

              {/* Right Column: Mobile Device Simulator (1 Col) */}
              <div className="xl:col-span-1 flex flex-col justify-start">
                <span className="block text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Real-time WhatsApp Device Preview
                </span>

                <div className="border border-slate-300 rounded-3xl overflow-hidden shadow-lg flex flex-col h-[400px] bg-[#efeae2] relative">
                  {/* Smartphone Header Notch */}
                  <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs border border-white/20">
                        ID
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-white">InsureDesk Customer</div>
                        <div className="text-[10px] text-emerald-200 font-normal">online</div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Area Wallpaper */}
                  <div className="flex-1 p-3.5 overflow-y-auto flex flex-col justify-end bg-[#efeae2]">
                    <div className="bg-[#dcf8c6] text-slate-900 p-3.5 rounded-2xl rounded-tr-none shadow-md max-w-[92%] self-end relative text-xs leading-relaxed border border-[#cbe5bd]">
                      {activeTemplate.mediaUrl && (
                        <div className="mb-2 bg-black/5 rounded-xl p-2 border border-black/10 flex items-center gap-2 shrink-0">
                          {activeTemplate.mediaType === "IMAGE" ? (
                            <span className="text-[10px] text-slate-800 font-semibold truncate">🖼️ Image Attachment Attached</span>
                          ) : (
                            <span className="text-[10px] text-slate-800 font-semibold truncate">📄 PDF Document Attached</span>
                          )}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap font-sans text-slate-900 break-words pr-2">
                        {compilePreviewText(activeTemplate.body)}
                      </div>

                      <div className="text-[9.5px] text-slate-500 text-right mt-2 font-medium flex items-center justify-end gap-1">
                        <span>{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="text-[#34B7F1] text-[11px] font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-2.5 font-medium text-center">
                  Preview compiled using mock recipient records.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: GATEWAY CONNECTION & TEST SENDER */}
      {activeMainSection === "connection" && (
        <div className="space-y-8">
          {/* SECTION: MULTI-ACCOUNT MANAGEMENT */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-600" /> Connected WhatsApp Numbers
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Link multiple WhatsApp accounts. All CRM automated operations will dispatch from the selected Active Operations Sender.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchAccounts()}
                  disabled={isLoadingAccounts}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl transition"
                  title="Refresh Accounts"
                >
                  <RefreshCw size={14} className={isLoadingAccounts ? "animate-spin text-emerald-600" : ""} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  <Plus size={14} /> Link New Number
                </button>
              </div>
            </div>

            {/* Account Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accountsError && (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {accountsError}
                </div>
              )}
              {accounts.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  {isLoadingAccounts ? "Loading WhatsApp accounts..." : accountsError ? "Accounts unavailable. Retry using the refresh button above." : "No WhatsApp accounts linked. Use Link New Number to add one."}
                </div>
              ) : (
                accounts.map((acc) => {
                  const isActionBusy = accountActionLoading === acc.id;
                  return (
                    <div
                      key={acc.id}
                      className={`rounded-2xl p-5 border transition-all ${
                        acc.isDefault
                          ? "bg-emerald-50/20 border-2 border-emerald-500 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            {acc.label}
                            {acc.isDefault && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ⭐ Primary Sender
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {acc.phoneNumber ? `+${acc.phoneNumber}` : "Awaiting scan"}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                            acc.connected
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : acc.state === "PAUSED"
                              ? "bg-slate-100 text-slate-600 border-slate-300"
                              : acc.state === "QR_READY"
                              ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {acc.connected ? "● Connected" : acc.state === "PAUSED" ? "⏸ Disconnected" : acc.state === "QR_READY" ? "Scan QR" : acc.state}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 mb-4 font-mono">
                        ID: {acc.id}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                        {acc.connected && !acc.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAccount(acc.id)}
                            disabled={isActionBusy}
                            className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition shadow-sm disabled:opacity-50"
                          >
                            Set as Active
                          </button>
                        )}
                        {!acc.connected && (
                          <button
                            type="button"
                            onClick={() => handleOpenQrModal(acc.id, acc.label)}
                            className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition shadow-sm"
                          >
                            Scan QR Code
                          </button>
                        )}
                        {acc.connected && (
                          <button
                            type="button"
                            onClick={() => handlePauseAccount(acc.id)}
                            disabled={isActionBusy}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition disabled:opacity-50"
                            title="Disconnect without deleting session"
                          >
                            Disconnect
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleLogoutAccount(acc.id)}
                          disabled={isActionBusy}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold transition disabled:opacity-50"
                          title="Log out from WhatsApp"
                        >
                          Logout
                        </button>
                        {accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc.id)}
                            disabled={isActionBusy}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition disabled:opacity-50"
                            title="Permanently remove account"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Gateway Metrics Strip */}
            {metrics && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
                <div className="flex items-center gap-4">
                  <span><strong>Gateway RSS:</strong> {metrics.memory?.rssMb} MB</span>
                  <span><strong>Heap Used:</strong> {metrics.memory?.heapUsedMb} MB</span>
                  <span><strong>Uptime:</strong> {Math.floor(metrics.uptimeSeconds / 60)} min</span>
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  Active Dispatch Account: {metrics.activeSenderId}
                </div>
              </div>
            )}
          </div>

          {/* LOWER SECTION: TEST DISPATCHER & DIAGNOSTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
              <div className="pb-4 border-b border-slate-200 mb-6">
                <h3 className="text-base font-bold text-slate-900">Send Test WhatsApp Message</h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Send a test message from a specific account or default primary sender.
                </p>
              </div>

              <form onSubmit={handleSendTest} className="space-y-5">
                {/* Account Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Dispatch From Account
                  </label>
                  <select
                    value={testAccountId}
                    onChange={(e) => setTestAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition font-medium"
                  >
                    <option value="">Active Operations Sender (Default)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} {acc.phoneNumber ? `(+${acc.phoneNumber})` : `(${acc.state})`} {acc.isDefault ? "⭐ [Default]" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <WhatsAppRecipientPicker
                  type={testRecipientType}
                  onTypeChange={(value) => {
                    setTestRecipientType(value);
                    if (value === "individual") setTestGroupId("");
                  }}
                  groupId={testGroupId}
                  onGroupChange={setTestGroupId}
                  disabled={isSendingTest}
                />

                {testRecipientType === "individual" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Recipient Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 91XXXXXXXXXX"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Include country code (e.g. 91 for India) without '+' or spaces.
                    </p>
                  </div>
                ) : null}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Message Content
                  </label>
                  <textarea
                    rows="4"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 font-bold rounded-xl text-xs shadow-sm disabled:opacity-50 transition hover:bg-slate-50"
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1.5px solid #0f172a",
                  }}
                >
                  <Send size={14} className={isSendingTest ? "animate-pulse text-slate-900" : "text-slate-900"} />
                  {isSendingTest ? "Sending Test Message..." : "Dispatch Test Message"}
                </button>

                {testResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs font-medium ${
                      testResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    {testResult.success ? (
                      <div>
                        <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 size={15} className="text-emerald-600" /> Test Message Sent!
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">Message ID: {testResult.messageId}</p>
                        {testResult.accountId && (
                          <p className="text-[10px] text-slate-500 font-mono">Dispatched Via: {testResult.accountId}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold flex items-center gap-1.5 text-rose-800">
                          <AlertCircle size={15} className="text-rose-600" /> Dispatch Failed
                        </p>
                        <p className="text-[10px] text-rose-700 mt-1">{testResult.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Active Primary Status Details */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-200 mb-6">
                  <h3 className="text-base font-bold text-slate-900">Active Sender Health</h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    Live connection diagnostic for the current primary outbound account.
                  </p>
                </div>

                <div className="flex flex-col items-center text-center py-4">
                  <div
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center border-2 mb-4 transition-all ${
                      connected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm"
                        : "bg-slate-100 border-slate-300 text-slate-500"
                    }`}
                  >
                    <Smartphone className="w-8 h-8" />
                  </div>

                  <h4 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                    {connected ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 size={14} className="text-emerald-600" /> Primary Account Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold">
                        {status.replace(/_/g, " ")}
                      </span>
                    )}
                  </h4>

                  <p className="text-xs text-slate-400 font-medium mt-2">
                    Last sync: {lastChecked ? lastChecked.toLocaleTimeString("en-IN") : "Never"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed font-medium">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Info size={14} className="text-emerald-600" /> Routing Rules:
                </div>
                All automated renewals, birthday greetings, and claim updates automatically dispatch through whichever account is set as <strong>Primary Sender</strong>. Messages already in queue retain the sender account assigned at enqueue time.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: MESSAGE QUEUE & DISPATCH LOGS */}
      {activeMainSection === "logs" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                WhatsApp Message Queue & Logs
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Inspect real-time dispatch queue, retry failed messages, and review delivery logs. Total: {totalCount} records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={queueStatusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="SENDING">SENDING</option>
                <option value="SENT">SENT</option>
                <option value="RETRYING">RETRYING</option>
                <option value="FAILED">FAILED</option>
              </select>

              <button
                type="button"
                onClick={handleRetryAllFailed}
                disabled={isRetryingQueue}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition shadow-sm"
              >
                <RotateCcw size={13} />
                Retry Failed
              </button>
            </div>
          </div>

          {isLoadingQueue ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white">
              <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin mb-2" />
              <p className="text-slate-400 text-xs font-medium">Loading queue logs...</p>
            </div>
          ) : queueMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white">
              <Clock className="w-9 h-9 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No Queue Messages Found</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                The message queue is empty. Active triggers will enqueue messages at scheduled thresholds.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4 w-1/3">Message</th>
                    <th className="py-3.5 px-4 text-center">Attempts</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {queueMessages.map((msg) => {
                    const date = msg.sentAt || msg.scheduledAt || msg.createdAt;
                    const formattedTime = date ? new Date(date).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "N/A";

                    return (
                      <tr key={msg.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-xs">{msg.recipientName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{msg.recipientPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {msg.messageType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-normal text-slate-600 leading-normal">
                          <div className="line-clamp-2" title={msg.messageBody}>
                            {msg.messageBody}
                          </div>
                          {msg.mediaUrl && (
                            <div className="text-[10px] text-slate-600 font-medium mt-1 flex items-center gap-1">
                              <FileText size={10} />
                              <span className="truncate max-w-[120px]">{msg.fileName || "attachment"}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-semibold text-slate-500">
                          {msg.attempts} / 3
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold uppercase text-[9px] border ${
                              msg.status === "SENT"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : msg.status === "SENDING"
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : msg.status === "PENDING"
                                ? "bg-slate-100 border-slate-200 text-slate-600"
                                : msg.status === "RETRYING"
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            {msg.status}
                          </span>
                          {msg.errorMessage && (
                            <div className="text-[9px] text-rose-600 font-medium mt-1 leading-normal max-w-[140px] truncate" title={msg.errorMessage}>
                              {msg.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {formattedTime}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {["FAILED", "RETRYING"].includes(msg.status) && (
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(msg.id)}
                              title="Retry sending"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition inline-block font-semibold"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-medium mt-4 rounded-2xl">
            <span>
              Showing {queueOffset + 1} - {Math.min(queueOffset + queueLimit, totalCount)} of {totalCount} records
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={queueOffset === 0}
                onClick={() => handlePageChange(queueOffset - queueLimit)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition font-semibold"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={queueOffset + queueLimit >= totalCount}
                onClick={() => handlePageChange(queueOffset + queueLimit)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1.5">Disconnect WhatsApp?</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                Are you sure you want to disconnect your WhatsApp session? This will stop all scheduled messages until re-linked.
              </p>

              <div className="flex gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={() => setShowDisconnectModal(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 bg-white transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {isLoggingOut ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {/* ADD ACCOUNT MODAL */}
      {showAddAccountModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-left"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
                <Smartphone className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">Link New WhatsApp Account</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-5 font-medium">
                Enter an identifying label for this number (e.g., "Support Desk", "Claims Helpline").
              </p>

              <div className="mb-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Account Name / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Desk WhatsApp"
                  value={newAccountLabel}
                  onChange={(e) => setNewAccountLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 bg-white transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={isCreatingAccount || !newAccountLabel.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {isCreatingAccount ? "Generating QR..." : "Proceed to QR Scan"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* QR PAIRING MODAL */}
      {qrModalAccount && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
            <div
              className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-slate-900">Scan QR: {qrModalAccount.label}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {qrModalAccount.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalAccount(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {qrModalAccount.qrCode ? (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm mb-3">
                    <Image
                      src={qrModalAccount.qrCode}
                      alt="WhatsApp Login QR Code"
                      width={200}
                      height={200}
                      unoptimized
                      className="w-48 h-48 block rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2 items-center text-slate-600 text-xs font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                    <Info size={16} className="text-emerald-600 shrink-0" />
                    <span>Open WhatsApp on your phone ➔ Linked Devices ➔ Link a Device.</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-600" />
                  Generating WhatsApp Web QR Code...
                </div>
              )}

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setQrModalAccount(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 bg-white transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
