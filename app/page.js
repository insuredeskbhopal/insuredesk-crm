"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DASHBOARD_VIEW_KEY = "bimaheadquarter.dashboard.view";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(DASHBOARD_VIEW_KEY) || "{}");
      const activePage = saved.activePage || "bulk-entry";
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

      let target = ROUTE_MAP[activePage] || "/dashboard";
      if (activePage === "customers" && saved.selectedClientName) {
        target = `/customer-management/${encodeURIComponent(saved.selectedClientName)}`;
        if (saved.selectedPolicyId) {
          target += `/policy/${saved.selectedPolicyId}`;
        }
      }
      router.replace(target);
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  return null;
}
