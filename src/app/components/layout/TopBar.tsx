"use client";

import {
  Bell,
  CalendarDays,
  Loader2,
  Settings,
  Activity,
  LogOut,
  FileText,
  FileCheck,
  FileX,
  FileWarning,
  Clock,
  Menu,
} from "lucide-react";
import SearchBox from "@/app/components/shared/SearchBox";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { cachedJson } from "@/app/lib/client-api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function TopBar({ query, onQueryChange, isSidebarOpen, onToggleSidebar }) {
  const pathname = usePathname();
  const isBulkActive = pathname === "/bulk-upload";
  const isReportsActive =
    pathname.startsWith("/analytics-reports") || pathname.startsWith("/dashboard/reports");

  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("general");

  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [toast, setToast] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [user, setUser] = useState({ id: "", name: "BIMAHEADQUARTER Admin", email: "admin@bimaheadquarter.com" });

  const fetchHeaderData = async () => {
    try {
      const [workData, notificationData] = await Promise.all([
        cachedJson("/api/work-center", {
          ttlMs: 5000,
          fetchOptions: { cache: "no-store" },
        }),
        cachedJson("/api/notifications?limit=10", {
          ttlMs: 5000,
          fetchOptions: { cache: "no-store" },
        }),
      ]);
      if (workData.success) {
        const tasks = workData.tasks || [];
        setCalendarTasks(tasks.slice(0, 10));
      }
      if (notificationData.success) {
        setNotifications(notificationData.notifications || []);
        setUnreadCount(notificationData.unreadCount || 0);
        setHasNotifications((notificationData.unreadCount || 0) > 0);
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
            id: data.user.id,
            name: data.user.name || data.user.email.split("@")[0],
            email: data.user.email,
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

  const getTaskSubtitle = (task) => {
    if (!task.dueAt) return task.module;
    const due = new Date(task.dueAt);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const days = Math.round((dueStart.getTime() - todayStart.getTime()) / 86400000);
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
    if (days === 0)
      return `Due today at ${due.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    return `Due in ${days} day${days === 1 ? "" : "s"}`;
  };

  const getNotificationIcon = (type) => {
    const iconSize = 16;
    switch (type) {
      case "success":
      case "SUCCESS":
        return <FileCheck size={iconSize} className="icon-success" />;
      case "error":
      case "CRITICAL":
        return <FileX size={iconSize} className="icon-error" />;
      case "warning":
      case "WARNING":
        return <FileWarning size={iconSize} className="icon-warning" />;
      case "progress":
        return <Loader2 size={iconSize} className="spin icon-progress" />;
      default:
        return <FileText size={iconSize} className="icon-default" />;
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
      setHasNotifications(false);
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "BH";

  return (
    <header className="top-bar">
      <div className="top-brand">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle Navigation">
          <Menu size={20} />
        </button>
        <BrandLogo href="/dashboard" />
        <nav>
          <Link className={isReportsActive ? "active" : ""} href="/dashboard/reports">
            Reports
          </Link>
          <Link className={isBulkActive ? "active" : ""} href="/bulk-upload">
            Bulk PDF Upload
          </Link>
        </nav>
      </div>

      <div className="top-actions">
        <SearchBox
          className="global-search"
          value={query}
          placeholder="Search policies..."
          onChange={(event) => onQueryChange(event.target.value)}
        />

        {/* Calendar */}
        <div className="tb-action-wrapper" onClick={(e) => e.stopPropagation()}>
          <button className="icon-button" type="button" aria-label="Calendar" onClick={toggleCalendar}>
            <CalendarDays size={19} />
          </button>
          {showCalendar && (
            <div className="tb-dropdown">
              <div className="tb-item-header tb-notif-header">
                <h4 className="tb-dropdown-title tb-m-0">Today's Work</h4>
                <Link href="/work-center" onClick={() => setShowCalendar(false)} className="tb-clear-btn">
                  View all
                </Link>
              </div>
              <div className="tb-dropdown-list">
                {calendarTasks.length ? (
                  calendarTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={task.metadata?.actionUrl || "/work-center"}
                      onClick={() => setShowCalendar(false)}
                      className={`tb-renewal-item ${task.priority === "CRITICAL" || task.priority === "EMERGENCY" ? "border-expired" : task.priority === "HIGH" ? "border-soon" : "border-active"}`}
                    >
                      <div className="tb-item-header">
                        <strong className="tb-item-strong">{task.title}</strong>
                        <span
                          className={`tb-item-badge ${task.priority === "CRITICAL" || task.priority === "EMERGENCY" ? "badge-expired" : "badge-active"}`}
                        >
                          {task.type.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="tb-item-text">
                        <Clock size={12} className="icon-default" />
                        <span>{getTaskSubtitle(task)}</span>
                      </p>
                      <small className="tb-item-small">{task.customerName || task.module}</small>
                    </Link>
                  ))
                ) : (
                  <p className="tb-empty-text">No open tasks found.</p>
                )}
              </div>
              <div className="tb-dropdown-actions">
                <Link href="/work-center" onClick={() => setShowCalendar(false)}>
                  Add Task
                </Link>
                <Link href="/work-center" onClick={() => setShowCalendar(false)}>
                  Open Calendar
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="tb-action-wrapper" onClick={(e) => e.stopPropagation()}>
          <button
            className={hasNotifications ? "icon-button has-dot" : "icon-button"}
            type="button"
            aria-label="Notifications"
            onClick={toggleNotifications}
          >
            <Bell size={19} />
          </button>
              {showNotifications && (() => {
                const generalNotifs = notifications.filter((n) => !n.userId);
                const personalNotifs = notifications.filter((n) => n.userId);
                const displayedNotifs = activeTab === "general" ? generalNotifs : personalNotifs;
                const generalUnread = generalNotifs.filter((n) => !n.read).length;
                const personalUnread = personalNotifs.filter((n) => !n.read).length;

                return (
                  <div className="tb-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="tb-item-header tb-notif-header">
                      <h4 className="tb-dropdown-title tb-m-0">Recent Activity</h4>
                      <button type="button" onClick={markAllRead} className="tb-clear-btn">
                        Mark all read
                      </button>
                    </div>

                    <div className="tb-notif-tabs">
                      <button
                        type="button"
                        className={`tb-notif-tab ${activeTab === "general" ? "active" : ""}`}
                        onClick={() => setActiveTab("general")}
                      >
                        General {generalUnread > 0 ? `(${generalUnread})` : ""}
                      </button>
                      <button
                        type="button"
                        className={`tb-notif-tab ${activeTab === "personal" ? "active" : ""}`}
                        onClick={() => setActiveTab("personal")}
                      >
                        My Updates {personalUnread > 0 ? `(${personalUnread})` : ""}
                      </button>
                    </div>

                    <div className="tb-dropdown-list">
                      {displayedNotifs.length ? (
                        displayedNotifs.map((n) => {
                          const href = n.actionUrl || "/work-center";

                          return (
                            <Link
                              key={n.id}
                              href={href}
                              onClick={() => setShowNotifications(false)}
                              className={n.read ? "tb-notif-item" : "tb-notif-item unread"}
                            >
                              <span className="tb-notif-icon-wrap">{getNotificationIcon(n.severity)}</span>
                              <div>
                                <p className="tb-notif-text">{n.title}</p>
                                <small className="tb-item-small">{n.message}</small>
                                <small className="tb-notif-time">{n.time}</small>
                              </div>
                            </Link>
                          );
                        })
                      ) : (
                        <p className="tb-empty-text">
                          {activeTab === "general" ? "No new activity logs." : "No tasks or follow-up notifications."}
                        </p>
                      )}
                    </div>
                    <div className="tb-dropdown-actions">
                      <Link href="/work-center" onClick={() => setShowNotifications(false)}>
                        Filter Notifications
                      </Link>
                      <Link href="/work-center" onClick={() => setShowNotifications(false)}>
                        View All
                      </Link>
                    </div>
                  </div>
                );
              })()}
        </div>

        {/* Profile Avatar */}
        <div className="tb-action-wrapper" onClick={(e) => e.stopPropagation()}>
          <div className="avatar" onClick={toggleProfile}>
            {initials}
          </div>
          {showProfile && (
            <div className="tb-dropdown">
              <div className="tb-profile-info">
                <p>{user.name}</p>
                <p>{user.email}</p>
              </div>
              <div className="tb-profile-actions">
                <Link href="/settings" className="tb-profile-btn" onClick={() => setShowProfile(false)}>
                  <Settings size={14} className="icon-default" />
                  <span>Profile Settings</span>
                </Link>
                <button type="button" onClick={runDiagnostics} className="tb-profile-btn">
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
                <div className={`tb-status-block ${diagnosticsData.success ? "success" : "error"}`}>
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
                    <div className="tb-counts-header">Database Record Counts</div>
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
                  <div className="tb-error-block">Error: {diagnosticsData.error}</div>
                )}

                <div className="tb-env-meta">
                  <div>
                    Node Environment: <strong>{diagnosticsData.env?.nextEnv || "production"}</strong>
                  </div>
                  <div>
                    Node Version: <strong>{diagnosticsData.env?.nodeVersion || "N/A"}</strong>
                  </div>
                  <div>
                    Platform: <strong>{diagnosticsData.env?.platform || "N/A"}</strong>
                  </div>
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
              <p className="tb-status-desc">
                Are you sure you want to log out of your BIMAHEADQUARTER account?
              </p>
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
                      window.location.href = "/";
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
          <button type="button" onClick={() => setToast("")} className="tb-toast-close">
            Dismiss
          </button>
        </div>
      ) : null}
    </header>
  );
}
