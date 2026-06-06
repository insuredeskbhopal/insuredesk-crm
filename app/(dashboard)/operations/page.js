"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  ClipboardCheck,
  ClipboardList,
  FileEdit,
  FilePenLine,
  FileText,
  Handshake,
  Headphones,
  Search,
  ShieldCheck,
  Users
} from "lucide-react";
import PageHeader from "@/app/components/layout/PageHeader";
import { OPERATIONS_MODULES, FUTURE_OPERATIONS_MODULES } from "@/app/lib/operations-modules";

const ICONS = {
  "customer-profiling": Users,
  "manual-policy-entry": FilePenLine,
  "claims-management": ShieldCheck,
  declarations: ClipboardCheck,
  endorsements: FileEdit,
  "service-requests": Headphones,
  "lead-management": Handshake
};

const DEFAULT_METRICS = {
  customerProfiles: 0,
  policyRecords: 0,
  openActivities: 0,
  activeModules: OPERATIONS_MODULES.length,
  latestProfileActivity: "",
  latestPolicyActivity: ""
};

export default function OperationsHubPage() {
  const [query, setQuery] = useState("");
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOperationsSummary() {
      try {
        const [profilesRes, recordsRes] = await Promise.all([
          fetch("/api/customer-profiles?limit=1", { cache: "no-store" }),
          fetch("/api/records?limit=1", { cache: "no-store" })
        ]);

        const [profilesPayload, recordsPayload] = await Promise.all([
          profilesRes.ok ? profilesRes.json() : Promise.resolve(null),
          recordsRes.ok ? recordsRes.json() : Promise.resolve(null)
        ]);

        if (cancelled) return;

        const latestProfile = profilesPayload?.profiles?.[0];
        const latestRecord = recordsPayload?.records?.[0];
        const activities = [];

        if (latestProfile) {
          activities.push({
            label: "Customer profile updated",
            detail: latestProfile.name || latestProfile.phone || "Customer profile",
            when: formatActivityDate(latestProfile.updatedAt || latestProfile.createdAt)
          });
        }

        if (latestRecord) {
          activities.push({
            label: "Policy record saved",
            detail: latestRecord.policyNumber || latestRecord.insuredName || "Policy record",
            when: formatActivityDate(latestRecord.savedAt || latestRecord.createdAt)
          });
        }

        setMetrics({
          customerProfiles: profilesPayload?.total || 0,
          policyRecords: recordsPayload?.total || 0,
          openActivities: (profilesPayload?.counters?.followUpRequired || 0) + (profilesPayload?.counters?.newLeads || 0),
          activeModules: OPERATIONS_MODULES.length,
          latestProfileActivity: formatActivityDate(latestProfile?.updatedAt || latestProfile?.createdAt),
          latestPolicyActivity: formatActivityDate(latestRecord?.savedAt || latestRecord?.createdAt)
        });
        setRecentActivity(activities);
      } catch {
        if (!cancelled) {
          setMetrics(DEFAULT_METRICS);
          setRecentActivity([]);
        }
      }
    }

    loadOperationsSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredModules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return OPERATIONS_MODULES;
    return OPERATIONS_MODULES.filter((module) =>
      [module.name, module.description, ...module.functions].join(" ").toLowerCase().includes(normalized)
    );
  }, [query]);

  return (
    <div className="operations-hub-page">
      <PageHeader
        title="Operations Hub"
        subtitle="Manage customer onboarding, policy servicing, claims, declarations, endorsements, and lead activities from a single workspace."
      />

      <section className="operations-summary-grid">
        <SummaryCard icon={Users} label="Customer Profiles" value={metrics.customerProfiles} />
        <SummaryCard icon={FileText} label="Policy Records" value={metrics.policyRecords} />
        <SummaryCard icon={Activity} label="Open Activities" value={metrics.openActivities} />
        <SummaryCard icon={BadgeCheck} label="Active Modules" value={metrics.activeModules} />
      </section>

      <section className="operations-workspace">
        <div className="operations-main">
          <div className="operations-toolbar">
            <div>
              <h3>Operational Modules</h3>
              <p>Open the workspace needed for day-to-day insurance servicing.</p>
            </div>
            <label className="operations-search">
              <Search size={18} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules, actions, claims, leads..."
              />
            </label>
          </div>

          <div className="operations-card-grid">
            {filteredModules.map((module) => (
              <OperationsCard key={module.id} module={module} metrics={metrics} />
            ))}
          </div>
        </div>

        <aside className="operations-side-panel">
          <section>
            <div className="operations-side-head">
              <ClipboardList size={18} />
              <h3>Recent Activity</h3>
            </div>
            <div className="operations-activity-list">
              {recentActivity.length ? recentActivity.map((item) => (
                <div className="operations-activity-item" key={`${item.label}-${item.detail}`}>
                  <span>{item.label}</span>
                  <strong>{item.detail}</strong>
                  <em>{item.when}</em>
                </div>
              )) : (
                <div className="operations-empty-activity">
                  <strong>No recent activity loaded</strong>
                  <span>New servicing updates will appear here.</span>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="operations-side-head">
              <FileText size={18} />
              <h3>Future Ready</h3>
            </div>
            <div className="operations-future-list">
              {FUTURE_OPERATIONS_MODULES.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="operations-summary-card">
      <span><Icon size={20} /></span>
      <div>
        <strong>{Number(value || 0).toLocaleString("en-IN")}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}

function OperationsCard({ module, metrics }) {
  const Icon = ICONS[module.id] || FileText;
  const count = getModuleCount(module.id, metrics);
  const lastActivity = getLastActivityText(module.id, count, metrics);

  return (
    <Link className={`operations-module-card accent-${module.accent}`} href={module.route}>
      <div className="operations-module-top">
        <span className="operations-module-icon"><Icon size={22} /></span>
        <span className="operations-module-count">{count.toLocaleString("en-IN")} records</span>
      </div>
      <h3>{module.name}</h3>
      <p>{module.description}</p>
      <ul>
        {module.functions.slice(0, 4).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="operations-module-footer">
        <span>{lastActivity}</span>
        <strong>{module.buttonLabel}</strong>
      </div>
    </Link>
  );
}

function getModuleCount(id, metrics) {
  if (id === "customer-profiling" || id === "lead-management") return metrics.customerProfiles || 0;
  if (id === "manual-policy-entry") return metrics.policyRecords || 0;
  return 0;
}

function getLastActivityText(id, count, metrics) {
  if (id === "customer-profiling" || id === "lead-management") {
    return count > 0 && metrics.latestProfileActivity ? `Last activity ${metrics.latestProfileActivity}` : "No recent activity";
  }
  if (id === "manual-policy-entry") {
    return count > 0 && metrics.latestPolicyActivity ? `Last policy ${metrics.latestPolicyActivity}` : "No recent activity";
  }
  if (count > 0) return "Last activity available";
  if (["claims-management", "declarations", "endorsements", "service-requests"].includes(id)) return "Ready for setup";
  return "No recent activity";
}

function formatActivityDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
