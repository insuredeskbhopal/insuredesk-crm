"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "./AppShell";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import { NAV_ITEMS } from "@/app/ui/dashboard/constants";

const DASHBOARD_VIEW_KEY = "insurcrm.dashboard.view";

export default function ReportLayout({ children }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handlePageChange = (pageId) => {
    try {
      window.localStorage.setItem(
        DASHBOARD_VIEW_KEY,
        JSON.stringify({ activePage: pageId, selectedClientName: "", selectedPolicyId: "" })
      );
    } catch {}
    router.push("/");
  };

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
    try {
      const current = JSON.parse(window.localStorage.getItem(DASHBOARD_VIEW_KEY) || "{}");
      window.localStorage.setItem(
        DASHBOARD_VIEW_KEY,
        JSON.stringify({ ...current, activePage: "records" })
      );
    } catch {}
    router.push("/");
  };

  return (
    <AppShell>
      <TopBar query={query} onQueryChange={handleQueryChange} />
      <SideNav activePage="analytics" navItems={NAV_ITEMS} onPageChange={handlePageChange} />
      <section className="content-canvas">
        <div className="page-inner">
          {children}
        </div>
      </section>
    </AppShell>
  );
}
