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
  X,
  Gift,
  Sparkles,
  Mail,
  MessageSquare,
  Info,
  RotateCcw,
  Trash2,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import PrimaryWhatsAppSelector from "@/app/components/whatsapp/PrimaryWhatsAppSelector";
import WhatsAppRecipientPicker from "@/app/components/whatsapp/WhatsAppRecipientPicker";
import ModalPortal from "@/app/components/shared/ModalPortal";
import { cachedJson } from "@/app/lib/client-api";
import { getWhatsAppRevision, notifyWhatsAppUpdate, useWhatsAppSync } from "@/app/lib/whatsapp-sync";
import styles from "./WhatsAppSetupPage.module.css";

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
      description:
        "Customize all automated & manual renewal reminder templates used in Renewals & Customer Profile.",
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
  const [activeMainSection, setActiveMainSection] = useState("connection"); // "templates" | "connection" | "logs"

  // Connection Status
  const [status, setStatus] = useState("UNREACHABLE");
  const [connected, setConnected] = useState(false);
  const [, setQrCode] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [accountConfirmation, setAccountConfirmation] = useState(null);

  // Multi-Account Management
  const [accounts, setAccounts] = useState([]);
  const [canCreateAccount, setCanCreateAccount] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [qrModalAccount, setQrModalAccount] = useState(null);
  const [canAdmin, setCanAdmin] = useState(false);
  const [staffUsers, setStaffUsers] = useState([]);
  const [accessAccount, setAccessAccount] = useState(null);
  const [savingAccess, setSavingAccess] = useState([]);
  const [accountActionLoading, setAccountActionLoading] = useState(null);
  const [metrics, setMetrics] = useState(null);

  // Test message
  const [testPhone, setTestPhone] = useState("");
  const [testRecipientType, setTestRecipientType] = useState("individual");
  const [testGroupId, setTestGroupId] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Hello! This is a test message from Bima Headquarter CRM WhatsApp integration.",
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [activeTemplateTab, setActiveTemplateTab] = useState("due_soon");
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

  const statusRequestRef = useRef(null);
  const queueRequestRef = useRef(null);
  const templateRequestRef = useRef(null);
  const templateEditsRef = useRef(new Map());
  const pendingGrantsRef = useRef(new Map());
  const toastTimerRef = useRef(null);

  useWhatsAppSync(({ type }) => {
    if (type === "accounts" || type === "all") {
      void fetchAccounts(true);
    }
    if (type === "templates" || (type === "all" && activeMainSection === "templates"))
      void fetchTemplates(true);
    if (type === "queue" || type === "all")
      void fetchQueue({ silent: true });
  }, 5000);

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
      statusRequestRef.current?.abort();
      statusRequestRef.current = null;
      queueRequestRef.current?.abort();
      queueRequestRef.current = null;
      templateRequestRef.current?.abort();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetchQueue({ offset: queueOffset, statusFilter: queueStatusFilter });
    return () => queueRequestRef.current?.abort();
  }, [queueLimit, queueOffset, queueStatusFilter]);

  useEffect(() => {
    if (!qrModalAccount?.id) return;
    const accountId = qrModalAccount.id;
    const controller = new window.AbortController();
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/operations/whatsapp/status?accountId=${encodeURIComponent(accountId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (data.connected) {
          setQrModalAccount(null);
          notifyWhatsAppUpdate();
          fetchAccounts(true);
          showToast("success", "Your WhatsApp account is connected.");
        } else {
          setQrModalAccount((current) =>
            current?.id === accountId ? { ...current, qrCode: data.qrCode || null } : current,
          );
        }
      } catch {
        /* Retry on the next poll while the dialog is open. */
      }
    }, 4000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [qrModalAccount?.id]);

  useEffect(() => {
    if (!showAddAccountModal && !accountConfirmation && !qrModalAccount && !accessAccount) return;
    const previousFocus = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowAddAccountModal(false);
        setAccountConfirmation(null);
        setQrModalAccount(null);
        setAccessAccount(null);
      }
      if (event.key === "Tab") {
        const controls = document
          .querySelector('[role="dialog"]')
          ?.querySelectorAll('button:not(:disabled), input, select, textarea, [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [showAddAccountModal, !!accountConfirmation, !!qrModalAccount, !!accessAccount]);

  const showToast = (type, message) => {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  async function fetchStatus(isSilent = false, force = false) {
    const revision = getWhatsAppRevision();
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
      const data = await res.json();
      if (controller.signal.aborted || revision !== getWhatsAppRevision()) return;
      if (!res.ok) throw new Error(data.error || "Failed to fetch connection status");
      setConnected(data.connected);
      setStatus(data.status);
      setQrCode(data.qrCode);
      setLastChecked(data.lastChecked ? new Date(data.lastChecked) : new Date());
      setStatusError(data.error);
    } catch (err) {
      if (err?.name === "AbortError" || revision !== getWhatsAppRevision()) return;
      setStatus("UNREACHABLE");
      setConnected(false);
      setQrCode(null);
      setStatusError(err.message);
      setLastChecked(new Date());
    } finally {
      if (statusRequestRef.current === controller) {
        statusRequestRef.current = null;
        setIsCheckingStatus(false);
      }
    }
  }

  async function fetchAccounts(silent = false, lightweight = silent) {
    const revision = getWhatsAppRevision();
    if (!silent) setIsLoadingAccounts(true);
    try {
      const data = await cachedJson(`/api/operations/whatsapp/sessions${lightweight ? "?view=sync" : ""}`, {
        ttlMs: 0,
        fetchOptions: { cache: "no-store" },
      });
      if (revision !== getWhatsAppRevision()) return;
      if (data.error) throw new Error(data.error);
      setAccountsError(null);
      if (data.accounts) {
        setAccounts(data.accounts);
        setCanCreateAccount(data.canCreate === true);
        setCanAdmin(data.canAdmin === true);
        if (Array.isArray(data.users)) setStaffUsers(data.users);
        if (data.metrics) setMetrics(data.metrics);
        const selected = data.accounts.find((account) => account.id === data.primaryAccountId);
        const senderReady = Boolean(data.canCreate && selected?.canUse && selected.connected);
        setConnected(senderReady);
        setStatus(data.canCreate && selected?.canUse ? selected.state || "UNREACHABLE" : "UNREACHABLE");
        setStatusError(
          !data.primaryAccountId ? "Select My Primary WhatsApp before sending a message"
            : !selected?.canUse ? "Selected sender is no longer authorized"
              : !data.canCreate ? "Staff sending access required"
                : !selected.connected ? "Your selected sender is disconnected" : null,
        );
        setLastChecked(new Date());
        setAccessAccount((current) => {
          if (!current) return null;
          const latest = data.accounts.find((account) => account.id === current.id);
          if (!data.canAdmin || !latest) return null;
          const accessUserIds = new Set(latest.accessUserIds || []);
          for (const [key, allowed] of pendingGrantsRef.current) {
            const [accountId, userId] = JSON.parse(key);
            if (accountId === current.id) {
              if (allowed) accessUserIds.add(userId);
              else accessUserIds.delete(userId);
            }
          }
          return { ...latest, accessUserIds: [...accessUserIds] };
        });
        setQrModalAccount((current) =>
          current && data.accounts.some((account) => account.id === current.id && account.connected)
            ? null : current,
        );
      }
    } catch (err) {
      if (revision !== getWhatsAppRevision()) return;
      setAccountsError(err.message || "Failed to load accounts");
      setConnected(false);
      setStatus("UNREACHABLE");
      setStatusError(err.message || "Failed to load accounts");
      console.warn("Could not load WhatsApp accounts:", err.message);
    } finally {
      if (!silent) setIsLoadingAccounts(false);
    }
  }

  async function updateAccountAccess(action, accountId, extra = {}) {
    const grantKey = `${accountId}:${extra.userId}`;
    const wasAllowed = accessAccount?.id === accountId && accessAccount.accessUserIds.includes(extra.userId);
    if (action === "grant") {
      if (savingAccess.includes(grantKey)) return;
      pendingGrantsRef.current.set(JSON.stringify([accountId, extra.userId]), extra.allowed);
      setSavingAccess((current) => [...current, grantKey]);
      setAccessAccount((current) =>
        current?.id === accountId
          ? {
              ...current,
              accessUserIds: extra.allowed
                ? [...current.accessUserIds.filter((id) => id !== extra.userId), extra.userId]
                : current.accessUserIds.filter((id) => id !== extra.userId),
            }
          : current,
      );
    }
    try {
      const response = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, accountId, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update access");
      notifyWhatsAppUpdate();
      await fetchAccounts(true);
      if (action === "assign-owner")
        setAccessAccount((current) => current && { ...current, ownerUserId: extra.ownerUserId });
      showToast("success", "WhatsApp settings saved.");
    } catch (error) {
      if (action === "grant")
        setAccessAccount((current) =>
          current?.id === accountId
            ? {
                ...current,
                accessUserIds: wasAllowed
                  ? [...current.accessUserIds.filter((id) => id !== extra.userId), extra.userId]
                  : current.accessUserIds.filter((id) => id !== extra.userId),
              }
            : current,
        );
      showToast("error", error.message);
    } finally {
      pendingGrantsRef.current.delete(JSON.stringify([accountId, extra.userId]));
      if (action === "grant")
        setSavingAccess((current) => current.filter((key) => key !== grantKey));
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
      notifyWhatsAppUpdate();
      showToast("success", `Account created. Loading QR code...`);
      setShowAddAccountModal(false);
      const createdId = data.account?.id || `account_${Date.now()}`;
      const createdLabel = data.account?.label || newAccountLabel;
      setNewAccountLabel("");
      await fetchAccounts(true);
      handleOpenQrModal(createdId, createdLabel);
    } catch (err) {
      showToast("error", err.message || "Failed to create account");
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function handleOpenQrModal(accountId, label) {
    setQrModalAccount({ id: accountId, label: label || accountId, qrCode: null, connected: false });
    try {
      const connect = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", accountId }),
      });
      const result = await connect.json();
      if (!connect.ok) throw new Error(result.error || "Could not start pairing");
      notifyWhatsAppUpdate();
      const res = await fetch(`/api/operations/whatsapp/status?accountId=${encodeURIComponent(accountId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cannot access this account");
      setQrModalAccount({
        id: accountId,
        label: label || accountId,
        qrCode: data.qrCode || null,
        connected: data.connected || false,
      });
    } catch (error) {
      setQrModalAccount(null);
      showToast("error", error.message || "Failed to retrieve QR code for account");
    }
  }

  async function handleSetDefaultAccount(accountId) {
    setAccountActionLoading(accountId);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-primary", accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set active sender");
      notifyWhatsAppUpdate();
      showToast("success", "My Primary WhatsApp saved. Your future messages will use this account.");
      await fetchAccounts(true);
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
      notifyWhatsAppUpdate();
      showToast("success", "Session disconnected. Login credentials preserved on disk.");
      await fetchAccounts(true);
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
      notifyWhatsAppUpdate();
      showToast("success", "Account logged out from WhatsApp.");
      await fetchAccounts(true);
    } catch (err) {
      showToast("error", err.message || "Failed to logout account");
    } finally {
      setAccountActionLoading(null);
    }
  }

  async function handleDeleteAccount(accountId) {
    setAccountActionLoading(accountId);
    try {
      const res = await fetch("/api/operations/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      notifyWhatsAppUpdate();
      showToast("success", "Account permanently removed.");
      await fetchAccounts(true);
    } catch (err) {
      showToast("error", err.message || "Failed to delete account");
    } finally {
      setAccountActionLoading(null);
    }
  }

  async function fetchTemplates(silent = false, force = false) {
    if (templateRequestRef.current) {
      if (!force) return;
      templateRequestRef.current.abort();
    }
    const controller = new window.AbortController();
    templateRequestRef.current = controller;
    try {
      const res = await fetch("/api/operations/whatsapp/templates", {
        signal: controller.signal, cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      if (controller.signal.aborted) return;
      setTemplates((current) => (data.templates || []).map((template) =>
        templateEditsRef.current.has(template.name)
          ? current.find((item) => item.name === template.name) || template : template,
      ));
    } catch (err) {
      if (err?.name !== "AbortError" && !silent)
        showToast("error", err.message || "Failed to load templates");
    } finally {
      if (templateRequestRef.current === controller) templateRequestRef.current = null;
    }
  }

  async function fetchQueue({ offset = queueOffset, statusFilter = queueStatusFilter, silent = false } = {}) {
    if (silent && queueRequestRef.current) return;
    queueRequestRef.current?.abort();
    const controller = new window.AbortController();
    queueRequestRef.current = controller;
    if (!silent) setIsLoadingQueue(true);
    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : "";
      const res = await fetch(
        `/api/operations/whatsapp/queue?limit=${queueLimit}&offset=${offset}${statusParam}`,
        { signal: controller.signal, cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load queue");
      const data = await res.json();
      if (controller.signal.aborted) return;
      setQueueMessages(data.messages || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (!silent) showToast("error", err.message || "Failed to load message queue");
    } finally {
      if (queueRequestRef.current === controller) {
        queueRequestRef.current = null;
        if (!controller.signal.aborted) setIsLoadingQueue(false);
      }
    }
  }

  const markTemplateEdited = () => {
    const edits = templateEditsRef.current;
    edits.set(activeTemplateTab, (edits.get(activeTemplateTab) || 0) + 1);
  };

  const handleTemplateBodyChange = (e) => {
    markTemplateEdited();
    setTemplates((prev) =>
      prev.map((t) => (t.name === activeTemplateTab ? { ...t, body: e.target.value } : t)),
    );
  };

  const handleTemplateMediaChange = (e) => {
    markTemplateEdited();
    setTemplates((prev) =>
      prev.map((t) => (t.name === activeTemplateTab ? { ...t, mediaUrl: e.target.value } : t)),
    );
  };

  const handleTemplateMediaTypeChange = (e) => {
    markTemplateEdited();
    setTemplates((prev) =>
      prev.map((t) => (t.name === activeTemplateTab ? { ...t, mediaType: e.target.value } : t)),
    );
  };

  const handleSaveTemplate = async () => {
    const savedName = activeTemplate.name;
    const savedVersion = templateEditsRef.current.get(savedName);
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
      if (templateEditsRef.current.get(savedName) === savedVersion)
        templateEditsRef.current.delete(savedName);

      setTemplateSuccess(true);
      showToast("success", "Template updated successfully!");
      void fetchTemplates(false, true);
      notifyWhatsAppUpdate("templates");
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
      showToast(
        "error",
        testRecipientType === "group"
          ? "Please select a WhatsApp group"
          : "Please specify a recipient phone number",
      );
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      notifyWhatsAppUpdate("queue");

      setTestResult({ success: true, messageId: data.messageId, accountId: data.accountId });
      showToast("success", `Test message dispatched via ${data.accountId || "My Primary WhatsApp"}!`);
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
      notifyWhatsAppUpdate("queue");
      showToast("success", "Message reset to PENDING. Will send shortly.");
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
      notifyWhatsAppUpdate("queue");
      showToast("success", `Queued ${data.count || 0} messages for retry.`);
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
      notifyWhatsAppUpdate("queue");

      const scans = data.scans || {};
      const sent = data.batch?.processedCount || 0;
      showToast(
        "success",
        `Automation completed. Queued ${scans.birthdaysQueued || 0} birthdays, ${scans.renewalsQueued || 0} renewals, ${scans.internalDigestQueued || 0} internal digests. Sent ${sent}.`,
      );
    } catch (err) {
      showToast("error", err.message || "Failed to run WhatsApp automation");
    } finally {
      setIsRunningAutomations(false);
    }
  };

  const handleInsertTag = (tag) => {
    const el = document.getElementById("template-textarea");
    if (!el) return;
    markTemplateEdited();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newBody = before + tag + after;

    setTemplates((prev) => prev.map((t) => (t.name === activeTemplateTab ? { ...t, body: newBody } : t)));

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
    <div className={styles.page}>
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-slide-in">
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl border text-sm font-semibold ${
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

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>CUSTOMER COMMUNICATIONS</span>
          <h1>WhatsApp workspace</h1>
          <p>Your numbers, messages, and automations. One place to manage every conversation.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={isCheckingStatus}
            onClick={() => {
              fetchStatus();
              fetchAccounts();
              fetchTemplates();
              fetchQueue();
            }}
          >
            <RefreshCw size={16} className={isCheckingStatus ? "animate-spin" : ""} />
            {isCheckingStatus ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleRunAutomations}
            disabled={isRunningAutomations || !connected}
          >
            <Zap size={16} /> {isRunningAutomations ? "Running…" : "Run automations"}
          </button>
        </div>
      </header>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>
            <Smartphone size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Gateway connection</span>
            <strong>
              <i className={connected ? styles.onlineDot : styles.offlineDot} />
              {connected ? "Connected" : status.replace(/_/g, " ")}
            </strong>
            <small>{connected ? "Ready to send messages" : "Check your sender connection"}</small>
          </div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>
            <Users size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Linked accounts</span>
            <strong>
              {accounts.length}
              <span className={styles.metricUnit}> numbers</span>
            </strong>
            <small>{accounts.filter((a) => a.connected).length} connected now</small>
          </div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>
            <MessageSquare size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Message history</span>
            <strong>
              {totalCount}
              <span className={styles.metricUnit}> messages</span>
            </strong>
            <small>Across your delivery queue</small>
          </div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>
            <FileText size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Message templates</span>
            <strong>
              {templates.length}
              <span className={styles.metricUnit}> templates</span>
            </strong>
            <small>Personalized for your customers</small>
          </div>
        </div>
      </div>

      <nav className={styles.tabs} aria-label="WhatsApp workspace sections">
        {[
          { id: "connection", label: "Accounts & testing", icon: Smartphone },
          { id: "templates", label: "Message templates", icon: MessageSquare },
          { id: "logs", label: "Delivery history", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={activeMainSection === tab.id ? "page" : undefined}
              className={activeMainSection === tab.id ? styles.activeTab : styles.tab}
              onClick={() => setActiveMainSection(tab.id)}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
        <span className={styles.tabNote}>
          <ShieldCheck size={14} /> Internal workspace
        </span>
      </nav>

      {/* MESSAGE TEMPLATES */}
      {activeMainSection === "templates" && (
        <section className={`${styles.panel} ${styles.templatesPanel}`}>
          <div className={`${styles.panelHeader} ${styles.templatesHeader}`}>
            <div>
              <span className={styles.eyebrow}>YOUR MESSAGE LIBRARY</span>
              <h2>Message templates</h2>
              <p>A consistent voice for every reminder, greeting and update.</p>
            </div>
            <span className={styles.templateHeaderNote}>
              <MessageSquare size={16} aria-hidden="true" /> Reusable messages
            </span>
          </div>
          <div className={styles.templateLayout}>
            <aside className={styles.templateSidebar} aria-label="Choose a message template">
              <span className={styles.libraryLabel}>Choose a template</span>
              {TEMPLATE_GROUPS.map((group) => (
                <div key={group.id} className={styles.templateGroup}>
                  <h3>
                    {group.label
                      .replace(" Module", "")
                      .replace("Customer Profiling & Greetings", "Customer greetings")
                      .replace("Policy & Claims Operations", "Policy & claims")}
                  </h3>
                  {group.templates.map((tmpl) => {
                    const Icon = tmpl.icon;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        aria-pressed={activeTemplateTab === tmpl.id}
                        className={
                          activeTemplateTab === tmpl.id ? styles.selectedTemplate : styles.templateButton
                        }
                        onClick={() => {
                          setSelectedModuleGroup(group.id);
                          setActiveTemplateTab(tmpl.id);
                          setTemplateSuccess(false);
                        }}
                      >
                        <Icon size={16} />
                        {tmpl.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </aside>
            <div className={styles.templateMain}>
              <div className={styles.templateHeading}>
                <div>
                  <span className={styles.templateCategory}>
                    {currentModule.label
                      .replace(" Module", "")
                      .replace("Customer Profiling & Greetings", "Customer greetings")
                      .replace("Policy & Claims Operations", "Policy & claims")}
                  </span>
                  <h3>{currentModule.templates.find((t) => t.id === activeTemplateTab)?.label}</h3>
                </div>
                <span className={styles.templateEditingNote}>Edit below. Preview as you type.</span>
              </div>
              <div className={styles.templateEditorGrid}>
                {/* Message editor */}
                <div className={styles.editor}>
                  <div className={styles.messageField}>
                    <div className={styles.editorToolbar}>
                      <label htmlFor="template-textarea">
                        <MessageSquare size={15} aria-hidden="true" /> Message
                      </label>
                      <span className={styles.characterCount}>
                        {activeTemplate.body ? `${activeTemplate.body.length} characters` : ""}
                      </span>
                    </div>
                    <textarea
                      id="template-textarea"
                      rows="12"
                      value={activeTemplate.body || ""}
                      onChange={handleTemplateBodyChange}
                      className={styles.messageTextarea}
                    />
                  </div>

                  <div className={styles.variableSection}>
                    <div className={styles.editorSectionHeading}>
                      <h4>Personalize your message</h4>
                      <span>Click a field to insert</span>
                    </div>
                    <div className={styles.variableList}>
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => handleInsertTag(v.tag)}
                          title={v.desc}
                          className={styles.variableButton}
                        >
                          <Plus size={12} aria-hidden="true" />
                          {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.attachmentSection}>
                    <div className={styles.editorSectionHeading}>
                      <h4>
                        <FileText size={15} aria-hidden="true" /> Attachment
                      </h4>
                      <span>Optional</span>
                    </div>
                    <div className={styles.attachmentFields}>
                      <div>
                        <label htmlFor="template-media-url">Media URL</label>
                        <input
                          id="template-media-url"
                          type="text"
                          value={activeTemplate.mediaUrl || ""}
                          onChange={handleTemplateMediaChange}
                          placeholder="https://example.com/image.png or base64 data"
                          className={styles.attachmentInput}
                        />
                      </div>
                      <div>
                        <label htmlFor="template-media-type">File type</label>
                        <select
                          id="template-media-type"
                          value={activeTemplate.mediaType || "IMAGE"}
                          onChange={handleTemplateMediaTypeChange}
                          className={styles.attachmentInput}
                        >
                          <option value="IMAGE">Image</option>
                          <option value="PDF">PDF / Document</option>
                        </select>
                      </div>
                    </div>
                    <p>Use a public image or document URL. Leave empty for a text-only message.</p>
                  </div>

                  <div className={styles.editorFooter}>
                    <span className={styles.editorFooterNote}>
                      Customer fields are filled in automatically when sent.
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className={styles.primaryButton}
                    >
                      <Save size={16} />
                      {isSavingTemplate ? "Saving…" : "Save template"}
                    </button>
                  </div>
                </div>

                {/* Customer preview */}
                <div className={styles.preview}>
                  <div className={styles.previewHeading}>
                    <h4>Customer preview</h4>
                    <span className={styles.previewLive}>
                      <span aria-hidden="true" /> Live
                    </span>
                  </div>

                  <div className={styles.chatPreview}>
                    <div className={styles.chatHeader}>
                      <span className={styles.chatAvatar}>JD</span>
                      <div>
                        <strong>John Doe</strong>
                        <span>Example customer</span>
                      </div>
                      <MessageSquare size={18} aria-hidden="true" />
                    </div>
                    <div className={styles.chatBody}>
                      <span className={styles.chatDate}>Today</span>
                      <div className={styles.chatBubble}>
                        {activeTemplate.mediaUrl && (
                          <div className={styles.chatAttachment}>
                            <FileText size={18} aria-hidden="true" />
                            <span>
                              {activeTemplate.mediaType === "IMAGE" ? "Image attachment" : "PDF attachment"}
                            </span>
                          </div>
                        )}

                        <div className={styles.chatMessage}>{compilePreviewText(activeTemplate.body)}</div>

                        <div className={styles.chatTimestamp}>
                          <span>
                            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className={styles.chatTicks} aria-label="Read">
                            ✓✓
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className={styles.previewNote}>
                    <Info size={14} aria-hidden="true" /> Preview uses sample details. Your message will use
                    each customer’s information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: GATEWAY CONNECTION & TEST SENDER */}
      {activeMainSection === "connection" && (
        <div className={styles.connectionLayout}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>YOUR SENDING NUMBERS</span>
                <h2>
                  Connected accounts <span className={styles.count}>{accounts.length}</span>
                </h2>
                <p>Choose the active sender for renewals, greetings, and policy updates.</p>
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!canCreateAccount}
                onClick={() => setShowAddAccountModal(true)}
              >
                <Plus size={17} />
                Link new number
              </button>
            </div>
            {accountsError && (
              <div role="alert" className={styles.error}>
                <AlertCircle size={18} />
                {accountsError}
              </div>
            )}
            <div className={styles.primarySenderSection}>
              <div className={styles.primarySenderIntro}>
                <span className={styles.primarySenderIcon} aria-hidden="true">
                  <Smartphone size={22} />
                </span>
                <div>
                  <h3>Your sending account</h3>
                  <p>Choose your personal WhatsApp sender for CRM messages.</p>
                </div>
              </div>
              <div className={styles.primarySenderControl}>
                <PrimaryWhatsAppSelector />
              </div>
            </div>
            <div className={`${styles.accountList} ${canAdmin ? styles.accountListWithAccess : ""}`}>
              {accounts.length > 0 && (
                <div
                  className={`${styles.accountRow} ${styles.accountListHeader} ${canAdmin ? styles.accountRowWithAccess : ""}`}
                  aria-hidden="true"
                >
                  <span className={styles.accountColumnTitle}>Account</span>
                  {canAdmin && <span>Access given</span>}
                  <span>Status</span>
                  <div className={`${styles.accountActions} ${canAdmin ? styles.adminAccountActions : ""}`}>
                    {canAdmin && <span>Manage access</span>}
                    <span>Primary / QR</span>
                    <span>Disconnect</span>
                    <span>Log out</span>
                    <span>Remove</span>
                  </div>
                </div>
              )}
              {accounts.length === 0 ? (
                <div className={styles.emptyState}>
                  <Smartphone size={28} />
                  <h3>
                    {isLoadingAccounts
                      ? "Loading your accounts…"
                      : accountsError
                        ? "Accounts are unavailable"
                        : "Connect your first number"}
                  </h3>
                  <p>
                    {accountsError
                      ? "Use Refresh above to try again."
                      : "Link a WhatsApp number to start sending customer messages."}
                  </p>
                </div>
              ) : (
                accounts.map((acc) => {
                  const isActionBusy = accountActionLoading === acc.id || !acc.canManage;
                  return (
                    <article
                      key={acc.id}
                      className={`${styles.accountRow} ${canAdmin ? styles.accountRowWithAccess : ""}`}
                      data-primary={acc.isDefault || undefined}
                    >
                      <div className={styles.accountAvatar}>
                        <Smartphone size={23} />
                      </div>
                      <div className={styles.accountIdentity}>
                        <div className={styles.accountName}>
                          <h3>{acc.label}</h3>
                          {acc.isDefault && (
                            <span className={styles.senderBadge}>
                              <ShieldCheck size={13} />
                              My primary
                            </span>
                          )}
                        </div>
                        <p>
                          {acc.phoneNumber
                            ? `+${acc.phoneNumber}`
                            : "Link your device to connect this account"}
                        </p>
                        {!acc.canManage && (
                          <span
                            className={styles.accountOwnerNote}
                            title="Only the linking staff member can manage this account"
                          >
                            {acc.ownerName ? `Managed by ${acc.ownerName}` : "Owner: Unknown"}
                          </span>
                        )}
                      </div>
                      {canAdmin && (
                        <div className={styles.accountAccessCount}>
                          <span>Access given</span>
                          <strong>
                            <Users size={14} aria-hidden="true" />
                            {acc.accessUserIds?.length || 0} staff
                          </strong>
                        </div>
                      )}
                      <span className={acc.connected ? styles.connectedBadge : styles.disconnectedBadge}>
                        <i />
                        {acc.connected
                          ? "Connected"
                          : acc.state === "PAUSED"
                            ? "Paused"
                            : acc.state === "QR_READY"
                              ? "Awaiting scan"
                              : (acc.state || "Disconnected").replace(/_/g, " ").toLowerCase()}
                      </span>
                      <div
                        className={`${styles.accountActions} ${canAdmin ? styles.adminAccountActions : ""}`}
                      >
                        {canAdmin &&
                          (acc.registered ? (
                            <button
                              type="button"
                              className={`${styles.secondaryButton} ${styles.accountAccessAction}`}
                              onClick={() => {
                                setAccessAccount(acc);
                                void fetchAccounts(true, false);
                              }}
                            >
                              <ShieldCheck size={14} aria-hidden="true" />
                              <span className={styles.accountActionLabel}>Manage access</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${styles.secondaryButton} ${styles.accountAccessAction}`}
                              onClick={() => updateAccountAccess("register", acc.id)}
                            >
                              Enable account access
                            </button>
                          ))}
                        {acc.connected && acc.canUse && !acc.isDefault && (
                          <button
                            type="button"
                            className={`${styles.secondaryButton} ${styles.accountSenderAction}`}
                            disabled={accountActionLoading === acc.id}
                            onClick={() => handleSetDefaultAccount(acc.id)}
                          >
                            Set my primary
                          </button>
                        )}
                        {acc.connected && acc.isDefault && (
                          <span className={styles.accountPrimaryState}>
                            <CheckCircle2 size={14} aria-hidden="true" />
                            Selected
                          </span>
                        )}
                        {!acc.connected && (
                          <button
                            type="button"
                            className={`${styles.secondaryButton} ${styles.accountSenderAction}`}
                            disabled={isActionBusy}
                            onClick={() => handleOpenQrModal(acc.id, acc.label)}
                          >
                            <Smartphone size={14} />
                            Scan QR
                          </button>
                        )}
                        {acc.connected && (
                          <button
                            type="button"
                            className={styles.textButton}
                            disabled={isActionBusy}
                            onClick={() => handlePauseAccount(acc.id)}
                          >
                            Disconnect
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.dangerButton}
                          disabled={isActionBusy}
                          onClick={() => setAccountConfirmation({ action: "logout", account: acc })}
                        >
                          Log out
                        </button>
                        {accounts.length > 1 && (
                          <button
                            type="button"
                            className={styles.iconButton}
                            disabled={isActionBusy}
                            onClick={() => setAccountConfirmation({ action: "delete", account: acc })}
                            aria-label={`Remove ${acc.label}`}
                            title="Remove account"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            <div className={styles.accountFooter}>
              <span>
                <ShieldCheck size={15} />
                Linked sessions are saved securely on your gateway.
              </span>
              <span>
                {isLoadingAccounts
                  ? "Refreshing accounts…"
                  : `${accounts.filter((a) => a.connected).length} of ${accounts.length} accounts connected`}
              </span>
            </div>
          </section>

          {/* LOWER SECTION: TEST DISPATCHER & DIAGNOSTICS */}
          <div className={styles.testingLayout}>
            <div className={styles.panelBody}>
              <div className={styles.formHeading}>
                <h3 className="text-base font-semibold text-slate-900">Send a test message</h3>
                <p className="text-sm text-slate-500 font-normal mt-0.5">
                  Send a test message from your personal primary account.
                </p>
              </div>

              <form onSubmit={handleSendTest} className="space-y-5">
                <p className="text-sm">Messages use My Primary WhatsApp selected above.</p>
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
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Recipient Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 91XXXXXXXXXX"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition"
                    />
                    <p className="text-sm text-slate-400 mt-1 font-medium">
                      Include country code (e.g. 91 for India) without '+' or spaces.
                    </p>
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Your message
                  </label>
                  <textarea
                    rows="4"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition leading-relaxed"
                  />
                </div>

                <button type="submit" disabled={isSendingTest} className={styles.primaryButton}>
                  <Send size={16} className={isSendingTest ? "animate-pulse" : ""} />
                  {isSendingTest ? "Sending Test Message..." : "Send test message"}
                </button>

                {testResult && (
                  <div
                    className={`p-4 rounded-xl border text-sm font-medium ${
                      testResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    {testResult.success ? (
                      <div>
                        <p className="font-semibold flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 size={15} className="text-emerald-600" /> Test Message Sent!
                        </p>
                        <p className="text-sm text-slate-500 mt-1 font-mono">
                          Message ID: {testResult.messageId}
                        </p>
                        {testResult.accountId && (
                          <p className="text-sm text-slate-500 font-mono">
                            Dispatched Via: {testResult.accountId}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold flex items-center gap-1.5 text-rose-800">
                          <AlertCircle size={15} className="text-rose-600" /> Dispatch Failed
                        </p>
                        <p className="text-sm text-rose-700 mt-1">{testResult.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            <aside className={styles.sideStack}>
              <section className={styles.healthPanel}>
                <div className={styles.healthHeader}>
                  <span className={styles.eyebrow}>SENDER STATUS</span>
                  <i className={connected ? styles.onlineDot : styles.offlineDot} />
                </div>
                <h2>{connected ? "You're ready to send." : "Your sender needs attention."}</h2>
                <p>
                  {connected
                    ? "Your active number is connected. New automated messages will use this account."
                    : statusError || "Connect your WhatsApp number to start sending messages."}
                </p>
                <dl className={styles.healthDetails}>
                  <div>
                    <dt>Active sender</dt>
                    <dd>{accounts.find((a) => a.isDefault)?.label || "No active sender"}</dd>
                  </div>
                  <div>
                    <dt>Last checked</dt>
                    <dd>
                      {lastChecked
                        ? lastChecked.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                        : "Not yet checked"}
                    </dd>
                  </div>
                  {metrics && (
                    <div>
                      <dt>Gateway uptime</dt>
                      <dd>{Math.floor(metrics.uptimeSeconds / 60)} min</dd>
                    </div>
                  )}
                </dl>
                <div className={styles.healthNote}>
                  <Info size={16} />
                  <span>
                    Queued messages keep their originally assigned sender, even when you switch accounts.
                  </span>
                </div>
              </section>
              <section className={styles.guidePanel}>
                <h3>Linking a new number?</h3>
                <p>Keep the phone handy. Setup takes just a moment.</p>
                <ol>
                  <li>
                    <span>1</span>
                    <div>
                      <strong>Add your account</strong>
                      <p>Click Link new number and give it a name.</p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Open WhatsApp on your phone</strong>
                      <p>Go to Settings → Linked devices.</p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Scan the QR code</strong>
                      <p>Choose Link a device and scan to connect.</p>
                    </div>
                  </li>
                </ol>
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* SECTION 3: MESSAGE QUEUE & DISPATCH LOGS */}
      {activeMainSection === "logs" && (
        <div className={styles.panelBody}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Delivery history</h3>
              <p className="text-sm text-slate-500 font-normal mt-0.5">
                Inspect real-time dispatch queue, retry failed messages, and review delivery logs. Total:{" "}
                {totalCount} records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={queueStatusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
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
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-50 transition shadow-sm"
              >
                <RotateCcw size={13} />
                Retry Failed
              </button>
            </div>
          </div>

          {isLoadingQueue ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white">
              <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin mb-2" />
              <p className="text-slate-400 text-sm font-medium">Loading queue logs...</p>
            </div>
          ) : queueMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white">
              <Clock className="w-9 h-9 text-slate-300 mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">No Queue Messages Found</h4>
              <p className="text-sm text-slate-400 max-w-xs mt-0.5">
                The message queue is empty. Active triggers will enqueue messages at scheduled thresholds.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
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
                    const formattedTime = date
                      ? new Date(date).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "N/A";

                    return (
                      <tr key={msg.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-sm">{msg.recipientName}</div>
                          <div className="text-sm text-slate-400 font-mono mt-0.5">{msg.recipientPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {msg.messageType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-normal text-slate-600 leading-normal">
                          <div className="line-clamp-2" title={msg.messageBody}>
                            {msg.messageBody}
                          </div>
                          {msg.mediaUrl && (
                            <div className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-1">
                              <FileText size={10} />
                              <span className="truncate max-w-[120px]">{msg.fileName || "attachment"}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-sm font-semibold text-slate-500">
                          {msg.attempts} / 3
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-semibold uppercase text-sm border ${
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
                            <div
                              className="text-sm text-rose-600 font-medium mt-1 leading-normal max-w-[140px] truncate"
                              title={msg.errorMessage}
                            >
                              {msg.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-400 whitespace-nowrap">
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
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500 font-medium mt-4 rounded-xl">
            <span>
              Showing {queueOffset + 1} - {Math.min(queueOffset + queueLimit, totalCount)} of {totalCount}{" "}
              records
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
      {accountConfirmation && (
        <ModalPortal>
          <div className={styles.overlay}>
            <div
              className={`${styles.dialog} text-center`}
              role="dialog"
              aria-modal="true"
              aria-label="WhatsApp account setup"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-semibold text-slate-900 mb-1.5">
                {accountConfirmation.action === "delete" ? "Remove this account?" : "Log out of WhatsApp?"}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                {accountConfirmation.action === "delete"
                  ? `This permanently removes ${accountConfirmation.account.label} and its saved connection. You will need to link the number again to use it.`
                  : `This signs out ${accountConfirmation.account.label}. Scan a new QR code to reconnect and send messages from this number.`}
              </p>

              <div className="flex gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={() => setAccountConfirmation(null)}
                  autoFocus
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-700 bg-white transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { action, account } = accountConfirmation;
                    setAccountConfirmation(null);
                    if (action === "delete") handleDeleteAccount(account.id);
                    else handleLogoutAccount(account.id);
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-md transition disabled:opacity-50"
                >
                  {accountConfirmation.action === "delete" ? "Remove account" : "Log out"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {/* ADD ACCOUNT MODAL */}
      {showAddAccountModal && (
        <ModalPortal>
          <div className={styles.overlay}>
            <div
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-label="WhatsApp account setup"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
                <Smartphone className="w-6 h-6" />
              </div>

              <h3 className="text-base font-semibold text-slate-900 mb-1">Link a WhatsApp number</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5 font-medium">
                Enter an identifying label for this number (e.g., "Support Desk", "Claims Helpline").
              </p>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Account name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Desk WhatsApp"
                  value={newAccountLabel}
                  onChange={(e) => setNewAccountLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition"
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-700 bg-white transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={isCreatingAccount || !newAccountLabel.trim()}
                  className={styles.primaryButton}
                >
                  {isCreatingAccount ? "Generating QR..." : "Create & scan QR"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* QR PAIRING MODAL */}
      {accessAccount && (
        <ModalPortal>
          <div className={styles.overlay} onClick={() => setAccessAccount(null)}>
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Manage WhatsApp access"
              className={`${styles.dialog} ${styles.accessDialog}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.accessHeader}>
                <span className={styles.accessHeaderIcon} aria-hidden="true">
                  <ShieldCheck size={22} />
                </span>
                <div className={styles.accessHeading}>
                  <h2>Manage access</h2>
                  <p>{accessAccount.label}</p>
                </div>
                <button
                  type="button"
                  autoFocus
                  aria-label="Close access settings"
                  className={styles.accessClose}
                  onClick={() => setAccessAccount(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.accessBody}>
                <p className={styles.accessNotice}>
                  Sending access does not allow staff to disconnect this session.
                </p>
                <label className={styles.accessOwner}>
                  <span>Responsible session owner</span>
                  <select
                    value={accessAccount.ownerUserId || ""}
                    onChange={(e) =>
                      updateAccountAccess("assign-owner", accessAccount.id, {
                        ownerUserId: e.target.value || null,
                      })
                    }
                    className={styles.accessOwnerSelect}
                  >
                    <option value="">Unknown</option>
                    {staffUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.accessSectionHeading}>
                  <h3>Staff sending access</h3>
                  <span>{staffUsers.length} staff</span>
                </div>
                <div className={styles.accessStaffList}>
                  {staffUsers.map((user) => (
                    <label key={user.id} className={styles.accessStaffRow}>
                      <span className={styles.accessStaffName}>{user.name || user.email}</span>
                      <input
                        type="checkbox"
                        className={styles.accessCheckbox}
                        checked={accessAccount.accessUserIds.includes(user.id)}
                        disabled={savingAccess.includes(`${accessAccount.id}:${user.id}`)}
                        aria-busy={savingAccess.includes(`${accessAccount.id}:${user.id}`)}
                        onChange={(e) =>
                          updateAccountAccess("grant", accessAccount.id, {
                            userId: user.id,
                            allowed: e.target.checked,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              {accessAccount.connected && (
                <div className={styles.accessFooter}>
                  <button
                    type="button"
                    className={styles.accessAutomationButton}
                    onClick={() => updateAccountAccess("set-system", accessAccount.id)}
                  >
                    <Zap size={16} aria-hidden="true" />
                    Authorize as system automation sender
                  </button>
                </div>
              )}
            </section>
          </div>
        </ModalPortal>
      )}
      {qrModalAccount && (
        <ModalPortal>
          <div className={styles.overlay}>
            <div
              className={`${styles.dialog} text-center`}
              role="dialog"
              aria-modal="true"
              aria-label="WhatsApp account setup"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-slate-900">Scan QR: {qrModalAccount.label}</h3>
                  <p className="text-sm text-slate-500">WhatsApp → Settings → Linked devices</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalAccount(null)}
                  autoFocus
                  className={styles.iconButton}
                  aria-label="Close QR code"
                >
                  <X size={18} />
                </button>
              </div>

              {qrModalAccount.qrCode ? (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm mb-3">
                    <Image
                      src={qrModalAccount.qrCode}
                      alt="WhatsApp Login QR Code"
                      width={200}
                      height={200}
                      unoptimized
                      className="w-48 h-48 block rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2 items-center text-slate-600 text-sm font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
                    <Info size={16} className="text-emerald-600 shrink-0" />
                    <span>Open WhatsApp on your phone ➔ Linked Devices ➔ Link a Device.</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-500">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-600" />
                  Generating WhatsApp Web QR Code...
                </div>
              )}

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setQrModalAccount(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-700 bg-white transition"
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
