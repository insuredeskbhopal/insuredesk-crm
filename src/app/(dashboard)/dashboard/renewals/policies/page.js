"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clipboard,
  Edit3,
  Eye,
  FileText,
  IndianRupee,
  MessageSquare,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shield,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import RenewalActionDrawer from "@/app/components/renewals/RenewalActionDrawer";
import { showToast } from "@/app/components/shared/ToastProvider";
import {
  RENEWAL_REGISTER_CATEGORY_TABS,
  RENEWAL_REGISTER_MONTHS,
  RENEWAL_REGISTER_POLICY_TYPES,
  formatRenewalRegisterAmount,
  formatRenewalRegisterDate,
  getRenewalRegisterMonthLabel,
  getRenewalRegisterStatusTone,
  normalizeRenewalRegisterMonth,
} from "@/lib/renewals/register";

const CONTEXT_TABS = new Set(["register", "all", "due_today", "due_7", "due_30"]);

function getPolicyCustomerKey(policy) {
  if (policy.customerPortfolioId) return String(policy.customerPortfolioId);
  const rawContact = policy.contactNumber || policy.renewalRecipientMobile || policy.contactPersonMobile || "";
  const digits = String(rawContact).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : `NO-MOBILE-${policy.id}`;
}

function getCustomerInitials(name) {
  if (!name || typeof name !== "string") return "CU";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function RenewalPoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [queryDraft, setQueryDraft] = useState("");
  const [query, setQuery] = useState("");
  const [policyType, setPolicyType] = useState("All");
  const [company, setCompany] = useState("All");
  const [companyOptions, setCompanyOptions] = useState([]);
  const [renewalMonth, setRenewalMonth] = useState("All");
  const [contextTab, setContextTab] = useState("register");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({ all: 0, motor: 0, warehouse: 0, other: 0 });
  const [activeActionPolicyId, setActiveActionPolicyId] = useState("");
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeDrawerPolicy, setActiveDrawerPolicy] = useState(null);
  const [drawerTab, setDrawerTab] = useState("remark");
  const [viewMode, setViewMode] = useState("customer"); // "customer" | "policy"
  const [expandedCustomerKeys, setExpandedCustomerKeys] = useState(new Set());

  useEffect(() => {
    const params = new window.URLSearchParams(window.location.search);
    const initialQuery = params.get("q") || "";
    setQueryDraft(initialQuery);
    setQuery(initialQuery);
    setPolicyType(params.get("policyType") || "All");
    setCompany(params.get("company") || "All");
    setRenewalMonth(normalizeRenewalRegisterMonth(params.get("month")));
    const requestedTab = params.get("tab") || "register";
    setContextTab(CONTEXT_TABS.has(requestedTab) ? requestedTab : "register");
    setPage(Math.max(1, Number(params.get("page")) || 1));
    const requestedView = params.get("view");
    if (requestedView === "policy" || requestedView === "customer") {
      setViewMode(requestedView);
    }
    const requestedPageSize = Number(params.get("pageSize"));
    if ([15, 25, 50, 100].includes(requestedPageSize)) {
      setPageSize(requestedPageSize);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!loading && initialized && typeof window !== "undefined") {
      const savedY = window.sessionStorage.getItem("rn-customer-scroll-y");
      if (savedY) {
        window.sessionStorage.removeItem("rn-customer-scroll-y");
        window.scrollTo({ top: Number(savedY), behavior: "instant" });
      }
    }
  }, [loading, initialized]);

  useEffect(() => {
    if (!initialized) return;
    const controller = new window.AbortController();

    fetch("/api/renewals/companies", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Insurance companies could not be loaded.");
        setCompanyOptions(
          (payload.companyStats || [])
            .filter((row) => row.company && row.company !== "Other" && Number(row.total) > 0)
            .map((row) => row.company)
            .sort((a, b) => a.localeCompare(b)),
        );
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") console.error(loadError);
      });

    return () => controller.abort();
  }, [initialized]);

  useEffect(() => {
    if (!initialized) return;

    const controller = new window.AbortController();
    const loadPolicies = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new window.URLSearchParams({ tab: contextTab, page: String(page), limit: String(pageSize) });
        if (query) params.set("q", query);
        if (policyType !== "All") params.set("policyType", policyType);
        if (company !== "All") params.set("company", company);
        if (renewalMonth !== "All") params.set("month", renewalMonth);
        const response = await fetch(`/api/renewals/policies?${params}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Renewal data could not be loaded.");
        setPolicies(payload.policies || []);
        setTotalCount(payload.totalCount || 0);
        setTotalPages(payload.pages || 1);
        setCategoryCounts(payload.categoryCounts || { all: 0, motor: 0, warehouse: 0, other: 0 });
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message || "Renewal data could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadPolicies();
    return () => controller.abort();
  }, [company, contextTab, initialized, page, pageSize, policyType, query, refreshKey, renewalMonth]);

  const syncUrl = (updates = {}) => {
    const next = { query, policyType, company, renewalMonth, page, viewMode, pageSize, ...updates };
    const params = new window.URLSearchParams();
    if (contextTab !== "register") params.set("tab", contextTab);
    if (next.query) params.set("q", next.query);
    if (next.policyType !== "All") params.set("policyType", next.policyType);
    if (next.company !== "All") params.set("company", next.company);
    if (next.renewalMonth !== "All") params.set("month", next.renewalMonth);
    if (next.viewMode && next.viewMode !== "policy") params.set("view", next.viewMode);
    if (next.pageSize && next.pageSize !== 25) params.set("pageSize", String(next.pageSize));
    if (next.page > 1) params.set("page", String(next.page));
    router.replace(params.size ? `?${params}` : "/dashboard/renewals/policies", { scroll: false });
  };

  const applySearch = (event) => {
    event.preventDefault();
    const nextQuery = queryDraft.trim();
    setQuery(nextQuery);
    setPage(1);
    closeActionMenu();
    syncUrl({ query: nextQuery, page: 1 });
  };

  const changePolicyType = (value) => {
    setPolicyType(value);
    setPage(1);
    closeActionMenu();
    syncUrl({ policyType: value, page: 1 });
  };

  const changeRenewalMonth = (value) => {
    const nextMonth = normalizeRenewalRegisterMonth(value);
    setRenewalMonth(nextMonth);
    setPage(1);
    closeActionMenu();
    syncUrl({ renewalMonth: nextMonth, page: 1 });
  };

  const changeCompany = (value) => {
    setCompany(value);
    setPage(1);
    closeActionMenu();
    syncUrl({ company: value, page: 1 });
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    closeActionMenu();
    syncUrl({ page: nextPage });
  };

  const changeViewMode = (mode) => {
    setViewMode(mode);
    syncUrl({ viewMode: mode });
  };

  const changePageSize = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
    syncUrl({ pageSize: newPageSize, page: 1 });
  };

  const toggleExpandCustomer = (key) => {
    setExpandedCustomerKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => {
    setQueryDraft("");
    setQuery("");
    setPolicyType("All");
    setCompany("All");
    setRenewalMonth("All");
    setPage(1);
    closeActionMenu();
    router.replace(contextTab === "register" ? "/dashboard/renewals/policies" : `/dashboard/renewals/policies?tab=${contextTab}`, { scroll: false });
  };

  const openActionMenu = (policyId, event) => {
    event.stopPropagation();
    if (activeActionPolicyId === policyId) {
      closeActionMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 410;
    const gap = 6;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const left = Math.min(viewportWidth - menuWidth - 12, Math.max(12, rect.right - menuWidth));
    const opensUp = window.innerHeight - rect.bottom < menuHeight + 16;
    const top = opensUp ? Math.max(12, rect.top - menuHeight - gap) : rect.bottom + gap;

    setActionMenuPosition({ top, left, width: menuWidth });
    setActiveActionPolicyId(policyId);
  };

  function closeActionMenu() {
    setActiveActionPolicyId("");
    setActionMenuPosition(null);
  }

  const callCustomer = (policy) => {
    closeActionMenu();
    const rawContact = policy?.renewalRecipientMobile || policy?.contactNumber || policy?.contactPersonMobile || "";
    const digits = String(rawContact).replace(/\D/g, "");
    if (digits.length >= 10) {
      window.open(`tel:${digits.slice(-10)}`);
    } else {
      showToast("No valid phone number recorded for this customer.", "error");
    }
  };

  const openCustomerAction = (policy, action = "remark") => {
    closeActionMenu();
    if (action === "profile") {
      const customerKey = getPolicyCustomerKey(policy);
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const params = new window.URLSearchParams({ returnTo, policyId: policy.id });
      window.sessionStorage.setItem("rn-customer-return-url", returnTo);
      window.sessionStorage.setItem("rn-customer-scroll-y", String(window.scrollY || 0));
      router.push(`/dashboard/renewals/customers/${encodeURIComponent(customerKey)}?${params}`);
      return;
    }

    setDrawerTab(action);
    setActiveDrawerPolicy(policy);
  };

  const handlePolicyUpdated = (updatedPolicy, targetPolicyIds = []) => {
    const ids = targetPolicyIds.length ? new Set(targetPolicyIds) : new Set([updatedPolicy.id]);
    setPolicies((prev) =>
      prev.map((p) =>
        ids.has(p.id)
          ? {
              ...p,
              renewalStatus: updatedPolicy.renewalStatus || p.renewalStatus,
              lastRemark: updatedPolicy.lastRemark || p.lastRemark,
              nextFollowUpDate: updatedPolicy.nextFollowUpDate || p.nextFollowUpDate,
              _recentlyUpdated: true,
            }
          : p
      )
    );
  };

  const customerGroups = useMemo(() => {
    const groups = new Map();
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    policies.forEach((policy) => {
      const key = getPolicyCustomerKey(policy);
      if (!groups.has(key)) {
        groups.set(key, {
          customerKey: key,
          insuredName: policy.insuredName || "Unknown Customer",
          contactNumber: policy.renewalRecipientMobile || policy.contactNumber || policy.contactPersonMobile || "",
          contactPerson: policy.contactPerson || policy.contactPersonName || policy.renewalRecipientName || "",
          policies: [],
          totalPremium: 0,
          dueThisWeekCount: 0,
          earliestExpiry: null,
          latestContact: policy.lastRemarkDate || policy.updatedAt || null,
        });
      }
      const group = groups.get(key);
      group.policies.push(policy);

      const prem = Number(policy.totalPremium || policy.premium || 0) || 0;
      group.totalPremium += prem;

      if (policy.expiryDate) {
        const exp = new Date(policy.expiryDate);
        if (exp >= now && exp <= sevenDaysLater) {
          group.dueThisWeekCount += 1;
        }
        if (!group.earliestExpiry || exp < new Date(group.earliestExpiry)) {
          group.earliestExpiry = policy.expiryDate;
        }
      }
    });

    return Array.from(groups.values());
  }, [policies]);

  const handleSaveAndNext = (currentPolicy) => {
    if (viewMode === "customer") {
      const currentCustomerKey = getPolicyCustomerKey(currentPolicy);
      const groupIndex = customerGroups.findIndex((g) => g.customerKey === currentCustomerKey);
      if (groupIndex !== -1 && groupIndex + 1 < customerGroups.length) {
        const nextCustomer = customerGroups[groupIndex + 1];
        setActiveDrawerPolicy(nextCustomer.policies[0]);
        showToast(`Switched to next customer: ${nextCustomer.insuredName}`, "info");
      } else {
        setActiveDrawerPolicy(null);
        showToast("Reached the end of customers on this page.", "info");
      }
    } else {
      const currentIndex = policies.findIndex((p) => p.id === currentPolicy.id);
      if (currentIndex !== -1 && currentIndex + 1 < policies.length) {
        setActiveDrawerPolicy(policies[currentIndex + 1]);
      } else {
        setActiveDrawerPolicy(null);
        showToast("Reached the end of policies on this page.", "info");
      }
    }
  };

  const selectedMonthLabel = renewalMonth === "All" ? "" : getRenewalRegisterMonthLabel(renewalMonth);
  const contextTitle = {
    all: "Pending Renewals",
    due_today: "Renewals Expiring Today",
    due_7: "Renewals Due Within 7 Days",
    due_30: "Renewals Due Within 30 Days",
  }[contextTab];
  const isMotorView = policyType === "Motor";
  const isWarehouseView = policyType === "Warehouse" || policyType === "Fire";
  const isNonMotorView = policyType === "Other" || policyType === "Non-Motor";
  const isCustomTable = isWarehouseView || isNonMotorView;

  return (
    <section className="rn-policy-register">
      <div className="rn-policy-register__intro">
        <div className="rn-policy-register__intro-main">
          <h2 className="rn-policy-register__title">
            {contextTitle || (selectedMonthLabel ? `${selectedMonthLabel} Renewals` : "All Renewals")}
          </h2>
          <p className="rn-policy-register__subtitle">
            {viewMode === "customer"
              ? "Renewals grouped by customer for unified outreach and multi-policy action."
              : "Every renewal is shown as its own policy row. No customer grouping is applied."}
          </p>
        </div>

        <div className="rn-policy-register__intro-controls">
          <div className="rn-view-switcher" role="group" aria-label="View mode">
            <button
              type="button"
              className={`rn-view-switcher__btn ${viewMode === "customer" ? "active" : ""}`}
              onClick={() => changeViewMode("customer")}
            >
              <Users size={14} />
              <span>Customer View</span>
            </button>
            <button
              type="button"
              className={`rn-view-switcher__btn ${viewMode === "policy" ? "active" : ""}`}
              onClick={() => changeViewMode("policy")}
            >
              <FileText size={14} />
              <span>Individual Policies</span>
            </button>
          </div>

          <div className="rn-policy-register__stat-badge">
            {viewMode === "customer" ? (
              <>
                <Users size={14} />
                <span><strong>{customerGroups.length}</strong> customers · <strong>{totalCount.toLocaleString("en-IN")}</strong> policies</span>
              </>
            ) : (
              <>
                <FileText size={14} />
                <span><strong>{totalCount.toLocaleString("en-IN")}</strong> policies</span>
              </>
            )}
          </div>
        </div>
      </div>

      <form className="rn-policy-register__filters" onSubmit={applySearch}>
        <label className="rn-policy-register__search">
          <Search size={17} />
          <input
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Search policy number, policyholder, vehicle, mobile, company..."
          />
        </label>
        <select value={policyType} onChange={(event) => changePolicyType(event.target.value)} aria-label="Policy type">
          {RENEWAL_REGISTER_POLICY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={company} onChange={(event) => changeCompany(event.target.value)} aria-label="Insurance company">
          <option value="All">All insurance companies</option>
          {companyOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={renewalMonth} onChange={(event) => changeRenewalMonth(event.target.value)} aria-label="Renewal month">
          {RENEWAL_REGISTER_MONTHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" className="rn-btn rn-btn-primary"><Search size={15} /> Search</button>
        {(query || policyType !== "All" || company !== "All" || renewalMonth !== "All") ? (
          <button type="button" className="rn-btn" onClick={clearFilters}><RefreshCw size={15} /> Clear</button>
        ) : null}
      </form>

      <div className="rn-lob-tabs" aria-label="Renewal policy categories" style={{ marginBottom: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
        {RENEWAL_REGISTER_CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={policyType === tab.value ? "active" : ""}
            onClick={() => changePolicyType(tab.value)}
          >
            {tab.label}
            <span>{categoryCounts[tab.countKey] || 0}</span>
          </button>
        ))}
      </div>

      <div className="rn-table-container rn-policy-register__table-shell">
        {error ? (
          <div className="rn-policy-register__state rn-policy-register__state--error">
            <AlertCircle size={22} />
            <strong>{error}</strong>
            <button type="button" className="rn-btn" onClick={() => setRefreshKey((current) => current + 1)}>Retry</button>
          </div>
        ) : loading ? (
          <div className="rn-policy-register__state"><span className="rn-policy-register__spinner" /> Loading renewals...</div>
        ) : policies.length === 0 ? (
          <div className="rn-policy-register__state"><AlertCircle size={22} /> No renewal policies match these filters.</div>
        ) : viewMode === "customer" ? (
          <table className="rn-table rn-policy-register__table">
            <thead>
              <tr>
                <th style={{ width: "3.5%", textAlign: "center" }}></th>
                <th style={{ width: "30%" }}>Customer / Policy Number</th>
                <th style={{ width: "15%" }}>Mobile / Asset</th>
                <th style={{ width: "15%" }}>Policy Type</th>
                <th style={{ width: "13%" }}>Expiry Date</th>
                <th style={{ width: "13%" }}>Renewal Premium</th>
                <th style={{ width: "10.5%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customerGroups.map((group) => {
                const isExpanded = expandedCustomerKeys.has(group.customerKey);
                const distinctTypes = Array.from(
                  new Set(
                    group.policies
                      .map((p) => p.displayPolicyType || p.policyType)
                      .filter(Boolean)
                  )
                );
                const hasContactPerson = group.contactPerson && group.contactPerson.toLowerCase().trim() !== group.insuredName.toLowerCase().trim();

                return (
                  <Fragment key={group.customerKey}>
                    <tr
                      style={{ cursor: "pointer", background: "#ffffff" }}
                      onClick={() => toggleExpandCustomer(group.customerKey)}
                    >
                      <td style={{ textAlign: "center", color: isExpanded ? "#0f172a" : "#64748b" }}>
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </td>
                      <td>
                        <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#0f172a", lineHeight: 1.35 }}>
                          {group.insuredName}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", fontSize: "12px", color: "#64748b", flexWrap: "wrap" }}>
                          {hasContactPerson ? (
                            <span>{group.contactPerson}</span>
                          ) : (
                            <span>Customer Account</span>
                          )}
                          <span style={{ color: "#cbd5e1" }}>·</span>
                          <span>{group.policies.length} {group.policies.length === 1 ? "policy" : "policies"}</span>
                          {group.dueThisWeekCount > 0 && (
                            <>
                              <span style={{ color: "#cbd5e1" }}>·</span>
                              <span style={{ color: "#b45309", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                                Due this week
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="rn-policy-register__mono">{group.contactNumber || "—"}</span>
                      </td>
                      <td>
                        <span>{distinctTypes.join(", ") || "—"}</span>
                      </td>
                      <td>
                        <strong>{group.earliestExpiry ? formatRenewalRegisterDate(group.earliestExpiry) : "—"}</strong>
                      </td>
                      <td>
                        <strong>{formatRenewalRegisterAmount(group.totalPremium)}</strong>
                      </td>
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            type="button"
                            className="rn-btn"
                            style={{ padding: "4px 10px", fontSize: "12px", background: "#ffffff" }}
                            onClick={() => openCustomerAction(group.policies[0], "remark")}
                          >
                            Open
                          </button>
                          <div className="rn-dropdown">
                            <button
                              type="button"
                              className="rn-dropdown-btn"
                              aria-label={`Actions for ${group.insuredName}`}
                              aria-expanded={activeActionPolicyId === group.policies[0].id}
                              onClick={(e) => openActionMenu(group.policies[0].id, e)}
                            >
                              <MoreVertical size={15} />
                            </button>
                            {activeActionPolicyId === group.policies[0].id && typeof document !== "undefined" ? createPortal(
                              <>
                                <div className="rn-policy-register__menu-backdrop" onClick={closeActionMenu} />
                                <div
                                  className="rn-dropdown-menu"
                                  role="menu"
                                  style={{
                                    position: "fixed",
                                    zIndex: 10000,
                                    top: `${actionMenuPosition?.top || 0}px`,
                                    left: `${actionMenuPosition?.left || 0}px`,
                                    right: "auto",
                                    width: `${actionMenuPosition?.width || 230}px`,
                                    maxHeight: "calc(100vh - 24px)",
                                    overflowY: "auto",
                                  }}
                                >
                                  <ActionItem icon={<Eye />} label="View Profile" onClick={() => openCustomerAction(group.policies[0], "profile")} />
                                  <ActionItem icon={<Phone />} label="Call Customer" onClick={() => callCustomer(group.policies[0])} />
                                  <ActionItem icon={<Send />} label="Send WhatsApp" onClick={() => openCustomerAction(group.policies[0], "whatsapp")} />
                                  <ActionItem icon={<Edit3 />} label="Edit Contact" onClick={() => openCustomerAction(group.policies[0], "edit")} />
                                  <ActionItem icon={<MessageSquare />} label="Add Remark" onClick={() => openCustomerAction(group.policies[0], "remark")} />
                                  <ActionItem icon={<UserPlus />} label="Assign Agent" onClick={() => openCustomerAction(group.policies[0], "assign")} />
                                  <ActionItem icon={<FileText />} label="View Policies" onClick={() => openCustomerAction(group.policies[0], "policies")} />
                                  <ActionItem icon={<Clipboard />} label="View Renewal Timeline" onClick={() => openCustomerAction(group.policies[0], "timeline")} />
                                  <ActionItem icon={<CheckCircle />} label="Mark Renewed" onClick={() => openCustomerAction(group.policies[0], "renew")} />
                                  <ActionItem danger icon={<XCircle />} label="Mark Lost" onClick={() => openCustomerAction(group.policies[0], "lost")} />
                                </div>
                              </>,
                              document.body,
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded &&
                      group.policies.map((p) => {
                        const asset = p.vehicleNumber || p.registrationNumber || p.riskLocation || "—";
                        const cleanNo = String(p.policyNumber || "—").replace(/:+$/, "").trim();
                        const insurer = p.insuranceCompany || p.companyName || "—";
                        const pType = p.displayPolicyType || p.policyType || "—";

                        return (
                          <tr
                            key={p.id}
                            style={{ background: "#ffffff", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                            onClick={() => openCustomerAction(p, "remark")}
                          >
                            <td style={{ textAlign: "center", color: "#64748b" }}>
                              <span style={{ fontSize: "13px" }}>↳</span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingLeft: 4 }}>
                                <span className="rn-policy-register__mono" style={{ fontWeight: 600, color: "#0f172a" }}>
                                  {cleanNo}
                                </span>
                                <span style={{ fontSize: "11.5px", color: "#64748b" }}>· {insurer}</span>
                              </div>
                            </td>
                            <td>
                              <span className="rn-policy-register__mono" style={{ fontSize: "12px", color: "#475569" }}>
                                {asset}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12.5px", color: "#334155" }}>{pType}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12.5px", color: "#334155" }}>
                                {formatRenewalRegisterDate(p.expiryDate)}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>
                                {formatRenewalRegisterAmount(p.totalPremium || p.premium)}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="rn-btn"
                                style={{ padding: "3px 8px", fontSize: "11.5px", background: "#ffffff" }}
                                onClick={() => openCustomerAction(p, "remark")}
                              >
                                Action
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="rn-table rn-policy-register__table">
            <thead>
              {isCustomTable ? (
                <tr>
                  <th style={{ width: "12%" }}>Policy Type</th>
                  <th style={{ width: "10%" }}>Contact No.</th>
                  <th style={{ width: "12%" }}>Contact Person Name</th>
                  <th style={{ width: "13%" }}>Policy No.</th>
                  <th style={{ width: "18%" }}>Insured Name</th>
                  <th style={{ width: "12%" }}>Sum Insured Description</th>
                  <th style={{ width: "7.5%" }}>Premium</th>
                  <th style={{ width: "7.5%" }}>Expiry Date</th>
                  <th style={{ width: "10%" }}>Insurance Company</th>
                  <th style={{ width: "4%" }}>Action</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ width: isMotorView ? "23%" : "16%" }}>Policyholder</th>
                  <th style={{ width: isMotorView ? "16%" : "13%" }}>Policy Number</th>
                  <th style={{ width: isMotorView ? "12%" : "10%" }}>Policy Type</th>
                  <th style={{ width: isMotorView ? "13%" : "10%" }}>Vehicle / Risk</th>
                  {!isMotorView ? <th style={{ width: "7.5%" }}>Start Date</th> : null}
                  <th style={{ width: isMotorView ? "12%" : "7.5%" }}>Expiry Date</th>
                  {!isMotorView ? <th style={{ width: "8.5%" }}>Sum Insured / IDV</th> : null}
                  {!isMotorView ? <th style={{ width: "7.5%" }}>Premium</th> : null}
                  <th style={{ width: isMotorView ? "11%" : "8.5%" }}>Renewal Mobile</th>
                  <th style={{ width: isMotorView ? "9%" : "7%" }}>Status</th>
                  <th style={{ width: "4%" }}>Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {policies.map((policy) => {
                const asset = policy.vehicleNumber || policy.registrationNumber || policy.riskLocation || "—";
                const statusTone = getRenewalRegisterStatusTone(policy.renewalStatus);
                return (
                  <PolicyRegisterRow
                    key={policy.id}
                    policy={policy}
                    asset={asset}
                    statusTone={statusTone}
                    isMotorView={isMotorView}
                    isCustomTable={isCustomTable}
                    menuOpen={activeActionPolicyId === policy.id}
                    menuPosition={actionMenuPosition}
                    onOpenMenu={(event) => openActionMenu(policy.id, event)}
                    onCloseMenu={closeActionMenu}
                    onCustomerAction={openCustomerAction}
                    onCall={callCustomer}
                    onRowClick={(pol) => openCustomerAction(pol, "remark")}
                  />
                );
              })}
            </tbody>
          </table>
        )}

        <footer className="rn-pagination rn-policy-register__pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>Page {page} of {totalPages} · {totalCount.toLocaleString("en-IN")} policy rows</span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
              Per page:
              <select
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                style={{
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "12px",
                  color: "#1e293b",
                  cursor: "pointer",
                }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div>
            <button type="button" className="rn-btn" disabled={page <= 1 || loading} onClick={() => changePage(page - 1)}><ChevronLeft size={15} /> Previous</button>
            <button type="button" className="rn-btn" disabled={page >= totalPages || loading} onClick={() => changePage(page + 1)}>Next <ChevronRight size={15} /></button>
          </div>
        </footer>
      </div>   {activeDrawerPolicy && (
        <RenewalActionDrawer
          policy={activeDrawerPolicy}
          relatedPolicies={
            policies.filter(
              (p) => getPolicyCustomerKey(p) === getPolicyCustomerKey(activeDrawerPolicy)
            )
          }
          initialTab={drawerTab}
          onClose={() => setActiveDrawerPolicy(null)}
          onPolicyUpdated={handlePolicyUpdated}
          onSaveAndNext={handleSaveAndNext}
        />
      )}
    </section>
  );
}

function PolicyRegisterRow({
  policy,
  asset,
  statusTone,
  isMotorView,
  isCustomTable,
  menuOpen,
  menuPosition,
  onOpenMenu,
  onCloseMenu,
  onCustomerAction,
  onCall,
  onRowClick,
}) {
  const cleanPolicyNo = String(policy.policyNumber || "—").replace(/:+$/, "").trim();

  const actionDropdown = (
    <div className="rn-dropdown">
      <button type="button" className="rn-dropdown-btn" aria-label={`Actions for ${policy.policyNumber || policy.insuredName || "policy"}`} aria-expanded={menuOpen} onClick={onOpenMenu}>
        <MoreVertical size={16} />
      </button>
      {menuOpen && typeof document !== "undefined" ? createPortal(
        <>
          <div className="rn-policy-register__menu-backdrop" onClick={onCloseMenu} />
          <div
            className="rn-dropdown-menu"
            role="menu"
            style={{
              position: "fixed",
              zIndex: 10000,
              top: `${menuPosition?.top || 0}px`,
              left: `${menuPosition?.left || 0}px`,
              right: "auto",
              width: `${menuPosition?.width || 230}px`,
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
            }}
          >
            <ActionItem icon={<Eye />} label="View Profile" onClick={() => onCustomerAction(policy, "profile")} />
            <ActionItem icon={<Phone />} label="Call Customer" onClick={() => onCall(policy)} />
            <ActionItem icon={<Send style={{ color: "#25d366" }} />} label="Send WhatsApp" onClick={() => onCustomerAction(policy, "whatsapp")} />
            <ActionItem icon={<Edit3 />} label="Edit Contact" onClick={() => onCustomerAction(policy, "edit")} />
            <ActionItem icon={<MessageSquare />} label="Add Remark" onClick={() => onCustomerAction(policy, "remark")} />
            <ActionItem icon={<UserPlus />} label="Assign Agent" onClick={() => onCustomerAction(policy, "assign")} />
            <ActionItem icon={<FileText />} label="View Policies" onClick={() => onCustomerAction(policy, "policies")} />
            <ActionItem icon={<Clipboard />} label="View Renewal Timeline" onClick={() => onCustomerAction(policy, "timeline")} />
            <ActionItem icon={<CheckCircle style={{ color: "var(--rn-success)" }} />} label="Mark Renewed" onClick={() => onCustomerAction(policy, "renew")} />
            <ActionItem danger icon={<XCircle />} label="Mark Lost" onClick={() => onCustomerAction(policy, "lost")} />
          </div>
        </>,
        document.body,
      ) : null}
    </div>
  );

  if (isCustomTable) {
    const contactNo = policy.contactNumber || policy.renewalRecipientMobile || policy.contactPersonMobile || "—";
    const contactPerson = policy.contactPerson || policy.contactPersonName || policy.renewalRecipientName || "—";
    const sumInsuredDesc = policy.sumInsured || policy.idv || "—";
    const insurer = policy.insuranceCompany || policy.companyName || "—";
    const pType = policy.policyType || policy.displayPolicyType || "—";

    return (
      <tr className={policy.whatsappMessageSentAt ? "rn-row-whatsapp-sent" : ""} onClick={(event) => onRowClick(policy, event)}>
        <td style={{ whiteSpace: "nowrap" }}>{pType}</td>
        <td style={{ whiteSpace: "nowrap" }}><span className="rn-policy-register__mono">{contactNo}</span></td>
        <td><strong>{contactPerson}</strong></td>
        <td><span className="rn-policy-register__mono">{cleanPolicyNo}</span></td>
        <td><strong className="rn-policy-register__primary">{policy.insuredName || "Name not available"}</strong></td>
        <td>{sumInsuredDesc}</td>
        <td style={{ whiteSpace: "nowrap" }}><strong>{formatRenewalRegisterAmount(policy.totalPremium || policy.premium)}</strong></td>
        <td style={{ whiteSpace: "nowrap" }}><strong>{formatRenewalRegisterDate(policy.expiryDate)}</strong><small>{policy.daysStatus || ""}</small></td>
        <td style={{ whiteSpace: "nowrap" }}>{insurer}</td>
        <td className="rn-policy-register__actions">{actionDropdown}</td>
      </tr>
    );
  }

  return (
    <tr className={policy.whatsappMessageSentAt ? "rn-row-whatsapp-sent" : ""} onClick={(event) => onRowClick(policy, event)}>
      <td><strong className="rn-policy-register__primary">{policy.insuredName || "Name not available"}</strong></td>
      <td><span className="rn-policy-register__mono">{cleanPolicyNo}</span></td>
      <td>{policy.displayPolicyType || policy.policyType || "—"}</td>
      <td><span className="rn-policy-register__mono">{asset}</span></td>
      {!isMotorView ? <td style={{ whiteSpace: "nowrap" }}>{formatRenewalRegisterDate(policy.startDate)}</td> : null}
      <td style={{ whiteSpace: "nowrap" }}><strong>{formatRenewalRegisterDate(policy.expiryDate)}</strong>{!isMotorView ? <small>{policy.daysStatus || ""}</small> : null}</td>
      {!isMotorView ? <td style={{ whiteSpace: "nowrap" }}>{formatRenewalRegisterAmount(policy.sumInsured || policy.idv)}</td> : null}
      {!isMotorView ? <td style={{ whiteSpace: "nowrap" }}>{formatRenewalRegisterAmount(policy.totalPremium || policy.premium)}</td> : null}
      <td style={{ whiteSpace: "nowrap" }}>{policy.renewalRecipientMobile || policy.contactNumber || "—"}</td>
      <td style={{ whiteSpace: "nowrap" }}><span className={`rn-policy-register__status rn-policy-register__status--${statusTone}`}>{String(policy.renewalStatus || "unknown").replaceAll("_", " ")}</span></td>
      <td className="rn-policy-register__actions">{actionDropdown}</td>
    </tr>
  );
}


function ActionItem({ icon, label, onClick, danger = false }) {
  return <button type="button" role="menuitem" className={`rn-dropdown-item${danger ? " rn-dropdown-item-danger" : ""}`} onClick={onClick}>{icon}{label}</button>;
}
