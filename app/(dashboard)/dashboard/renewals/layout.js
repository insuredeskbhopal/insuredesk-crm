"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  FileText,
  Building2,
  FolderOpen,
  PhoneCall,
  CheckCircle2,
  XOctagon,
  BarChart3
} from "lucide-react";
import "@/app/ui/renewals-redesign.css";

export default function RenewalsLayout({ children }) {
  const pathname = usePathname();
  const [role, setRole] = useState("");

  useEffect(() => {
    // Load current user profile for role checks
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data?.success) {
          setRole(data.user?.role || "");
        }
      } catch (err) {
        console.error("Layout failed to load user role:", err);
      }
    };
    loadUser();
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard/renewals", icon: LayoutDashboard },
    { label: "Daily Work", href: "/dashboard/renewals/daily-work", icon: CalendarCheck },
    { label: "Customer Renewals", href: "/dashboard/renewals/customers", icon: Users },
    { label: "Policy Renewals", href: "/dashboard/renewals/policies", icon: FileText },
    { label: "Companies", href: "/dashboard/renewals/companies", icon: Building2 },
    { label: "Policy Types", href: "/dashboard/renewals/policy-types", icon: FolderOpen },
    { label: "Follow-Ups", href: "/dashboard/renewals/follow-ups", icon: PhoneCall },
    { label: "Renewed", href: "/dashboard/renewals/renewed", icon: CheckCircle2 },
    { label: "Lost", href: "/dashboard/renewals/lost", icon: XOctagon },
    { label: "Reports", href: "/dashboard/renewals/reports", icon: BarChart3 }
  ];

  const getActiveHref = () => {
    // Exact match or sub-route mapping (like customers/[id] mapping to customers)
    if (pathname.startsWith("/dashboard/renewals/customers")) {
      return "/dashboard/renewals/customers";
    }
    if (pathname.startsWith("/dashboard/renewals/daily-work")) {
      return "/dashboard/renewals/daily-work";
    }
    if (pathname.startsWith("/dashboard/renewals/policies")) {
      return "/dashboard/renewals/policies";
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
    return "/dashboard/renewals"; // fallback to Dashboard Overview
  };

  const activeHref = getActiveHref();

  return (
    <div className="renewals-container">
      {/* Header section */}
      <div className="renewals-header-section">
        <h1 className="renewals-header-title">Renewal Operations Hub</h1>
        <p className="renewals-header-subtitle">
          Manage policies in their renewal window, track agent work, and monitor customer retention.
        </p>
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
      <div className="renewals-content-pane">
        {children}
      </div>
    </div>
  );
}
