import { CircleHelp, LayoutDashboard, LogOut, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const ROUTE_MAP = {
  "dashboard": "/dashboard",
  "bulk-entry": "/bulk-upload",
  "manual-entry": "/manual-policy-entry",
  "records": "/policy-records",
  "customers": "/customer-management",
  "analytics": "/analytics-reports",
  "field-setup": "/field-setup",
  "settings": "/settings",
  "upload-history": "/upload-history"
};

export default function SideNav({ activePage: propActivePage, navItems, onPageChange, isSidebarOpen, onCloseSidebar }) {
  const router = useRouter();
  const pathname = usePathname();

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

  const handleLogout = async () => {
    if (onCloseSidebar) onCloseSidebar();
    if (confirm("Are you sure you want to log out?")) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      } catch (err) {
        console.error("Failed to log out:", err);
        window.location.reload();
      }
    }
  };

  return (
    <aside className={`side-nav ${isSidebarOpen ? "open" : ""}`}>
      {/* Mobile close button */}
      <button 
        className="sidebar-close-btn"
        onClick={onCloseSidebar}
        aria-label="Close Navigation"
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          border: "none",
          background: "none",
          cursor: "pointer",
          display: "none", // will be displayed as block via CSS media queries
          alignItems: "center",
          justifyContent: "center",
          color: "var(--outline)",
          padding: "4px",
          boxShadow: "none"
        }}
      >
        <X size={20} />
      </button>

      <div className="portal-title">
        <h1>InsurCRM</h1>
        <p>Enterprise Portal</p>
      </div>

      <nav>
        <button className={activePage === "dashboard" ? "active" : ""} type="button" onClick={() => handleNavigate("dashboard")}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        {navItems.map((item) => {
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
  );
}


