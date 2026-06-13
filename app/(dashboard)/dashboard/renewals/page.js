"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  FileText, 
  Clock, 
  AlertTriangle, 
  PhoneCall, 
  CheckCircle, 
  XCircle, 
  Building2, 
  FolderOpen, 
  BarChart3,
  Calendar
} from "lucide-react";

export default function RenewalsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 0,
    dueToday: 0,
    due7: 0,
    due15: 0,
    due30: 0,
    overdue: 0,
    followUpToday: 0,
    missedFollowUps: 0,
    renewed: 0,
    lost: 0
  });
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        // Fetch stats from main policies route
        const policiesRes = await fetch("/api/renewals/policies?tab=upcoming&limit=1");
        const policiesData = await policiesRes.json();
        
        // Fetch customers to get total customer counts
        const customersRes = await fetch("/api/renewals/customers?limit=1");
        const customersData = await customersRes.json();
        
        if (policiesData.summaryCounts) {
          setStats(policiesData.summaryCounts);
        }
        if (customersData.totalCount !== undefined) {
          setCustomerCount(customersData.totalCount);
        }
      } catch (error) {
        console.error("Failed to load renewals dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  const kpis = [
    {
      title: "Customers With Renewals",
      value: customerCount,
      desc: "Total client portfolios active",
      icon: Users,
      color: "var(--rn-primary)",
      bgColor: "var(--rn-primary-light)",
      href: "/dashboard/renewals/customers"
    },
    {
      title: "Total Policies In Window",
      value: stats.total,
      desc: "All active policies within range",
      icon: FileText,
      color: "#4f46e5",
      bgColor: "#e0e7ff",
      href: "/dashboard/renewals/policies"
    },
    {
      title: "Due In 7 Days",
      value: stats.due7,
      desc: "Expiring in the next week",
      icon: Clock,
      color: varColor("warning"),
      bgColor: varBg("warning"),
      href: "/dashboard/renewals/policies?tab=due_7"
    },
    {
      title: "Due In 15 Days",
      value: stats.due15,
      desc: "Expiring within 15 days",
      icon: Calendar,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      href: "/dashboard/renewals/policies?tab=due_15"
    },
    {
      title: "Due In 30 Days",
      value: stats.due30,
      desc: "Expiring within 30 days",
      icon: Calendar,
      color: "#d97706",
      bgColor: "#fef3c7",
      href: "/dashboard/renewals/policies?tab=due_30"
    },
    {
      title: "Overdue Policies",
      value: stats.overdue,
      desc: "Policies past expiry date",
      icon: AlertTriangle,
      color: varColor("danger"),
      bgColor: varBg("danger"),
      href: "/dashboard/renewals/policies?tab=overdue"
    },
    {
      title: "Follow-Ups Pending",
      value: stats.missedFollowUps + stats.followUpToday,
      desc: "Today and overdue tasks",
      icon: PhoneCall,
      color: "#0891b2",
      bgColor: "#ecfeff",
      href: "/dashboard/renewals/follow-ups"
    },
    {
      title: "Renewed This Month",
      value: stats.renewed,
      desc: "Conversions completed",
      icon: CheckCircle,
      color: varColor("success"),
      bgColor: varBg("success"),
      href: "/dashboard/renewals/renewed"
    },
    {
      title: "Lost Policies",
      value: stats.lost,
      desc: "Un-renewed/expired",
      icon: XCircle,
      color: "#6b7280",
      bgColor: "#f3f4f6",
      href: "/dashboard/renewals/lost"
    }
  ];

  const summaries = [
    {
      title: "Insurance Companies",
      desc: "Manage renewals grouped by underwriters",
      icon: Building2,
      href: "/dashboard/renewals/companies"
    },
    {
      title: "Policy Types",
      desc: "Filter and view by insurance product line",
      icon: FolderOpen,
      href: "/dashboard/renewals/policy-types"
    },
    {
      title: "Active Customer Renewals",
      desc: "Manage customer-level portfolios",
      icon: Users,
      href: "/dashboard/renewals/customers"
    },
    {
      title: "Active Policy Renewals",
      desc: "Manage individual policy-level details",
      icon: FileText,
      href: "/dashboard/renewals/policies"
    },
    {
      title: "Renewal Reports",
      desc: "Access management statistics & metrics",
      icon: BarChart3,
      href: "/dashboard/renewals/reports"
    }
  ];

  function varColor(type) {
    return `var(--rn-${type})`;
  }

  function varBg(type) {
    return `var(--rn-${type}-light)`;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p style={{ color: "var(--rn-text-secondary)", fontSize: "14px" }}>Loading dashboard overview...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Top KPI Cards Grid */}
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--rn-text-primary)", marginBottom: "16px" }}>
          Key Performance Indicators
        </h3>
        <div className="renewals-grid">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div 
                key={kpi.title} 
                className="renewals-card"
                onClick={() => router.push(kpi.href)}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <h4 className="renewals-card-title">{kpi.title}</h4>
                    <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: kpi.bgColor, color: kpi.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="renewals-card-value">{kpi.value}</p>
                </div>
                <p className="renewals-card-footer">{kpi.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Summary Cards Grid */}
      <div>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--rn-text-primary)", marginBottom: "16px" }}>
          Operational Sections
        </h3>
        <div className="renewals-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {summaries.map((sum) => {
            const Icon = sum.icon;
            return (
              <div 
                key={sum.title} 
                className="renewals-card"
                onClick={() => router.push(sum.href)}
                style={{ minHeight: "130px" }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--rn-border-light)", color: "var(--rn-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 4px 0", color: "var(--rn-text-primary)" }}>{sum.title}</h4>
                    <p style={{ fontSize: "13px", color: "var(--rn-text-secondary)", margin: 0 }}>{sum.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
