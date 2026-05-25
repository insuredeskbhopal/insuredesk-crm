"use client";

import { Bell, CalendarDays, Loader2, Settings, Activity, LogOut, FileText, FileCheck, FileX, FileWarning, Clock, Menu, X } from "lucide-react";
import SearchBox from "@/app/components/shared/SearchBox";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function TopBar({ query, onQueryChange, isSidebarOpen, onToggleSidebar }) {
  const pathname = usePathname();
  const isBulkActive = pathname === "/bulk-upload";
  const isReportsActive = pathname.startsWith("/analytics-reports");

  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [renewals, setRenewals] = useState([]);
  
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState({ name: "InsurCRM Admin", email: "admin@insuredesk.com" });

  const fetchHeaderData = async () => {
    try {
      const res = await fetch("/api/dashboard/header-data", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setRenewals(data.renewals || []);
        setNotifications(data.notifications || []);
        // Show notification badge if there are any notifications in the list
        if (data.notifications && data.notifications.length > 0) {
          setHasNotifications(true);
        } else {
          setHasNotifications(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch header data:", err);
    }
  };

  useEffect(() => {
    fetchHeaderData();
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setUser({
            name: data.user.name || data.user.email.split("@")[0],
            email: data.user.email
          });
        }
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowCalendar(false);
      setShowNotifications(false);
      setShowProfile(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const toggleCalendar = (e) => {
    e.stopPropagation();
    setShowCalendar(!showCalendar);
    setShowNotifications(false);
    setShowProfile(false);
    if (!showCalendar) {
      fetchHeaderData();
    }
  };

  const toggleNotifications = (e) => {
    e.stopPropagation();
    setShowNotifications(!showNotifications);
    setShowCalendar(false);
    setShowProfile(false);
    setHasNotifications(false);
    if (!showNotifications) {
      fetchHeaderData();
    }
  };

  const toggleProfile = (e) => {
    e.stopPropagation();
    setShowProfile(!showProfile);
    setShowCalendar(false);
    setShowNotifications(false);
  };

  const runDiagnostics = async () => {
    setShowProfile(false);
    setShowDiagnosticsModal(true);
    setLoadingDiagnostics(true);
    setDiagnosticsData(null);
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      const data = await res.json();
      setDiagnosticsData(data);
    } catch (err) {
      setDiagnosticsData({ success: false, error: "Network or Server error occurred" });
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const getRenewalSubtitle = (r) => {
    if (r.isExpired) {
      const days = Math.abs(r.daysRemaining);
      return `Expired ${days} day${days > 1 ? "s" : ""} ago (${r.formattedExpiry})`;
    } else {
      const days = r.daysRemaining;
      if (days === 0) return `Expires today! (${r.formattedExpiry})`;
      return `Renewal on ${r.formattedExpiry} (in ${days} day${days > 1 ? "s" : ""})`;
    }
  };

  const getNotificationIcon = (type) => {
    const iconSize = 16;
    switch (type) {
      case "success":
        return <FileCheck size={iconSize} style={{ color: "#2e7d32" }} />;
      case "error":
        return <FileX size={iconSize} style={{ color: "#c62828" }} />;
      case "warning":
        return <FileWarning size={iconSize} style={{ color: "#ef6c00" }} />;
      case "progress":
        return <Loader2 size={iconSize} className="spin" style={{ color: "#1976d2" }} />;
      default:
        return <FileText size={iconSize} style={{ color: "var(--outline)" }} />;
    }
  };

  const dropdownStyle = {
    position: "absolute" as const,
    top: "46px",
    right: "0px",
    width: "320px",
    backgroundColor: "#ffffff",
    border: "1px solid rgba(196, 198, 207, 0.5)",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(25, 28, 29, 0.08)",
    padding: "16px",
    zIndex: 100,
    animation: "page-in 200ms ease-out"
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "IC";

  return (
    <header className="top-bar">
      <div className="top-brand">
        <button 
          className="sidebar-toggle" 
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
          style={{
            border: "none",
            background: "none",
            padding: "4px",
            marginRight: "4px",
            cursor: "pointer",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "none"
          }}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <strong>InsurCRM</strong>
        <nav>
          <Link className={isReportsActive ? "active" : ""} href="/analytics-reports">
            Reports
          </Link>
          <Link className={isBulkActive ? "active" : ""} href="/bulk-upload">
            Bulk PDF Upload
          </Link>
        </nav>
      </div>

      <div className="top-actions">
        <SearchBox className="global-search" value={query} placeholder="Search policies..." onChange={(event) => onQueryChange(event.target.value)} />
        
        {/* Calendar */}
        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button className="icon-button" type="button" aria-label="Calendar" onClick={toggleCalendar}>
            <CalendarDays size={19} />
          </button>
          {showCalendar && (
            <div style={dropdownStyle}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>Upcoming Renewals</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
                {renewals.length ? (
                  renewals.map((r) => (
                    <Link 
                      key={r.id} 
                      href={`/customer-management/${encodeURIComponent(r.insuredName)}/policy/${r.id}`}
                      onClick={() => setShowCalendar(false)}
                      style={{ 
                        display: "block",
                        textDecoration: "none",
                        fontSize: "12px", 
                        padding: "10px", 
                        borderRadius: "8px", 
                        backgroundColor: "#f8f9fa", 
                        borderLeft: `4px solid ${r.isExpired ? "#c62828" : r.daysRemaining === 0 ? "#ef6c00" : r.daysRemaining <= 30 ? "#1976d2" : "#2e7d32"}`, 
                        color: "var(--primary)",
                        transition: "background 0.2s, transform 0.2s"
                      }}
                      onMouseEnter={(e) => { 
                        const el = e.currentTarget;
                        el.style.backgroundColor = "#f0f2f5";
                        el.style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => { 
                        const el = e.currentTarget;
                        el.style.backgroundColor = "#f8f9fa";
                        el.style.transform = "translateX(0)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
                        <strong style={{ fontWeight: 600 }}>{r.company}</strong>
                        <span style={{ 
                          fontSize: "9px", 
                          padding: "1px 5px", 
                          borderRadius: "10px", 
                          backgroundColor: r.isExpired ? "rgba(198, 40, 40, 0.12)" : "rgba(46, 125, 50, 0.12)",
                          color: r.isExpired ? "#c62828" : "#2e7d32",
                          fontWeight: 700
                        }}>
                          {r.policyType}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0 0", color: "var(--on-surface-variant)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} style={{ color: "var(--outline)" }} />
                        <span>{getRenewalSubtitle(r)}</span>
                      </p>
                      <small style={{ color: "var(--outline)", fontSize: "10px", display: "block", marginTop: "4px" }}>Client: {r.insuredName}</small>
                    </Link>
                  ))
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--outline)", margin: 0, textAlign: "center", padding: "20px 0" }}>No renewal records found.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button className={hasNotifications ? "icon-button has-dot" : "icon-button"} type="button" aria-label="Notifications" onClick={toggleNotifications}>
            <Bell size={19} />
          </button>
          {showNotifications && (
            <div style={dropdownStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>Recent Activity</h4>
                <button 
                  type="button" 
                  onClick={() => {
                    setNotifications([]);
                    setHasNotifications(false);
                    setToast("Cleared recent activity log");
                  }} 
                  style={{ border: "none", background: "none", fontSize: "11px", color: "var(--outline)", cursor: "pointer", padding: 0, minHeight: "auto", boxShadow: "none" }}
                >
                  Clear all
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
                {notifications.length ? (
                  notifications.map((n) => {
                    const href = n.recordId && n.clientName 
                      ? `/customer-management/${encodeURIComponent(n.clientName)}/policy/${n.recordId}`
                      : "/upload-history";
                    
                    return (
                      <Link 
                        key={n.id} 
                        href={href}
                        onClick={() => setShowNotifications(false)}
                        style={{ 
                          fontSize: "12px", 
                          display: "flex", 
                          gap: "10px",
                          textDecoration: "none",
                          padding: "8px",
                          borderRadius: "8px",
                          transition: "background 0.2s",
                          color: "inherit"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8f9fa"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <span style={{ display: "flex", alignItems: "center" }}>{getNotificationIcon(n.type)}</span>
                        <div>
                          <p style={{ margin: 0, color: "var(--primary)", fontWeight: 500 }}>{n.text}</p>
                          <small style={{ color: "var(--outline)" }}>{n.time}</small>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--outline)", margin: 0, textAlign: "center", padding: "20px 0" }}>No new activity logs.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <div className="avatar" style={{ cursor: "pointer", userSelect: "none" }} onClick={toggleProfile}>{initials}</div>
          {showProfile && (
            <div style={{ ...dropdownStyle, right: 0 }}>
              <div style={{ borderBottom: "1px solid rgba(196, 198, 207, 0.4)", paddingBottom: "10px", marginBottom: "10px" }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>{user.name}</p>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--outline)" }}>{user.email}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <Link 
                  href="/settings" 
                  style={{ 
                    fontSize: "12px", 
                    padding: "6px 8px", 
                    borderRadius: "6px", 
                    color: "var(--primary)", 
                    transition: "background 0.2s", 
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = "#f8f9fa"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = "transparent"; }}
                  onClick={() => setShowProfile(false)}
                >
                  <Settings size={14} style={{ color: "var(--outline)" }} />
                  <span>Profile Settings</span>
                </Link>
                <button 
                  type="button" 
                  onClick={runDiagnostics}
                  style={{ 
                    justifyContent: "flex-start", 
                    fontSize: "12px", 
                    border: "none", 
                    background: "none", 
                    padding: "6px 8px", 
                    borderRadius: "6px", 
                    color: "var(--primary)", 
                    cursor: "pointer", 
                    width: "100%", 
                    minHeight: "auto", 
                    boxShadow: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = "#f8f9fa"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <Activity size={14} style={{ color: "var(--outline)" }} />
                  <span>Diagnostics</span>
                </button>
                <button 
                  type="button" 
                  onClick={async () => { 
                    setToast("Logging out...");
                    try {
                      await fetch("/api/auth/logout", { method: "POST" });
                      setToast("Logged out successfully. Redirecting...");
                      setTimeout(() => {
                        window.location.href = "/login";
                      }, 1000);
                    } catch (err) {
                      setToast("Failed to log out. Reloading...");
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    }
                    setShowProfile(false); 
                  }}
                  style={{ 
                    justifyContent: "flex-start", 
                    fontSize: "12px", 
                    border: "none", 
                    background: "none", 
                    padding: "6px 8px", 
                    borderRadius: "6px", 
                    color: "#c62828", 
                    cursor: "pointer", 
                    width: "100%", 
                    minHeight: "auto", 
                    boxShadow: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = "rgba(224, 80, 80, 0.08)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <LogOut size={14} style={{ color: "#c62828" }} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics Modal */}
      {showDiagnosticsModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(25, 28, 29, 0.4)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}
          onClick={() => setShowDiagnosticsModal(false)}
        >
          <div 
            style={{
              width: "480px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              position: "relative",
              color: "var(--primary, #191c1d)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(196, 198, 207, 0.4)", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "var(--primary)", fontSize: "16px", fontWeight: 700 }}>🔍 System Diagnostics</h3>
              <button 
                type="button" 
                onClick={() => setShowDiagnosticsModal(false)}
                style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "var(--outline)", padding: 0, minHeight: "auto", boxShadow: "none" }}
              >
                ✕
              </button>
            </div>
            
            {loadingDiagnostics ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 0" }}>
                <Loader2 className="spin" size={32} style={{ color: "var(--primary)" }} />
                <p style={{ margin: 0, fontSize: "12px", color: "var(--outline)" }}>Running health checks and measuring query latency...</p>
              </div>
            ) : diagnosticsData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", backgroundColor: diagnosticsData.success ? "rgba(46, 125, 50, 0.08)" : "rgba(198, 40, 40, 0.08)" }}>
                  <span style={{ fontSize: "20px" }}>{diagnosticsData.success ? "🟢" : "🔴"}</span>
                  <div>
                    <strong style={{ fontSize: "13px", color: diagnosticsData.success ? "#2e7d32" : "#c62828" }}>
                      System Status: {diagnosticsData.status}
                    </strong>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--outline)" }}>Database latency: {diagnosticsData.latency || "N/A"}</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "10px", color: "var(--outline)", textTransform: "uppercase", fontWeight: 600 }}>Neon Database</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>{diagnosticsData.database}</p>
                  </div>
                  <div style={{ backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "10px", color: "var(--outline)", textTransform: "uppercase", fontWeight: 600 }}>ORM Layer</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>{diagnosticsData.orm}</p>
                  </div>
                </div>

                {diagnosticsData.success && (
                  <div style={{ border: "1px solid rgba(196, 198, 207, 0.3)", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ backgroundColor: "#f8f9fa", padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid rgba(196, 198, 207, 0.3)" }}>
                      Database Record Counts
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", padding: "6px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(196, 198, 207, 0.15)", fontSize: "12px" }}>
                        <span>Policy Records</span>
                        <strong>{diagnosticsData.counts?.policyRecords ?? 0}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(196, 198, 207, 0.15)", fontSize: "12px" }}>
                        <span>Ingested Uploads</span>
                        <strong>{diagnosticsData.counts?.uploadedFiles ?? 0}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(196, 198, 207, 0.15)", fontSize: "12px" }}>
                        <span>Insurance Companies</span>
                        <strong>{diagnosticsData.counts?.companies ?? 0}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(196, 198, 207, 0.15)", fontSize: "12px" }}>
                        <span>Policy Schemas</span>
                        <strong>{diagnosticsData.counts?.schemas ?? 0}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12px" }}>
                        <span>Bank Sources</span>
                        <strong>{diagnosticsData.counts?.banks ?? 0}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {!diagnosticsData.success && (
                  <div style={{ backgroundColor: "rgba(198, 40, 40, 0.08)", padding: "10px", borderRadius: "8px", fontSize: "12px", color: "#c62828" }}>
                    Error: {diagnosticsData.error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "8px", fontSize: "11px", color: "var(--outline)" }}>
                  <div>Node Environment: <strong>{diagnosticsData.env?.nextEnv || "production"}</strong></div>
                  <div>Node Version: <strong>{diagnosticsData.env?.nodeVersion || "N/A"}</strong></div>
                  <div>Platform: <strong>{diagnosticsData.env?.platform || "N/A"}</strong></div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: "red" }}>Failed to retrieve diagnostics data.</p>
            )}

            <button 
              type="button" 
              onClick={() => setShowDiagnosticsModal(false)}
              style={{
                backgroundColor: "var(--primary, #191c1d)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast ? (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "var(--primary, #191c1d)",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px"
        }}>
          <span>{toast}</span>
          <button 
            type="button" 
            onClick={() => setToast("")}
            style={{ border: "none", background: "none", color: "#ffffff", cursor: "pointer", padding: 0, minHeight: "auto", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      ) : null}
    </header>
  );
}


