"use client";

import { CircleHelp, LayoutDashboard, LogOut } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ROUTE_MAP = {
  "dashboard": "/dashboard",
  "bulk-entry": "/bulk-upload",
  "manual-entry": "/manual-policy-entry",
  "records": "/policy-records",
  "customers": "/customer-management",
  "analytics": "/analytics-reports",
  "field-setup": "/field-setup",
  "user-management": "/admin/users",

  "upload-history": "/upload-history"
};

export default function SideNav({ activePage: propActivePage, navItems, onPageChange, isSidebarOpen, onCloseSidebar }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const payload = await response.json();
        if (isMounted && payload?.success) {
          setUserRole(payload.user?.role || "");
        }
      } catch {
        if (isMounted) setUserRole("");
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const getActivePage = () => {
    if (propActivePage) return propActivePage;
    if (pathname === "/dashboard") return "dashboard";
    if (pathname === "/bulk-upload") return "bulk-entry";
    if (pathname === "/manual-policy-entry") return "manual-entry";
    if (pathname === "/policy-records") return "records";
    if (pathname.startsWith("/customer-management")) return "customers";
    if (pathname === "/analytics-reports") return "analytics";
    if (pathname === "/field-setup") return "field-setup";
    if (pathname === "/settings") return "settings";
    if (pathname === "/admin/users") return "user-management";
    if (pathname === "/upload-history") return "upload-history";
    return "";
  };

  const activePage = getActivePage();

  const handleNavigate = (id) => {
    if (onCloseSidebar) onCloseSidebar();
    if (onPageChange) {
      onPageChange(id);
    } else {
      const route = ROUTE_MAP[id] || "/dashboard";
      router.push(route);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <>
      <aside className={`side-nav ${isSidebarOpen ? "open" : ""}`}>
        <div className="portal-title">
          <h1>BIMAHEADQUARTER</h1>
          <p>Enterprise Portal</p>
        </div>

        <nav>
          <button className={activePage === "dashboard" ? "active" : ""} type="button" onClick={() => handleNavigate("dashboard")}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          {navItems.filter((item) => {
            if (item.roles) return item.roles.includes(userRole);
            if (item.role) return item.role === userRole;
            return true;
          }).map((item) => {
            const Icon = item.icon;
            return (
              <button className={activePage === item.id ? "active" : ""} type="button" key={item.id} onClick={() => handleNavigate(item.id)}>
                <Icon size={20} /> {item.label}
              </button>
            );
          })}
        </nav>

        <div className="side-footer">
          <button type="button"><CircleHelp size={20} /> Help Center</button>
          <button type="button" onClick={handleLogout}><LogOut size={20} /> Logout</button>
        </div>
      </aside>

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
                  if (onCloseSidebar) onCloseSidebar();
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/crm/admin/login";
                  } catch (err) {
                    console.error("Failed to log out:", err);
                    window.location.reload();
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
    </>
  );
}
