"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  FileSpreadsheet,
} from "lucide-react";
import RenewalImportStudioModal from "@/app/components/renewals/RenewalImportStudioModal";
import "@/app/ui/renewals-redesign.css";

export default function RenewalsLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const handleOpen = () => setShowImportModal(true);
    window.addEventListener("open-renewal-import-studio", handleOpen);
    return () => window.removeEventListener("open-renewal-import-studio", handleOpen);
  }, []);

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
            className="rn-header-import-btn"
            title="Open Interactive Renewal Import Studio"
          >
            <FileSpreadsheet size={15} />
            <span>Import Renewals Studio</span>
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
              prefetch={false}
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

      {/* Spreadsheet Studio Modal */}
      <RenewalImportStudioModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
