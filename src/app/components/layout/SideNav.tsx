"use client";

import { ChevronDown, CircleHelp, LayoutDashboard, LogOut } from "lucide-react";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { cachedJson } from "@/app/lib/client-api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const ROUTE_MAP = {
  dashboard: "/dashboard",
  "bulk-entry": "/bulk-upload",
  "work-center": "/work-center",
  operations: "/operations",
  "manual-entry": "/manual-policy-entry",
  "lead-generation": "/dashboard/manual-entry/lead-generation",
  records: "/policy-records",
  customers: "/customer-management",
  renewals: "/dashboard/renewals",
  endorsements: "/dashboard/endorsements",
  analytics: "/dashboard/reports",
  "field-setup": "/field-setup",
  "user-management": "/admin/users",
  settings: "/settings",
  "upload-history": "/upload-history",
};

export default function SideNav({
  activePage: propActivePage,
  navItems,
  onPageChange,
  isSidebarOpen,
  onCloseSidebar,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const payload = await cachedJson("/api/auth/me", { ttlMs: 10000 });
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
    if (pathname === "/work-center" || pathname.startsWith("/operations")) return "operations";
    if (pathname === "/manual-policy-entry") return "manual-entry";
    if (
      pathname === "/dashboard/manual-entry/lead-generation" ||
      pathname === "/dashboard/manual-entry/customer-profiling"
    ) return "lead-generation";
    if (pathname === "/policy-records") return "records";
    if (pathname.startsWith("/customer-management")) return "customers";
    if (pathname.startsWith("/dashboard/renewals")) return "renewals";
    if (pathname.startsWith("/dashboard/endorsements")) return "operations";
    if (pathname === "/analytics-reports" || pathname.startsWith("/dashboard/reports")) return "analytics";
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
          <BrandLogo href="/dashboard" />
          <p>Enterprise Portal</p>
        </div>

        <nav>
          <Link
            className={activePage === "dashboard" ? "active" : ""}
            href={ROUTE_MAP["dashboard"]}
            onClick={() => { if (onCloseSidebar) onCloseSidebar(); }}
          >
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          {navItems
            .filter((item) => {
              if (item.roles) return item.roles.includes(userRole);
              if (item.role) return item.role === userRole;
              return true;
            })
            .map((item) => {
              const Icon = item.icon;
              const isParentActive =
                activePage === item.id || item.children?.some((child) => child.id === activePage);

              if (item.children?.length) {
                return (
                  <div className="side-nav-group" key={item.id}>
                    <button
                      className={isParentActive ? "active" : ""}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                    >
                      <Icon size={20} /> {item.label}
                      <ChevronDown className="side-nav-chevron" size={14} />
                    </button>
                    {isParentActive ? (
                      <div className="side-nav-submenu">
                        {item.children.map((child) => (
                          <Link
                            className={activePage === child.id ? "active" : ""}
                            key={child.id}
                            href={ROUTE_MAP[child.id] || "/dashboard"}
                            onClick={() => { if (onCloseSidebar) onCloseSidebar(); }}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <div className="side-nav-group" key={item.id}>
                  <Link
                    className={activePage === item.id ? "active" : ""}
                    href={ROUTE_MAP[item.id] || "/dashboard"}
                    onClick={() => { if (onCloseSidebar) onCloseSidebar(); }}
                  >
                    <Icon size={20} /> {item.label}
                  </Link>
                </div>
              );
            })}
        </nav>

        <div className="side-footer">
          <button type="button">
            <CircleHelp size={20} /> Help Center
          </button>
          <button type="button" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </button>
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
                  if (onCloseSidebar) onCloseSidebar();
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/";
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
