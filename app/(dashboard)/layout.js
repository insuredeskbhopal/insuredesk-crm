"use client";

/* global URLSearchParams */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/app/components/layout/AppShell";
import SideNav from "@/app/components/layout/SideNav";
import TopBar from "@/app/components/layout/TopBar";
import { NAV_ITEMS } from "@/app/ui/dashboard/constants";
import "@/app/ui/dashboard.css";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Close sidebar on pathname change (navigating to new route)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }

    if (["/policy-records", "/customer-management", "/dashboard", "/bulk-upload", "/operations"].includes(pathname)) {
      router.push(`${pathname}?${params.toString()}`);
    } else {
      router.push(`/policy-records?${params.toString()}`);
    }
  };

  return (
    <AppShell>
      <TopBar 
        query={query} 
        onQueryChange={handleQueryChange} 
        isSidebarOpen={isSidebarOpen} 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      <SideNav 
        navItems={NAV_ITEMS} 
        isSidebarOpen={isSidebarOpen} 
        onCloseSidebar={() => setIsSidebarOpen(false)} 
      />
      
      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(25, 28, 29, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 45,
            transition: "opacity 0.25s ease"
          }}
        />
      )}
      
      <section className="content-canvas">
        <div className="page-inner">
          {children}
        </div>
      </section>
    </AppShell>
  );
}
