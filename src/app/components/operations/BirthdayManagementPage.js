"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Cake,
  Search,
  Download,
  Upload,
  Calendar,
  Plus,
  User,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Check,
  Send,
  MessageSquare,
  Gift,
  FileSpreadsheet
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import { calculateAgeAndCountdown } from "@/lib/customer-profiles/birthday-helpers";

export default function BirthdayManagementPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // empty means all
  const [activeTab, setActiveTab] = useState("all"); // all, today, upcoming, missing
  
  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGreetingModalOpen, setIsGreetingModalOpen] = useState(false);
  const [greetingTarget, setGreetingTarget] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("professional");
  const [customMessage, setCustomMessage] = useState("");
  
  // Editing inline
  const [editingId, setEditingId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isSendingAll, setIsSendingAll] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchBirthdays();
  }, []);

  async function fetchBirthdays() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/operations/birthday-management");
      if (!res.ok) throw new Error("Failed to fetch client profiles");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      setError(err.message || "Something went wrong while fetching data");
    } finally {
      setLoading(false);
    }
  }

  // Calculate upcoming days, age, and sorting values
  const processedProfiles = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out corporate/business profiles (e.g., name contains WAREHOUSE, PVT, LTD, etc.)
    // and profiles without any phone number, since birthday greetings are meant for individual human clients.
    const individualProfiles = profiles.filter((p) => {
      if (!p.name) return false;
      if (!p.phone || p.phone.trim() === "") return false;

      const corporateKeywords = /\b(warehouse|pvt|ltd|limited|corp|corporation|co\.|company|inc|associates|enterprises|industries|partners|agency|agencies|services|office|store|stores|shop|shops|motors|transport|logistics|firm|organization|org|bank|association|insurance|finance|club|school|college|university|hospital|clinic|trust|mill|mills|group|builders|developers|metals|electricals|automobiles)\b/i;
      if (corporateKeywords.test(p.name)) return false;

      return true;
    });

    return individualProfiles.map((p) => {
      const stats = calculateAgeAndCountdown(p.dob, today);
      
      let formattedDob = "Not set";
      let birthMonth = null;
      let birthDay = null;

      if (p.dob) {
        const birthDate = new Date(p.dob);
        formattedDob = birthDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        birthMonth = birthDate.getMonth() + 1;
        birthDay = birthDate.getDate();
      }

      return {
        ...p,
        ...stats,
        formattedDob,
        birthMonth,
        birthDay,
      };
    });
  }, [profiles]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return processedProfiles.filter((p) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.email && p.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Month Filter
      if (selectedMonth && p.birthMonth !== parseInt(selectedMonth, 10)) {
        return false;
      }

      // 3. Tab Filter
      if (activeTab === "today") {
        return p.daysToBirthday === 0 || p.daysToBirthday === 365;
      }
      if (activeTab === "upcoming") {
        return p.daysToBirthday !== null && p.daysToBirthday <= 30 && p.daysToBirthday > 0;
      }
      if (activeTab === "missing") {
        return !p.dob;
      }

      return true;
    });
  }, [processedProfiles, searchQuery, selectedMonth, activeTab]);

  // Metrics
  const metrics = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let missingCount = 0;
    let totalCount = processedProfiles.length;

    processedProfiles.forEach((p) => {
      if (!p.dob) {
        missingCount++;
      } else {
        if (p.daysToBirthday === 0 || p.daysToBirthday === 365) {
          todayCount++;
        } else if (p.daysToBirthday <= 30 && p.daysToBirthday > 0) {
          upcomingCount++;
        }
      }
    });

    return { todayCount, upcomingCount, missingCount, totalCount };
  }, [processedProfiles]);

  // Handle template creation & download
  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      
      const templateData = [
        {
          "Client Name": "Rahul Sharma",
          "Phone Number": "9876543210",
          "Email": "rahul@example.com",
          "Date of Birth (YYYY-MM-DD)": "1992-08-25"
        },
        {
          "Client Name": "Priya Patel",
          "Phone Number": "9123456789",
          "Email": "priya@example.com",
          "Date of Birth (YYYY-MM-DD)": "1988-11-12"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      worksheet["!cols"] = [
        { wch: 20 }, // Client Name
        { wch: 15 }, // Phone Number
        { wch: 25 }, // Email
        { wch: 25 }  // Date of Birth
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Birthday Template");
      
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "insuredesk_client_birthdays_template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      showToast("success", "Template downloaded successfully!");
    } catch {
      showToast("error", "Failed to download Excel template");
    }
  };

  // Export birthdays to excel
  const handleExportData = async () => {
    if (filteredProfiles.length === 0) {
      showToast("error", "No data to export.");
      return;
    }
    
    try {
      const XLSX = await import("xlsx");
      
      const exportData = filteredProfiles.map((p) => ({
        "Client Name": p.name,
        "Phone Number": p.phone,
        "Email": p.email || "N/A",
        "Date of Birth": p.dob || "N/A",
        "Age": p.age ?? "N/A",
        "Days to Birthday": p.daysToBirthday ?? "N/A"
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Client Birthdays");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `client_birthdays_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("success", "Excel file exported successfully!");
    } catch {
      showToast("error", "Failed to export data");
    }
  };

  // Parse Excel file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    
    const reader = new window.FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);

        // Normalize keys and validate rows
        const parsed = rawJson.map((row, idx) => {
          const nameKey = Object.keys(row).find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("client"));
          const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes("phone") || k.toLowerCase().includes("mobile") || k.toLowerCase().includes("contact"));
          const emailKey = Object.keys(row).find(k => k.toLowerCase().includes("email") || k.toLowerCase().includes("mail"));
          const dobKey = Object.keys(row).find(k => k.toLowerCase().includes("dob") || k.toLowerCase().includes("birth") || k.toLowerCase().includes("date"));

          const name = row[nameKey] ? String(row[nameKey]).trim() : "";
          const phone = row[phoneKey] ? String(row[phoneKey]).trim().replace(/\D/g, "") : "";
          const email = row[emailKey] ? String(row[emailKey]).trim() : "";
          
          let dob = "";
          let rawDob = row[dobKey];
          if (rawDob) {
            if (typeof rawDob === "number") {
              const dateObj = XLSX.SSF.parse_date_code(rawDob);
              if (dateObj) {
                const pad = (n) => String(n).padStart(2, '0');
                dob = `${dateObj.y}-${pad(dateObj.m)}-${pad(dateObj.d)}`;
              }
            } else {
              const dateMatch = String(rawDob).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
              if (dateMatch) {
                const pad = (n) => String(n).padStart(2, '0');
                dob = `${dateMatch[1]}-${pad(dateMatch[2])}-${pad(dateMatch[3])}`;
              } else {
                const parsedDate = new Date(rawDob);
                if (!isNaN(parsedDate.getTime())) {
                  const pad = (n) => String(n).padStart(2, '0');
                  dob = `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())}`;
                } else {
                  dob = String(rawDob).trim();
                }
              }
            }
          }

          // Validation
          const errors = [];
          if (!name) errors.push("Name is required");
          
          let cleanPhone = phone;
          if (phone.length === 12 && phone.startsWith("91")) cleanPhone = phone.slice(2);
          if (phone.length === 11 && phone.startsWith("0")) cleanPhone = phone.slice(1);
          
          if (!cleanPhone) {
            errors.push("Phone number is required");
          } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            errors.push("Must be a 10-digit Indian phone (starting 6-9)");
          }

          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push("Invalid email format");
          }

          if (dob) {
            const dateObj = new Date(dob);
            if (isNaN(dateObj.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
              errors.push("DOB must be YYYY-MM-DD");
            } else if (dateObj > new Date()) {
              errors.push("DOB cannot be in the future");
            }
          } else {
            errors.push("DOB is required");
          }

          return {
            index: idx + 1,
            name,
            phone: cleanPhone || phone,
            email,
            dob,
            isValid: errors.length === 0,
            errorString: errors.join(", ")
          };
        });

        setParsedRows(parsed);
      } catch (err) {
        showToast("error", "Error reading Excel file: " + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit bulk imports to backend API
  const handleConfirmImport = async () => {
    const validProfiles = parsedRows.filter(r => r.isValid);
    if (validProfiles.length === 0) {
      showToast("error", "No valid records to import.");
      return;
    }

    setIsImporting(true);
    setImportResults(null);
    try {
      const res = await fetch("/api/operations/birthday-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: validProfiles }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Import failed");
      }

      const results = await res.json();
      setImportResults(results);
      showToast("success", `Successfully imported ${results.createdCount} new, updated ${results.updatedCount} existing clients!`);
      fetchBirthdays(); 
    } catch (err) {
      showToast("error", err.message || "Failed to import client birthdays");
    } finally {
      setIsImporting(false);
    }
  };

  // Save DOB for individual client edit
  const handleSaveInlineDob = async (profileId) => {
    if (!editDate) return;
    try {
      const res = await fetch(`/api/customer-profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profiles.find(p => p.id === profileId),
          dob: editDate
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }

      const updatedProfile = await res.json();
      setProfiles(prev => prev.map(p => p.id === profileId ? updatedProfile : p));
      setEditingId("");
      showToast("success", "Date of birth updated successfully!");
    } catch (err) {
      showToast("error", err.message);
    }
  };

  // Toast message helpers
  const showToast = (type, message) => {
    if (type === "success") {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setError(message);
      setTimeout(() => setError(""), 4000);
    }
  };

  // Setup greeting generation
  const handleOpenGreeting = (profile) => {
    setGreetingTarget(profile);
    const professionalMsg = `Dear ${profile.name}, Insuredesk wishes you a very Happy Birthday! 🎂 May this special day bring you good health, happiness, and prosperity. Thank you for choosing us as your trusted partner. Have a wonderful celebration!`;
    setCustomMessage(professionalMsg);
    setSelectedTemplate("professional");
    setIsGreetingModalOpen(true);
  };

  // Update greeting template text
  const handleTemplateChange = (templateType) => {
    setSelectedTemplate(templateType);
    if (!greetingTarget) return;

    let text = "";
    if (templateType === "professional") {
      text = `Dear ${greetingTarget.name}, Insuredesk wishes you a very Happy Birthday! 🎂 May this special day bring you good health, happiness, and prosperity. Thank you for choosing us as your trusted partner. Have a wonderful celebration!`;
    } else if (templateType === "warm") {
      text = `Happy Birthday, ${greetingTarget.name}! 🎉🎈 Insuredesk wishes you a fantastic day and a wonderful year ahead filled with success and happiness. Hope you have a great celebration with family and friends! 🎂`;
    } else {
      text = `Happy Birthday ${greetingTarget.name}! 🎁 Insuredesk wishes you joy, peace, and prosperity on your special day. Have a blast! 🥳`;
    }
    setCustomMessage(text);
  };

  // Send WhatsApp greeting
  const handleSendGreeting = async () => {
    if (!greetingTarget || !customMessage) return;
    const cleanPhone = greetingTarget.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone}`;
    
    try {
      const res = await fetch("/api/operations/whatsapp/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, message: customMessage }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", `Birthday greeting sent successfully to ${greetingTarget.name}!`);
      } else {
        showToast("error", `Failed to send greeting: ${data.error || "Unknown error"}`);
      }
    } catch {
      showToast("error", "Failed to connect to the CRM WhatsApp API.");
    }
    setIsGreetingModalOpen(false);
  };

  // Send WhatsApp greetings to all customers whose birthday is today
  const handleSendAllBirthdays = async () => {
    setIsSendingAll(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/operations/birthday-management/send-all", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger birthday wishes.");
      
      if (data.queuedCount > 0) {
        setSuccessMessage(`Successfully queued and started sending ${data.queuedCount} birthday wish(es) in the background!`);
      } else {
        setError("No client birthdays detected for today.");
      }
    } catch (err) {
      setError(err.message || "Failed to send birthday wishes.");
    } finally {
      setIsSendingAll(false);
    }
  };

  // Get tab styles
  const getTabClass = (tabName) => {
    const base = "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 select-none h-8 border-0 shadow-none ";
    if (activeTab === tabName) {
      return base + "bg-white text-slate-900 shadow-sm font-semibold";
    }
    return base + "bg-transparent text-slate-650 hover:bg-white/40 hover:text-slate-800";
  };

  return (
    <div className="w-full text-slate-800 font-sans p-0">
      <div className="mb-4">
        <OperationsBackLink />
      </div>
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cake className="w-6 h-6 text-[#5b9bd5]" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Client Birthday Management
            </h1>
          </div>
          <p className="text-slate-500 text-xs">
            Monitor upcoming customer birthdays, send greeting messages via WhatsApp and Email, download templates, and import Excel sheets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-300 shadow-sm transition-all duration-200"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            Import Excel
          </button>
          
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-300 shadow-sm transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export Current List
          </button>

          <button
            onClick={handleSendAllBirthdays}
            disabled={isSendingAll || metrics.todayCount === 0}
            className="flex items-center gap-1.5 bg-[#ba1a1a] hover:bg-[#ba1a1a]/90 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border border-transparent shadow-sm transition-all duration-200"
          >
            {isSendingAll ? (
              <span className="w-3.5 h-3.5 rounded-full border border-white/20 border-t-white animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send Today's Birthdays ({metrics.todayCount})
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-2 text-emerald-700 shadow-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2 text-rose-700 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-250 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">Today's Birthdays</span>
            <span className="text-2xl font-extrabold text-pink-600">{metrics.todayCount}</span>
          </div>
          <div className="p-2 bg-pink-50 rounded-lg text-pink-500 border border-pink-100">
            <Cake className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-250 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">Next 30 Days</span>
            <span className="text-2xl font-extrabold text-[#5b9bd5]">{metrics.upcomingCount}</span>
          </div>
          <div className="p-2 bg-sky-50 rounded-lg text-[#5b9bd5] border border-sky-100">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-250 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">Missing Birthday</span>
            <span className="text-2xl font-extrabold text-amber-600">{metrics.missingCount}</span>
          </div>
          <div className="p-2 bg-amber-50 rounded-lg text-amber-500 border border-amber-100">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-250 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block mb-1">Total Tracked</span>
            <span className="text-2xl font-extrabold text-slate-800">{metrics.totalCount}</span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-655 border border-slate-150">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Filter and Table Workspace */}
      <div className="bg-white border border-slate-250 rounded-xl shadow-md overflow-hidden mb-6">
        {/* Workspace Toolbar */}
        <div className="p-4 border-b border-slate-250 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50">
          
          {/* Tabs Segmented Control */}
          <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1 border border-slate-200/60 w-fit">
            <button onClick={() => setActiveTab("all")} className={getTabClass("all")}>
              All Birthdays
            </button>
            <button onClick={() => setActiveTab("today")} className={getTabClass("today")}>
              Today
              {metrics.todayCount > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-all ${
                  activeTab === "today" ? "bg-pink-100 text-pink-700" : "bg-slate-200 text-slate-700"
                }`}>
                  {metrics.todayCount}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab("upcoming")} className={getTabClass("upcoming")}>
              Upcoming (30d)
              {metrics.upcomingCount > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-all ${
                  activeTab === "upcoming" ? "bg-sky-100 text-[#5b9bd5]" : "bg-slate-200 text-slate-700"
                }`}>
                  {metrics.upcomingCount}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab("missing")} className={getTabClass("missing")}>
              Missing Birthday
              {metrics.missingCount > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-all ${
                  activeTab === "missing" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                }`}>
                  {metrics.missingCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-405 hover:text-slate-650"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Birth Month Dropdown */}
            <div className="relative w-full sm:w-44">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-705 focus:outline-none focus:border-sky-500 appearance-none shadow-sm"
              >
                <option value="">All Birth Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>

        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white">
            <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-600 animate-spin mb-3" />
            <p className="text-slate-500 text-xs font-semibold">Loading client birthday records...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400 border border-slate-200">
              <Cake className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No Birthdays Found</h3>
            <p className="text-slate-500 text-xs max-w-sm">
              We couldn't find any clients matching the filters. Try refining your search, month, or import clients using Excel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-250">
                  <th className="py-4 px-4">Client Name</th>
                  <th className="py-4 px-4">Contact / Phone</th>
                  <th className="py-4 px-4">Email Address</th>
                  <th className="py-4 px-4">Date of Birth</th>
                  <th className="py-4 px-4 text-center">Age</th>
                  <th className="py-4 px-4">Next Birthday</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredProfiles.map((p) => {
                  const isToday = p.daysToBirthday === 0 || p.daysToBirthday === 365;
                  const isUpcoming = p.daysToBirthday !== null && p.daysToBirthday <= 30 && p.daysToBirthday > 0;
                  
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isToday ? "bg-pink-500/5" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-[13px]">
                          {p.name}
                          {isToday && (
                            <span className="bg-pink-500/10 text-pink-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border border-pink-200">
                              Today 🎂
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-600 text-[13px] flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4">
                        {p.email ? (
                          <div className="text-slate-655 text-[13px] flex items-center gap-1 hover:text-sky-600 transition-colors">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`mailto:${p.email}?subject=Happy Birthday!`}>{p.email}</a>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                      </td>

                      {/* Date of Birth / Edit Inline */}
                      <td className="py-3.5 px-4">
                        {editingId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="bg-white border border-slate-300 rounded text-[13px] text-slate-800 px-2 py-1 focus:outline-none focus:border-sky-500"
                            />
                            <button
                              onClick={() => handleSaveInlineDob(p.id)}
                              className="p-1 bg-white hover:bg-slate-50 text-emerald-750 rounded border border-slate-350 shadow-sm transition-colors"
                              title="Save DOB"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingId("")}
                              className="p-1 bg-white hover:bg-slate-50 text-slate-500 rounded border border-slate-300 shadow-sm transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group/dob text-[13px]">
                            <span className={p.dob ? "text-slate-700 font-semibold" : "text-amber-700 font-semibold italic text-xs"}>
                              {p.formattedDob}
                            </span>
                            <button
                              onClick={() => {
                                setEditingId(p.id);
                                setEditDate(p.dob || "");
                              }}
                              className="opacity-0 group-hover/dob:opacity-100 p-0.5 text-slate-400 hover:text-sky-600 transition-all rounded border border-slate-200 bg-white shadow-sm"
                              title="Edit date of birth"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Age */}
                      <td className="py-3.5 px-4 text-center">
                        {p.age !== null ? (
                          <span className="text-slate-800 font-bold text-[13px]">{p.age}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Next Birthday countdown */}
                      <td className="py-3.5 px-4">
                        {p.daysToBirthday !== null ? (
                          isToday ? (
                            <span className="inline-flex items-center bg-pink-500/10 text-pink-700 text-xs font-bold px-2 py-0.5 rounded border border-pink-200 shadow-sm">
                              Today! 🥳
                            </span>
                          ) : isUpcoming ? (
                            <span className="inline-flex items-center bg-sky-500/10 text-sky-700 text-xs font-bold px-2 py-0.5 rounded border border-sky-200 shadow-sm">
                              In {p.daysToBirthday} days 🎈
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[13px] font-semibold">
                              In {p.daysToBirthday} days
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(p.id);
                              setEditDate("");
                            }}
                            className="inline-flex items-center gap-0.5 text-[11px] bg-white text-amber-700 hover:bg-slate-50 px-2.5 py-1.5 rounded border border-slate-300 shadow-sm transition-all font-bold"
                          >
                            <Plus className="w-2.5 h-2.5 text-amber-600" /> Add DOB
                          </button>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenGreeting(p)}
                            disabled={!p.phone}
                            className="p-1.5 bg-white hover:bg-slate-50 text-pink-650 hover:text-pink-750 rounded-lg border border-slate-300 shadow-sm transition-all disabled:opacity-40"
                            title="Send Birthday Greeting via WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                          </button>
                          {p.email && (
                            <a
                              href={`mailto:${p.email}?subject=Happy%20Birthday!&body=Dear%20${p.name},%20Insuredesk%20wishes%20you%20a%20very%20Happy%2520Birthday!`}
                              className="p-1.5 bg-white hover:bg-slate-50 text-slate-655 hover:text-slate-800 rounded-lg border border-slate-300 shadow-sm transition-all"
                              title="Send Email"
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-600" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-250 flex justify-between items-center text-xs text-slate-500 font-semibold">
          <span>Showing {filteredProfiles.length} clients</span>
          <span>Click the pencil icon next to DOB to update birthdates inline.</span>
        </div>
      </div>

      {/* IMPORT EXCEL MODAL */}
      {isImportModalOpen && typeof window !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setIsImportModalOpen(false);
            setImportFile(null);
            setParsedRows([]);
            setImportResults(null);
          }}
        >
          <div 
            className="bg-white border border-slate-250 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn text-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-250 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <Image
                  src="/brand/main-logo-wide.webp"
                  alt="Bima Headquarter"
                  width={140}
                  height={78}
                  className="h-12 w-auto object-contain"
                />
                <div className="border-l border-slate-300 pl-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#5b9bd5]" />
                    Import Client Birthdays
                  </h2>
                  <p className="text-[10px] text-slate-500 leading-tight">Upload your XLSX/CSV spreadsheet to bulk import or update birthdays.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setParsedRows([]);
                  setImportResults(null);
                }}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-slate-400 hover:text-slate-650 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!importFile && (
                <div className="space-y-4">
                  {/* Instructions */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-255 space-y-2 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-800">How importing works:</h3>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
                      <li>The importer identifies clients based on their <strong>Phone Number</strong>.</li>
                      <li>If the phone number exists, it will update their <strong>Date of Birth</strong>, Name and Email.</li>
                      <li>If the phone number doesn't exist, it will create a <strong>new Customer Profile</strong>.</li>
                      <li>All imported phone numbers must be valid 10-digit Indian mobile numbers (starting with 6-9).</li>
                    </ul>
                    
                    <div className="pt-1">
                      <button
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-850 transition-all bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-600" />
                        Download Excel Import Template
                      </button>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-xl p-8 flex flex-col items-center justify-center text-center group cursor-pointer transition-colors bg-slate-50/20 hover:bg-slate-50/40">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 group-hover:text-[#5b9bd5] transition-colors mb-3 shadow-sm">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h4 className="text-slate-800 text-xs font-bold mb-0.5">Click to upload spreadsheet</h4>
                    <p className="text-slate-500 text-[10px]">Supports Excel (.xlsx, .xls) and CSV files</p>
                  </div>
                </div>
              )}

              {/* Parsing Loader */}
              {isParsing && (
                <div className="flex flex-col items-center justify-center py-10 bg-white">
                  <div className="w-8 h-8 border-2 border-[#5b9bd5]/25 border-t-[#5b9bd5] rounded-full animate-spin mb-3" />
                  <p className="text-slate-500 text-xs font-semibold">Parsing upload spreadsheet...</p>
                </div>
              )}

              {/* Step 2: Show parsed validation grid */}
              {importFile && parsedRows.length > 0 && !importResults && (
                <div className="space-y-4">
                  {/* File overview stats */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-250 text-xs shadow-sm">
                    <div>
                      File: <strong className="text-slate-800">{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)
                    </div>
                    <div className="flex gap-3">
                      <span className="font-bold text-emerald-700">
                        Ready: {parsedRows.filter(r => r.isValid).length}
                      </span>
                      <span className="font-bold text-rose-700">
                        Errors: {parsedRows.filter(r => !r.isValid).length}
                      </span>
                    </div>
                  </div>

                  {/* Validation Table */}
                  <div className="border border-slate-250 rounded-lg overflow-hidden max-h-[250px] overflow-y-auto bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-655 text-[9px] font-bold uppercase tracking-wider border-b border-slate-250">
                          <th className="py-2 px-3 text-center">Row</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">DOB</th>
                          <th className="py-2 px-3">Status / Issue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px] text-slate-700">
                        {parsedRows.map((row) => (
                          <tr key={row.index} className={row.isValid ? "bg-slate-50/10" : "bg-rose-500/5"}>
                            <td className="py-1.5 px-3 text-center text-slate-400 font-bold">{row.index}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-800">{row.name}</td>
                            <td className="py-1.5 px-3 text-slate-600">{row.phone}</td>
                            <td className="py-1.5 px-3 text-slate-500">{row.email || "-"}</td>
                            <td className="py-1.5 px-3 text-slate-600">{row.dob}</td>
                            <td className="py-1.5 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold" title={row.errorString}>
                                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" /> {row.errorString}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setParsedRows([]);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs px-3.5 py-2 rounded-lg border border-slate-300 shadow-sm transition-colors"
                    >
                      Clear File
                    </button>
                    
                    <button
                      onClick={handleConfirmImport}
                      disabled={isImporting || parsedRows.filter(r => r.isValid).length === 0}
                      className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-700 font-bold text-xs px-4 py-2 rounded-lg border border-slate-350 shadow-sm disabled:opacity-40 transition-colors"
                    >
                      {isImporting ? (
                        <div className="w-3 h-3 border-2 border-[#ba1a1a]/10 border-t-[#ba1a1a] rounded-full animate-spin" />
                      ) : null}
                      Import Valid Records ({parsedRows.filter(r => r.isValid).length})
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Success Results Output */}
              {importResults && (
                <div className="space-y-4 text-center py-6 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-655 flex items-center justify-center mx-auto border border-emerald-300 shadow-sm mb-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Import Completed!</h3>
                    <p className="text-slate-500 text-xs">
                      We have processed the spreadsheet files and updated the database records.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-250 shadow-sm">
                    <div>
                      <div className="text-2xl font-extrabold text-emerald-600">{importResults.createdCount}</div>
                      <div className="text-[10px] text-slate-550 font-bold uppercase tracking-wider mt-0.5">Created</div>
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold text-indigo-650">{importResults.updatedCount}</div>
                      <div className="text-[10px] text-slate-550 font-bold uppercase tracking-wider mt-0.5">Updated</div>
                    </div>
                  </div>

                  {importResults.errors && importResults.errors.length > 0 && (
                    <div className="text-left bg-rose-50 p-3 rounded-lg border border-rose-200 max-h-[120px] overflow-y-auto shadow-sm">
                      <div className="text-xs text-rose-750 font-bold mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Issues during import ({importResults.errors.length}):
                      </div>
                      <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-4 font-mono">
                        {importResults.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportFile(null);
                        setParsedRows([]);
                        setImportResults(null);
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-lg border border-slate-300 shadow-sm transition-colors"
                    >
                      Close Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* WHATSAPP GREETINGS MODAL */}
      {isGreetingModalOpen && greetingTarget && typeof window !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsGreetingModalOpen(false)}
        >
          <div 
            className="bg-white border border-slate-250 rounded-xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden animate-fadeIn text-slate-755"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-250 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <Image
                  src="/brand/main-logo-wide.webp"
                  alt="Bima Headquarter"
                  width={140}
                  height={78}
                  className="h-12 w-auto object-contain"
                />
                <div className="border-l border-slate-300 pl-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-pink-500" />
                    Send Birthday Wishes
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsGreetingModalOpen(false)}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-slate-400 hover:text-slate-650 transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 bg-white">
              {/* Client Info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-250 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold border border-pink-200">
                  {greetingTarget.name[0]}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 leading-tight">{greetingTarget.name}</div>
                  <div className="text-[10px] text-slate-500">{greetingTarget.phone}</div>
                </div>
              </div>

              {/* Template selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Message Style</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleTemplateChange("professional")}
                    className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border shadow-sm transition-all ${
                      selectedTemplate === "professional"
                        ? "bg-white border-2 border-pink-500 text-pink-700 scale-105"
                        : "bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Professional
                  </button>
                  <button
                    onClick={() => handleTemplateChange("warm")}
                    className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border shadow-sm transition-all ${
                      selectedTemplate === "warm"
                        ? "bg-white border-2 border-pink-500 text-pink-700 scale-105"
                        : "bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Warm
                  </button>
                  <button
                    onClick={() => handleTemplateChange("short")}
                    className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border shadow-sm transition-all ${
                      selectedTemplate === "short"
                        ? "bg-white border-2 border-pink-500 text-pink-700 scale-105"
                        : "bg-slate-50 border-slate-250 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Short
                  </button>
                </div>
              </div>

              {/* Message edit textarea */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Message Draft</label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 leading-normal resize-none shadow-sm"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendGreeting}
                className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-750 font-bold text-xs py-2.5 rounded-lg border border-slate-350 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5 text-sky-655" />
                Open WhatsApp Web & Send
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
