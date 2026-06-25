"use client";

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
  RotateCcw,
  Plus,
  Info,
  Calendar,
  AlertCircle,
  Copy,
  Layout,
  ExternalLink,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";

const TEMPLATE_VARIABLES = [
  { tag: "{{customerName}}", desc: "Customer's Full Name" },
  { tag: "{{companyName}}", desc: "Your Organization Name" },
  { tag: "{{policyNumber}}", desc: "Policy Number" },
  { tag: "{{policyType}}", desc: "Policy Type (e.g. Motor, Health)" },
  { tag: "{{expiryDate}}", desc: "Policy Expiry Date" },
  { tag: "{{agentName}}", desc: "Assigned Servicing Agent" },
];

export default function WhatsAppSetupPage() {
  // Connection Status
  const [status, setStatus] = useState("UNREACHABLE");
  const [connected, setConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Test message
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from BimaHeadquarter CRM WhatsApp integration.");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [activeTemplateTab, setActiveTemplateTab] = useState("birthday_wish");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  // Queue & Logs
  const [queueMessages, setQueueMessages] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [queueLimit] = useState(10);
  const [queueOffset, setQueueOffset] = useState(0);
  const [queueStatusFilter, setQueueStatusFilter] = useState("");
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isRetryingQueue, setIsRetryingQueue] = useState(false);

  // Global Alerts
  const [toast, setToast] = useState(null);

  // Polling ref for QR code
  const pollIntervalRef = useRef(null);

  const compilePreviewText = (text) => {
    if (!text) return "Type a template message in the editor to see a live preview here...";
    return text
      .replace(/\{\{customerName\}\}/g, "John Doe")
      .replace(/\{\{companyName\}\}/g, "BIMAHEADQUARTER")
      .replace(/\{\{policyNumber\}\}/g, "POL-987654")
      .replace(/\{\{policyType\}\}/g, "Health Insurance")
      .replace(/\{\{expiryDate\}\}/g, "15-Jul-2026")
      .replace(/\{\{agentName\}\}/g, "Rahul Sharma");
  };

  const activeTemplate = templates.find((t) => t.name === activeTemplateTab) || {
    body: "",
    mediaUrl: "",
    mediaType: "IMAGE",
  };

  useEffect(() => {
    fetchStatus();
    fetchTemplates();
    fetchQueue();

    return () => {
      stopPollingStatus();
    };
  }, []);

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
    pollIntervalRef.current = setInterval(() => {
      fetchStatus(true);
    }, 5000);
  };

  const stopPollingStatus = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  async function fetchStatus(isSilent = false) {
    if (!isSilent) setIsCheckingStatus(true);
    try {
      const res = await fetch("/api/operations/whatsapp/status");
      if (!res.ok) throw new Error("Failed to fetch connection status");
      const data = await res.json();
      setConnected(data.connected);
      setStatus(data.status);
      setQrCode(data.qrCode);
      setLastChecked(data.lastChecked ? new Date(data.lastChecked) : new Date());
      setStatusError(data.error);
    } catch (err) {
      setStatus("UNREACHABLE");
      setConnected(false);
      setQrCode(null);
      setStatusError(err.message);
      setLastChecked(new Date());
    } finally {
      if (!isSilent) setIsCheckingStatus(false);
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

  async function fetchQueue() {
    setIsLoadingQueue(true);
    try {
      const statusParam = queueStatusFilter ? `&status=${queueStatusFilter}` : "";
      const res = await fetch(
        `/api/operations/whatsapp/queue?limit=${queueLimit}&offset=${queueOffset}${statusParam}`
      );
      if (!res.ok) throw new Error("Failed to load queue");
      const data = await res.json();
      setQueueMessages(data.messages || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      showToast("error", err.message || "Failed to load message queue");
    } finally {
      setIsLoadingQueue(false);
    }
  }

  // Handle template body updates locally
  const handleTemplateBodyChange = (e) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.name === activeTemplateTab ? { ...t, body: e.target.value } : t
      )
    );
  };

  // Handle template mediaUrl updates locally
  const handleTemplateMediaChange = (e) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.name === activeTemplateTab ? { ...t, mediaUrl: e.target.value } : t
      )
    );
  };

  // Handle template mediaType updates locally
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
    if (!testPhone) {
      showToast("error", "Please specify a recipient phone number");
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/operations/whatsapp/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      setTestResult({ success: true, messageId: data.messageId });
      showToast("success", "Test message sent successfully!");
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

  // Pagination helper
  const handlePageChange = (newOffset) => {
    setQueueOffset(newOffset);
    setTimeout(() => fetchQueue(), 50);
  };

  // Status Filter helper
  const handleStatusFilterChange = (status) => {
    setQueueStatusFilter(status);
    setQueueOffset(0);
    setTimeout(() => fetchQueue(), 50);
  };

  return (
    <div className="whatsapp-setup-page pb-12 max-w-7xl mx-auto px-4">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] animate-slide-in">
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-lg shadow-lg border text-sm font-semibold ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-250 text-emerald-800"
                : "bg-rose-50 border-rose-250 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <OperationsBackLink />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-emerald-600 animate-pulse" />
            WhatsApp Automation Setup
          </h2>
          <p className="text-slate-500 text-sm">
            Configure WhatsApp gateway session, customize notification templates, and inspect message queue logs.
          </p>
        </div>
        <button
          onClick={() => {
            fetchStatus();
            fetchTemplates();
            fetchQueue();
          }}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-350 rounded-lg text-xs font-semibold hover:bg-emerald-50/50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 bg-white transition shadow-sm"
        >
          <RefreshCw size={14} className={isCheckingStatus ? "animate-spin text-emerald-600" : ""} />
          Refresh Panel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Status & Test sender */}
        <div className="lg:col-span-1 space-y-6">
          {/* SESSION STATUS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-600">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                Connection Status
              </h3>
              {isCheckingStatus && (
                <span className="w-4 h-4 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
              )}
            </div>
            <div className="p-5 flex flex-col items-center text-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border-2 mb-3.5 ${
                  connected
                    ? "bg-emerald-100 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-100"
                    : (status === "SCAN_QR_CODE" || status === "QR_READY")
                    ? "bg-amber-100 border-amber-500 text-amber-600 animate-pulse shadow-lg shadow-amber-50"
                    : "bg-rose-100 border-rose-500 text-rose-600"
                }`}
              >
                <Smartphone className="w-7 h-7" />
              </div>

              <h4 className="text-base font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 justify-center">
                {connected ? (
                  <span className="text-emerald-700 font-bold">🟢 Connected</span>
                ) : (
                  <span className="text-slate-700">{status.replace(/_/g, " ")}</span>
                )}
              </h4>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Last checked: {lastChecked ? lastChecked.toLocaleTimeString("en-IN") : "Never"}
              </p>

              {statusError && !connected && (
                <div className="mt-3 p-2 bg-rose-50 rounded text-[11px] text-rose-700 font-medium leading-relaxed max-w-full overflow-hidden break-words border border-rose-100">
                  {statusError}
                </div>
              )}

              {/* QR Code Container */}
              {(status === "SCAN_QR_CODE" || status === "QR_READY") && qrCode && (
                <div className="mt-5 w-full flex flex-col items-center">
                  <div className="p-3.5 bg-white border-2 border-emerald-100 rounded-xl shadow-md">
                    <img
                      src={qrCode}
                      alt="WhatsApp Web Login QR Code"
                      className="w-48 h-48 block"
                    />
                  </div>
                  <div className="flex gap-2 items-center text-slate-600 mt-4.5 text-xs leading-relaxed max-w-xs font-medium bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                    <Info size={18} className="text-emerald-600 shrink-0 animate-bounce" />
                    <span>Scan this QR code using your WhatsApp Linked Devices screen. Polling automatically.</span>
                  </div>
                </div>
              )}

              {!connected && status !== "SCAN_QR_CODE" && status !== "QR_READY" && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="flex gap-2 items-center text-rose-700 text-xs leading-relaxed font-medium bg-rose-50/50 p-3 rounded-lg border border-rose-100 max-w-xs">
                    <AlertTriangle size={18} className="text-rose-500 shrink-0 animate-pulse" />
                    <span>WhatsApp gateway is offline or initializing. Please ensure the node server is running.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TEST MESSAGE SENDER */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-teal-600">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Send Test Message</h3>
            </div>
            <form onSubmit={handleSendTest} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-655 mb-1.5 uppercase">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 91XXXXXXXXXX"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  Include country code (e.g. 91 for India) without '+' or spaces.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-655 mb-1.5 uppercase">
                  Message Text
                </label>
                <textarea
                  rows="3"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSendingTest || !connected}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg text-xs shadow-md disabled:opacity-50 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-350 transition-all duration-200"
              >
                <Send size={13} className={isSendingTest ? "animate-pulse" : ""} />
                {isSendingTest ? "Sending..." : "Send Test Message"}
              </button>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-semibold ${
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm"
                      : "bg-rose-50 border-rose-200 text-rose-800 shadow-sm"
                  }`}
                >
                  {testResult.success ? (
                    <div>
                      <p className="font-bold flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 size={14} className="text-emerald-600" /> Sent Successfully!
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">ID: {testResult.messageId}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold flex items-center gap-1 text-rose-700">
                        <AlertCircle size={14} className="text-rose-600" /> Sending Failed
                      </p>
                      <p className="text-[10px] text-rose-600 mt-0.5">{testResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Template editor & queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* TEMPLATE EDITOR */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-600">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Notification Templates</h3>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {[
                { id: "birthday_wish", label: "Birthday" },
                { id: "renewal_reminder", label: "Renewal" },
                { id: "claim_update", label: "Claims" },
                { id: "policy_document", label: "Policy Docs" },
                { id: "festival_greeting", label: "Festival" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTemplateTab(tab.id);
                    setTemplateSuccess(false);
                  }}
                  className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                    activeTemplateTab === tab.id
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/20"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Form elements (Left 2 cols) */}
              <div className="xl:col-span-2 space-y-5">
                {/* Media URL setup */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-655 mb-1.5 uppercase">
                      Attachment Media URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.mediaUrl || ""}
                      onChange={handleTemplateMediaChange}
                      placeholder="https://example.com/image.png or base64 data"
                      className="w-full pl-3 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Url of image, brochure PDF, or public document. Empty sends text-only.
                    </p>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-655 mb-1.5 uppercase">
                      Attachment Type
                    </label>
                    <select
                      value={activeTemplate.mediaType || "IMAGE"}
                      onChange={handleTemplateMediaTypeChange}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="IMAGE">IMAGE</option>
                      <option value="PDF">PDF / DOCUMENT</option>
                    </select>
                  </div>
                </div>

                {/* Template Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-655 mb-1.5 uppercase">
                    Message Body / Caption Text
                  </label>
                  <textarea
                    id="template-textarea"
                    rows="6"
                    value={activeTemplate.body || ""}
                    onChange={handleTemplateBodyChange}
                    className="w-full pl-3 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                  ></textarea>
                </div>

                {/* Variable Placeholders */}
                <div>
                  <span className="block text-xs font-bold text-slate-655 mb-2 uppercase">
                    Available Variables (Click to Insert)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertTag(v.tag)}
                        title={v.desc}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded text-[11px] font-bold text-slate-600 font-mono transition flex items-center gap-1 hover:text-emerald-700 hover:border-emerald-300"
                      >
                        <Plus size={10} />
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save template */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    * Dynamic fields compile automatically before message is queued.
                  </span>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg text-xs shadow-md transition"
                  >
                    <Save size={13} />
                    {isSavingTemplate ? "Saving..." : "Save Template"}
                  </button>
                </div>
              </div>

              {/* Live Preview (Right 1 col) */}
              <div className="xl:col-span-1 flex flex-col justify-start">
                <span className="block text-xs font-bold text-slate-655 mb-2 uppercase">
                  Live Preview
                </span>
                
                <div className="border border-emerald-150 rounded-2xl overflow-hidden shadow-md flex flex-col h-[360px] bg-[#efeae2]">
                  {/* WhatsApp Mock Header */}
                  <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-650 text-emerald-105 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                        ID
                      </div>
                      <div>
                        <div className="font-bold text-xs">InsureDesk Customer</div>
                        <div className="text-[10px] text-emerald-300/90 font-medium">online</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat screen background area */}
                  <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end bg-[#efeae2]">
                    {/* Message Bubble */}
                    <div className="bg-[#dcf8c6] text-slate-800 p-3 rounded-lg rounded-tr-none shadow-sm max-w-[90%] self-end relative text-xs leading-relaxed border border-[#cbe5bd]">
                      {activeTemplate.mediaUrl && (
                        <div className="mb-2 bg-black/5 rounded p-1.5 border border-black/10 flex items-center gap-2 shrink-0">
                          {activeTemplate.mediaType === "IMAGE" ? (
                            <span className="text-[10px] text-slate-600 font-semibold truncate">🖼️ Image Attachment</span>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-semibold truncate">📄 PDF Document</span>
                          )}
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap font-sans text-slate-850 break-words pr-2">
                        {compilePreviewText(activeTemplate.body)}
                      </div>
                      
                      <div className="text-[9px] text-slate-500 text-right mt-1.5 font-semibold flex items-center justify-end gap-0.5">
                        <span>{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="text-[#34B7F1] text-[11px] font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 mt-2 font-semibold text-center leading-normal">
                  Values compiled using mock records for preview.
                </p>
              </div>
            </div>
          </div>

          {/* QUEUE & LOGS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">WhatsApp Message Queue & Logs</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Total queued: {totalCount} records. Sequenced at 8–12 seconds interval.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={queueStatusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="pl-2 pr-6 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-705 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SENDING">SENDING</option>
                  <option value="SENT">SENT</option>
                  <option value="RETRYING">RETRYING</option>
                  <option value="FAILED">FAILED</option>
                </select>
                
                <button
                  onClick={handleRetryAllFailed}
                  disabled={isRetryingQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-250 text-emerald-700 font-bold rounded text-xs hover:bg-emerald-100 transition shadow-sm"
                >
                  <RotateCcw size={12} />
                  Retry Failed
                </button>
              </div>
            </div>

            {isLoadingQueue ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white">
                <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin mb-2" />
                <p className="text-slate-400 text-xs font-medium">Loading logs...</p>
              </div>
            ) : queueMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white">
                <Clock className="w-8 h-8 text-slate-300 mb-2.5 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-700">No Queue Messages</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  The message queue is empty. Active triggers will enqueue messages at scheduled thresholds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-655 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
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
                        <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 text-xs">{msg.recipientName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{msg.recipientPhone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              {msg.messageType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-600 leading-normal">
                            <div className="line-clamp-2" title={msg.messageBody}>
                              {msg.messageBody}
                            </div>
                            {msg.mediaUrl && (
                              <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                <FileText size={10} />
                                <span className="truncate max-w-[120px]">{msg.fileName || "attachment"}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-xs font-bold text-slate-500">
                            {msg.attempts} / 3
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
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
                              <div className="text-[9px] text-rose-600 font-semibold mt-1 leading-normal max-w-[140px] truncate" title={msg.errorMessage}>
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
                                onClick={() => handleRetryMessage(msg.id)}
                                title="Retry sending"
                                className="p-1 hover:bg-slate-100 rounded text-emerald-600 hover:text-emerald-700 transition inline-block font-bold"
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

            {/* Pagination footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>
                Showing {queueOffset + 1} - {Math.min(queueOffset + queueLimit, totalCount)} of {totalCount} records
              </span>
              <div className="flex gap-2">
                <button
                  disabled={queueOffset === 0}
                  onClick={() => handlePageChange(queueOffset - queueLimit)}
                  className="px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition shadow-sm"
                >
                  Previous
                </button>
                <button
                  disabled={queueOffset + queueLimit >= totalCount}
                  onClick={() => handlePageChange(queueOffset + queueLimit)}
                  className="px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
