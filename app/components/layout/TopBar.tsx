"use client";

import { Bell, CalendarDays, Loader2, Settings, Activity, LogOut, FileText, FileCheck, FileX, FileWarning, Clock, Menu } from "lucide-react";
import SearchBox from "@/app/components/shared/SearchBox";
import BrandLogo from "@/app/components/brand/BrandLogo";
import InsurerLogo from "@/app/components/brand/InsurerLogo";
import { cachedJson } from "@/app/lib/client-api";
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [user, setUser] = useState({ name: "BIMAHEADQUARTER Admin", email: "admin@bimaheadquarter.com" });

  const fetchHeaderData = async () => {
    try {
      const data = await cachedJson("/api/dashboard/header-data", {
        ttlMs: 5000,
        fetchOptions: { cache: "no-store" }
      });
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
        const data = await cachedJson("/api/auth/me", { ttlMs: 10000 });
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
        return <FileCheck size={iconSize} className="icon-success" />;
      case "error":
        return <FileX size={iconSize} className="icon-error" />;
      case "warning":
        return <FileWarning size={iconSize} className="icon-warning" />;
      case "progress":
        return <Loader2 size={iconSize} className="spin icon-progress" />;
      default:
        return <FileText size={iconSize} className="icon-default" />;
    }
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "BH";

  return (
    <header className="top-bar">
      <div className="top-brand">
        <button 
          className="sidebar-toggle" 
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>
        <BrandLogo href="/dashboard" />
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
        <div className="tb-action-wrapper" onClick={(e) => e.stopPropagation()}>
          <button className="icon-button" type="button" aria-label="Calendar" onClick={toggleCalendar}>
            <CalendarDays size={19} />
          </button>
          {showCalendar && (
            <div className="tb-dropdown">
              <h4 className="tb-dropdown-title">Upcoming Renewals</h4>
              <div className="tb-dropdown-list">
                {renewals.length ? (
                  renewals.map((r) => (
                    <Link 
                      key={r.id} 
                      href={`/customer-management/${encodeURIComponent(r.insuredName)}/policy/${r.id}`}
                      onClick={() => setShowCalendar(false)}
                      className={`tb-renewal-item ${
                        r.isExpired 
                          ? "border-expired" 
                          : r.daysRemaining === 0 
                            ? "border-today" 
                            : r.daysRemaining <= 30 
                              ? "border-soon" 
                              : "border-active"
                      }`}
                    >
                      <div className="tb-item-header">
                        <strong className="tb-item-strong"><InsurerLogo company={r.company} /></strong>
                        <span 
                          className={`tb-item-badge ${r.isExpired ? "badge-expired" : "badge-active"}`}
                        >
                          {r.policyType}
                        </span>
                      </div>
                      <p className="tb-item-text">
                        <Clock size={12} className="icon-default" />
                        <span>{getRenewalSubtitle(r)}</span>
                      </p>
                      <small className="tb-item-small">Client: {r.insuredName}</small>
                    </Link>
                  ))
                ) : (
                  <p className="tb-empty-text">No renewal records found.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="tb-action-wrapper" onClick={(e) => e.stopPropagation()}>
          <button className={hasNotifications ? "icon-button has-dot" : "icon-button"} type="button" aria-label="Notifications" onClick={toggleNotifications}>
            <Bell size={19} />
          </button>
          {showNotifications && (
            <div className="tb-dropdown">
              <div className="tb-item-header tb-notif-header">
                <h4 className="tb-dropdown-title tb-m-0">Recent Activity</h4>
                <button 
                  type="button" 
                  onClick={() => {
                    setNotifications([]);
                    setHasNotifications(false);
                    setToast("Cleared recent activity log");
                  }} 
                  className="tb-clear-btn"
                >
                  Clear all
                </button>
              </div>
              <div className="tb-dropdown-list">
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
                        className="tb-notif-item"
                      >
                        <span className="tb-notif-icon-wrap">{getNotificationIcon(n.type)}</span>
                        <div>
                          <p className="tb-notif-text">{n.text}</p>
                          <small className="tb-notif-time">{n.time}</small>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="tb-empty-text">No new activity logs.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="tb-action-wrapper" onClick={(e) => e.stopPropagation()}>
          <div className="avatar" onClick={toggleProfile}>{initials}</div>
          {showProfile && (
            <div className="tb-dropdown">
              <div className="tb-profile-info">
                <p>{user.name}</p>
                <p>{user.email}</p>
              </div>
              <div className="tb-profile-actions">
                <Link 
                  href="/settings" 
                  className="tb-profile-btn"
                  onClick={() => setShowProfile(false)}
                >
                  <Settings size={14} className="icon-default" />
                  <span>Profile Settings</span>
                </Link>
                <button 
                  type="button" 
                  onClick={runDiagnostics}
                  className="tb-profile-btn"
                >
                  <Activity size={14} className="icon-default" />
                  <span>Diagnostics</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowLogoutModal(true)}
                  className="tb-profile-btn tb-logout-btn"
                >
                  <LogOut size={14} className="icon-error" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics Modal */}
      {showDiagnosticsModal && (
        <div className="tb-modal-backdrop" onClick={() => setShowDiagnosticsModal(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tb-modal-header">
              <h3 className="tb-status-title tb-modal-title">🔍 System Diagnostics</h3>
            </div>
            
            {loadingDiagnostics ? (
              <div className="tb-modal-loading">
                <Loader2 className="spin" size={32} />
                <p className="tb-status-desc">Running health checks and measuring query latency...</p>
              </div>
            ) : diagnosticsData ? (
              <div className="tb-modal-body">
                <div 
                  className={`tb-status-block ${diagnosticsData.success ? "success" : "error"}`}
                >
                  <span className="tb-status-icon">{diagnosticsData.success ? "🟢" : "🔴"}</span>
                  <div>
                    <strong 
                      className={`tb-status-title ${diagnosticsData.success ? "status-success" : "status-error"}`}
                    >
                      System Status: {diagnosticsData.status}
                    </strong>
                    <p className="tb-status-desc">Database latency: {diagnosticsData.latency || "N/A"}</p>
                  </div>
                </div>

                <div className="tb-env-grid">
                  <div className="tb-env-card">
                    <span className="tb-env-label">Neon Database</span>
                    <p className="tb-env-value">{diagnosticsData.database}</p>
                  </div>
                  <div className="tb-env-card">
                    <span className="tb-env-label">ORM Layer</span>
                    <p className="tb-env-value">{diagnosticsData.orm}</p>
                  </div>
                </div>

                {diagnosticsData.success && (
                  <div className="tb-counts-table">
                    <div className="tb-counts-header">
                      Database Record Counts
                    </div>
                    <div className="tb-counts-body">
                      <div className="tb-counts-row">
                        <span>Policy Records</span>
                        <strong>{diagnosticsData.counts?.policyRecords ?? 0}</strong>
                      </div>
                      <div className="tb-counts-row">
                        <span>Ingested Uploads</span>
                        <strong>{diagnosticsData.counts?.uploadedFiles ?? 0}</strong>
                      </div>
                      <div className="tb-counts-row">
                        <span>Insurance Companies</span>
                        <strong>{diagnosticsData.counts?.companies ?? 0}</strong>
                      </div>
                      <div className="tb-counts-row">
                        <span>Policy Schemas</span>
                        <strong>{diagnosticsData.counts?.schemas ?? 0}</strong>
                      </div>
                      <div className="tb-counts-row">
                        <span>Bank Sources</span>
                        <strong>{diagnosticsData.counts?.banks ?? 0}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {!diagnosticsData.success && (
                  <div className="tb-error-block">
                    Error: {diagnosticsData.error}
                  </div>
                )}

                <div className="tb-env-meta">
                  <div>Node Environment: <strong>{diagnosticsData.env?.nextEnv || "production"}</strong></div>
                  <div>Node Version: <strong>{diagnosticsData.env?.nodeVersion || "N/A"}</strong></div>
                  <div>Platform: <strong>{diagnosticsData.env?.platform || "N/A"}</strong></div>
                </div>
              </div>
            ) : (
              <p className="tb-status-desc tb-desc-error">Failed to retrieve diagnostics data.</p>
            )}

            <button 
              type="button" 
              onClick={() => setShowDiagnosticsModal(false)}
              className="tb-modal-done-btn"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="tb-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="tb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tb-modal-header">
              <h3 className="tb-status-title tb-modal-title">Confirm Logout</h3>
            </div>
            <div className="tb-modal-body">
              <p className="tb-status-desc">Are you sure you want to log out of your BIMAHEADQUARTER account?</p>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "16px" }}>
              <button 
                type="button" 
                onClick={() => setShowLogoutModal(false)}
                className="tb-modal-done-btn"
                style={{ background: "#f0f0f0", color: "#333" }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={async () => { 
                  setShowLogoutModal(false);
                  setShowProfile(false);
                  setToast("Logging out...");
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setToast("Logged out successfully. Redirecting...");
                    setTimeout(() => {
                      window.location.href = "/crm/admin/login";
                    }, 1000);
                  } catch (err) {
                    setToast("Failed to log out. Please try again.");
                  }
                }}
                className="tb-modal-done-btn"
                style={{ background: "#dc2626", color: "white" }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast ? (
        <div className="tb-toast">
          <span>{toast}</span>
          <button 
            type="button" 
            onClick={() => setToast("")}
            className="tb-toast-close"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </header>
  );
}
