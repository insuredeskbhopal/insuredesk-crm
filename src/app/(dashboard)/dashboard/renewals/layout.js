"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  Users,
  Building2,
  FolderOpen,
  PhoneCall,
  CheckCircle2,
  XOctagon,
  BarChart3,
  Upload,
  UploadCloud,
} from "lucide-react";
import "@/app/ui/renewals-redesign.css";

export default function RenewalsLayout({ children }) {
  const pathname = usePathname();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const navItems = [
    { label: "Dashboard", href: "/dashboard/renewals", icon: LayoutDashboard },
    { label: "Daily Work", href: "/dashboard/renewals/daily-work", icon: CalendarCheck },
    { label: "Renewal", href: "/dashboard/renewals/policies", icon: ClipboardList },
    { label: "Customer Renewals", href: "/dashboard/renewals/customers", icon: Users },
    { label: "Companies", href: "/dashboard/renewals/companies", icon: Building2 },
    { label: "Policy Types", href: "/dashboard/renewals/policy-types", icon: FolderOpen },
    { label: "Follow-Ups", href: "/dashboard/renewals/follow-ups", icon: PhoneCall },
    { label: "Renewed", href: "/dashboard/renewals/renewed", icon: CheckCircle2 },
    { label: "Lost", href: "/dashboard/renewals/lost", icon: XOctagon },
    { label: "Reports", href: "/dashboard/renewals/reports", icon: BarChart3 },
  ];

  const getActiveHref = () => {
    if (pathname.startsWith("/dashboard/renewals/customers")) {
      return "/dashboard/renewals/customers";
    }
    if (pathname.startsWith("/dashboard/renewals/policies")) {
      return "/dashboard/renewals/policies";
    }
    if (pathname.startsWith("/dashboard/renewals/daily-work")) {
      return "/dashboard/renewals/daily-work";
    }
    if (pathname.startsWith("/dashboard/renewals/companies")) {
      return "/dashboard/renewals/companies";
    }
    if (pathname.startsWith("/dashboard/renewals/policy-types")) {
      return "/dashboard/renewals/policy-types";
    }
    if (pathname.startsWith("/dashboard/renewals/follow-ups")) {
      return "/dashboard/renewals/follow-ups";
    }
    if (pathname.startsWith("/dashboard/renewals/renewed")) {
      return "/dashboard/renewals/renewed";
    }
    if (pathname.startsWith("/dashboard/renewals/lost")) {
      return "/dashboard/renewals/lost";
    }
    if (pathname.startsWith("/dashboard/renewals/reports")) {
      return "/dashboard/renewals/reports";
    }
    return "/dashboard/renewals";
  };

  const activeHref = getActiveHref();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
      setUploadSuccess("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/renewals/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to import renewals.");
      }

      setUploadSuccess(result.message);
      setSelectedFile(null);
      setTimeout(() => {
        setShowImportModal(false);
        setUploadSuccess("");
        window.location.reload();
      }, 1500);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="renewals-container">
      {/* Header section */}
      <div className="renewals-header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="renewals-header-title">Renewal Operations Hub</h1>
          <p className="renewals-header-subtitle">
            Manage policies in their renewal window, track agent work, and monitor customer retention.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="renewals-nav-link"
            style={{
              backgroundColor: "#ffffff",
              color: "var(--rn-text-secondary)",
              borderColor: "var(--rn-border)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Upload size={16} /> Import Excel
          </button>
        </div>
      </div>

      {/* Horizontal Sub-Navigation pills */}
      <nav className="renewals-subnav" aria-label="Renewals navigation">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`renewals-nav-link ${isActive ? "active" : ""}`}
            >
              <IconComponent size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Main page content area */}
      <div className="renewals-content-pane">{children}</div>

      {/* Bulk Import Modal */}
      {showImportModal && typeof window !== "undefined" && createPortal(
        <div className="tb-modal-backdrop" onClick={() => !importing && setShowImportModal(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "540px", padding: "28px", borderRadius: "16px" }}>
            <div className="tb-modal-header" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--rn-border-light)",
              paddingBottom: "16px",
              marginBottom: "20px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <Image
                  src="/brand/main-logo-wide.webp"
                  alt="Bima Headquarter"
                  width={1024}
                  height={570}
                  style={{ height: "36px", width: "auto" }}
                />
                <div style={{ width: "1px", height: "30px", backgroundColor: "#e5e7eb" }} />
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "600", color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Bulk Import
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                    Renewals
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !importing && setShowImportModal(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#f3f4f6",
                  border: "none",
                  color: "#4b5563",
                  fontSize: "18px",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
              >
                &times;
              </button>
            </div>
            <div className="tb-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "14px", color: "var(--rn-text-secondary)", margin: 0, lineHeight: "1.5" }}>
                Upload your filled renewal Excel spreadsheet to bulk import records. All sheets (Motor, Non-Motor, Generic) in the workbook will be processed.
              </p>
              
              <div style={{
                border: "2px dashed var(--rn-border)",
                borderRadius: "8px",
                padding: "32px 24px",
                textAlign: "center",
                backgroundColor: "var(--rn-border-light)",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease"
              }}>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer"
                  }}
                  disabled={importing}
                />
                <UploadCloud size={36} style={{ color: "var(--rn-text-secondary)", marginBottom: "12px", marginLeft: "auto", marginRight: "auto" }} />
                <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--rn-text-primary)", margin: "0 0 4px 0" }}>
                  {selectedFile ? selectedFile.name : "Click or drag Excel template here"}
                </p>
                <p style={{ fontSize: "12px", color: "var(--rn-text-muted)", margin: 0 }}>
                  Supports Excel (.xlsx, .xls) files
                </p>
              </div>

              {uploadError && (
                <div style={{ padding: "12px", borderRadius: "6px", backgroundColor: "var(--rn-danger-light)", border: "1px solid var(--rn-danger)", display: "flex", gap: "8px", alignItems: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--rn-danger)", margin: 0, fontWeight: "500" }}>
                    ⚠️ {uploadError}
                  </p>
                </div>
              )}
              
              {uploadSuccess && (
                <div style={{ padding: "12px", borderRadius: "6px", backgroundColor: "var(--rn-success-light)", border: "1px solid var(--rn-success)", display: "flex", gap: "8px", alignItems: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--rn-success)", margin: 0, fontWeight: "500" }}>
                    ✅ {uploadSuccess}
                  </p>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "20px", borderTop: "1px solid var(--rn-border-light)", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setUploadError("");
                  setUploadSuccess("");
                  setSelectedFile(null);
                }}
                className="tb-modal-done-btn"
                style={{ background: "#ffffff", color: "#374151", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}
                disabled={importing}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleUpload}
                style={{ background: "var(--rn-primary)", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyItems: "center" }}
                disabled={!selectedFile || importing}
              >
                {importing ? "Importing..." : "Start Import"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
