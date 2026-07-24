"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Edit3,
  Eye,
  FileText,
  MessageSquare,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  RENEWAL_REGISTER_CATEGORY_TABS,
  RENEWAL_REGISTER_MONTHS,
  RENEWAL_REGISTER_POLICY_TYPES,
  formatRenewalRegisterAmount,
  formatRenewalRegisterDate,
  formatRenewalRegisterDueIn,
  getRenewalRegisterMonthLabel,
  getRenewalRegisterStatusTone,
  normalizeRenewalRegisterMonth,
} from "@/lib/renewals/register";

const PAGE_SIZE = 25;
const CONTEXT_TABS = new Set(["register", "all", "due_today", "due_7", "due_30"]);

function getPolicyCustomerKey(policy) {
  const digits = String(policy.contactNumber || "").replace(/\D/g, "");
  return policy.customerPortfolioId || (digits.length >= 10 ? digits.slice(-10) : `NO-MOBILE-${policy.id}`);
}

function formatHoverStatus(value) {
  return String(value || "Active")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getHoverCardPosition(clientX, clientY) {
  const cardWidth = 340;
  const cardHeight = 520;
  const gap = 14;
  return {
    left: clientX + cardWidth + gap > window.innerWidth
      ? Math.max(12, clientX - cardWidth - gap)
      : clientX + gap,
    top: clientY + cardHeight + gap > window.innerHeight
      ? Math.max(12, clientY - cardHeight - gap)
      : clientY + gap,
  };
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({ all: 0, motor: 0, warehouse: 0, other: 0 });
  const [activeActionPolicyId, setActiveActionPolicyId] = useState("");
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hoverCard, setHoverCard] = useState(null);
  const hoverRequestRef = useRef(0);
  const hoverCacheRef = useRef(new Map());
  const infoCardOpen = hoverCard !== null;

  useEffect(() => {
    if (!infoCardOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (event.target.closest?.(".rn-policy-register__table tbody tr")) return;
      hoverRequestRef.current += 1;
      setHoverCard(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [infoCardOpen]);

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
    setInitialized(true);
  }, []);

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
        const params = new window.URLSearchParams({ tab: contextTab, page: String(page), limit: String(PAGE_SIZE) });
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
  }, [company, contextTab, initialized, page, policyType, query, refreshKey, renewalMonth]);

  const syncUrl = (updates = {}) => {
    const next = { query, policyType, company, renewalMonth, page, ...updates };
    const params = new window.URLSearchParams();
    if (contextTab !== "register") params.set("tab", contextTab);
    if (next.query) params.set("q", next.query);
    if (next.policyType !== "All") params.set("policyType", next.policyType);
    if (next.company !== "All") params.set("company", next.company);
    if (next.renewalMonth !== "All") params.set("month", next.renewalMonth);
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
    setHoverCard(null);
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

  const showPolicyInfoCard = async (policy, event) => {
    if (activeActionPolicyId) return;
    if (hoverCard?.policy.id === policy.id) {
      hoverRequestRef.current += 1;
      setHoverCard(null);
      return;
    }

    const requestId = ++hoverRequestRef.current;
    const { top, left } = getHoverCardPosition(event.clientX, event.clientY);
    const customerKey = getPolicyCustomerKey(policy);
    const cached = hoverCacheRef.current.get(customerKey);

    setHoverCard({ policy, top, left, details: cached || null, loading: !cached });
    if (cached) return;

    try {
      const response = await fetch(`/api/renewals/customers/${encodeURIComponent(customerKey)}?policyId=${encodeURIComponent(policy.id)}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) return;

      const nearestPolicy = (payload.policies || [])
        .filter((item) => item.expiryDate)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
      const profilePhone = String(payload.profile?.phone || "");
      const details = {
        name: payload.profile?.contactPerson || payload.profile?.name || policy.insuredName || "Contact Details",
        phone: profilePhone.replace(/\D/g, "").length >= 10
          ? profilePhone
          : policy.renewalRecipientMobile || policy.contactNumber || "N/A",
        status: payload.profile?.customerStatus || policy.renewalStatus,
        totalCompanies: payload.stats?.totalCompanies ?? "—",
        totalPolicies: payload.stats?.totalPolicies ?? "—",
        policiesDue: payload.stats?.policiesDue ?? "—",
        nearestExpiry: nearestPolicy?.expiryDate || policy.expiryDate,
        assignee: payload.profile?.assignedTo || policy.assignedTo || "Unassigned",
      };
      hoverCacheRef.current.set(customerKey, details);
      if (hoverRequestRef.current === requestId) {
        setHoverCard((current) => current ? { ...current, details, loading: false } : null);
      }
    } catch {
      if (hoverRequestRef.current === requestId) {
        setHoverCard((current) => current ? { ...current, loading: false } : null);
      }
    }
  };

  const openCustomerAction = (policy, action = "") => {
    const customerKey = getPolicyCustomerKey(policy);
    const returnTo = `${window.location.pathname}${window.location.search}`;
    const params = new window.URLSearchParams({ returnTo, policyId: policy.id });
    if (action) params.set("action", action);
    window.sessionStorage.setItem("rn-customer-return-url", returnTo);
    window.sessionStorage.setItem("rn-customer-scroll-y", String(window.scrollY || 0));
    closeActionMenu();
    router.push(`/dashboard/renewals/customers/${encodeURIComponent(customerKey)}?${params}`);
  };

  const callCustomer = (policy) => {
    const digits = String(policy.renewalRecipientMobile || policy.contactNumber || "").replace(/\D/g, "");
    closeActionMenu();
    if (digits.length >= 10) window.open(`tel:${digits.slice(-10)}`);
    else window.alert("No contact number available for this policy.");
  };

  const selectedMonthLabel = renewalMonth === "All" ? "" : getRenewalRegisterMonthLabel(renewalMonth);
  const contextTitle = {
    all: "Pending Renewals",
    due_today: "Renewals Expiring Today",
    due_7: "Renewals Due Within 7 Days",
    due_30: "Renewals Due Within 30 Days",
  }[contextTab];
  const isMotorView = policyType === "Motor";

  return (
    <section className="rn-policy-register">
      <div className="rn-policy-register__intro">
        <div>
          <p>Policy-wise register</p>
          <h2>{contextTitle || (selectedMonthLabel ? `${selectedMonthLabel} Renewals` : "All Renewals")}</h2>
          <span>Every renewal is shown as its own policy row. No customer grouping is applied.</span>
        </div>
        <strong>{totalCount.toLocaleString("en-IN")} policies</strong>
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

      <div className="rn-table-container rn-policy-register__table-shell">
        <div className="rn-lob-tabs" aria-label="Renewal policy categories">
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
        {error ? (
          <div className="rn-policy-register__state rn-policy-register__state--error">
            <AlertCircle size={22} />
            <strong>{error}</strong>
            <button type="button" className="rn-btn" onClick={() => setRefreshKey((current) => current + 1)}>Retry</button>
          </div>
        ) : loading ? (
          <div className="rn-policy-register__state"><span className="rn-policy-register__spinner" /> Loading policy-wise renewals...</div>
        ) : policies.length === 0 ? (
          <div className="rn-policy-register__state"><AlertCircle size={22} /> No renewal policies match these filters.</div>
        ) : (
          <table className="rn-table rn-policy-register__table">
            <thead>
              <tr>
                <th style={{ width: isMotorView ? "17%" : "14%" }}>Policyholder</th>
                <th style={{ width: isMotorView ? "14%" : "12%" }}>Policy Number</th>
                <th style={{ width: isMotorView ? "12%" : "10%" }}>Policy Type</th>
                <th style={{ width: isMotorView ? "12%" : "10%" }}>Vehicle / Risk</th>
                {!isMotorView ? <th style={{ width: "8%" }}>Start Date</th> : null}
                <th style={{ width: isMotorView ? "11%" : "8%" }}>Expiry Date</th>
                {!isMotorView ? <th style={{ width: "9%" }}>Sum Insured / IDV</th> : null}
                <th style={{ width: isMotorView ? "9%" : "8%" }}>Premium</th>
                <th style={{ width: isMotorView ? "11%" : "9%" }}>Renewal Mobile</th>
                <th style={{ width: isMotorView ? "8%" : "6%" }}>Status</th>
                <th style={{ width: "3.5%" }}>Actions</th>
              </tr>
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
                    menuOpen={activeActionPolicyId === policy.id}
                    menuPosition={actionMenuPosition}
                    onOpenMenu={(event) => openActionMenu(policy.id, event)}
                    onCloseMenu={closeActionMenu}
                    onCustomerAction={openCustomerAction}
                    onCall={callCustomer}
                    onRowClick={showPolicyInfoCard}
                  />
                );
              })}
            </tbody>
          </table>
        )}

        <footer className="rn-pagination rn-policy-register__pagination">
          <span>Page {page} of {totalPages} · {totalCount.toLocaleString("en-IN")} policy rows</span>
          <div>
            <button type="button" className="rn-btn" disabled={page <= 1 || loading} onClick={() => changePage(page - 1)}><ChevronLeft size={15} /> Previous</button>
            <button type="button" className="rn-btn" disabled={page >= totalPages || loading} onClick={() => changePage(page + 1)}>Next <ChevronRight size={15} /></button>
          </div>
        </footer>
      </div>
      {hoverCard && typeof document !== "undefined" ? createPortal(
        <div
          className="rn-hover-card rn-policy-register__hover-card"
          style={{ position: "fixed", top: `${hoverCard.top}px`, left: `${hoverCard.left}px` }}
          role="note"
          aria-label="Customer and policy information"
        >
          <h4 className="rn-hover-title">
            {hoverCard.details?.name || hoverCard.policy.contactPersonName || hoverCard.policy.insuredName || "Contact Details"}
          </h4>
          <div className="rn-hover-grid rn-policy-register__customer-grid">
            <HoverInfo label="Phone" value={hoverCard.details?.phone || hoverCard.policy.renewalRecipientMobile || hoverCard.policy.contactNumber || "N/A"} />
            <HoverInfo label="Status" value={formatHoverStatus(hoverCard.details?.status || hoverCard.policy.renewalStatus)} />
            <HoverInfo label="Companies" value={hoverCard.details?.totalCompanies ?? (hoverCard.loading ? "Loading…" : "—")} />
            <HoverInfo label="Total Policies" value={hoverCard.details?.totalPolicies ?? (hoverCard.loading ? "Loading…" : "—")} />
            <HoverInfo label="Policies Due" value={hoverCard.details?.policiesDue ?? (hoverCard.loading ? "Loading…" : "—")} />
            <HoverInfo label="Nearest Expiry" value={formatRenewalRegisterDate(hoverCard.details?.nearestExpiry || hoverCard.policy.expiryDate)} />
            <HoverInfo full label="Assignee" value={hoverCard.details?.assignee || hoverCard.policy.assignedTo || "Unassigned"} />
          </div>
          <div className="rn-policy-register__hover-section-title">Policy Details</div>
          <div className="rn-hover-grid rn-policy-register__hover-policy-grid">
            <HoverInfo full label="Policyholder" value={hoverCard.policy.insuredName || "Name not available"} />
            <HoverInfo label="Policy Number" value={hoverCard.policy.policyNumber || "—"} />
            <HoverInfo label="Policy Type" value={hoverCard.policy.displayPolicyType || hoverCard.policy.policyType || "—"} />
            <HoverInfo label="Insurance Company" value={hoverCard.policy.insuranceCompany || "—"} />
            <HoverInfo label="Vehicle / Risk" value={hoverCard.policy.vehicleNumber || hoverCard.policy.registrationNumber || hoverCard.policy.riskLocation || "—"} />
            <HoverInfo label="Expiry Date" value={formatRenewalRegisterDate(hoverCard.policy.expiryDate)} />
            <HoverInfo label="Due In" value={formatRenewalRegisterDueIn(hoverCard.policy.daysRemaining)} />
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}

function PolicyRegisterRow({
  policy,
  asset,
  statusTone,
  isMotorView,
  menuOpen,
  menuPosition,
  onOpenMenu,
  onCloseMenu,
  onCustomerAction,
  onCall,
  onRowClick,
}) {
  const cleanPolicyNo = String(policy.policyNumber || "—").replace(/:+$/, "").trim();
  return (
    <tr className={policy.whatsappMessageSentAt ? "rn-row-whatsapp-sent" : ""} onClick={(event) => onRowClick(policy, event)}>
      <td><strong className="rn-policy-register__primary">{policy.insuredName || "Name not available"}</strong></td>
      <td><span className="rn-policy-register__mono">{cleanPolicyNo}</span></td>
      <td>{policy.displayPolicyType || policy.policyType || "—"}</td>
      <td><span className="rn-policy-register__mono">{asset}</span></td>
      {!isMotorView ? <td style={{ whiteSpace: "nowrap" }}>{formatRenewalRegisterDate(policy.startDate)}</td> : null}
      <td style={{ whiteSpace: "nowrap" }}><strong>{formatRenewalRegisterDate(policy.expiryDate)}</strong>{!isMotorView ? <small>{policy.daysStatus || ""}</small> : null}</td>
      {!isMotorView ? <td style={{ whiteSpace: "nowrap" }}>{formatRenewalRegisterAmount(policy.sumInsured || policy.idv)}</td> : null}
      <td style={{ whiteSpace: "nowrap" }}>{formatRenewalRegisterAmount(policy.totalPremium || policy.premium)}</td>
      <td style={{ whiteSpace: "nowrap" }}>{policy.renewalRecipientMobile || policy.contactNumber || "—"}</td>
      <td style={{ whiteSpace: "nowrap" }}><span className={`rn-policy-register__status rn-policy-register__status--${statusTone}`}>{String(policy.renewalStatus || "unknown").replaceAll("_", " ")}</span></td>
      <td className="rn-policy-register__actions">
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
                <ActionItem icon={<Eye />} label="View Profile" onClick={() => onCustomerAction(policy)} />
                <ActionItem icon={<Phone />} label="Call Customer" onClick={() => onCall(policy)} />
                <ActionItem icon={<Send style={{ color: "#25d366" }} />} label="Send WhatsApp" onClick={() => onCustomerAction(policy, "whatsapp")} />
                <ActionItem icon={<Edit3 />} label="Edit Contact" onClick={() => onCustomerAction(policy, "edit")} />
                <ActionItem icon={<MessageSquare />} label="Add Remark" onClick={() => onCustomerAction(policy, "remark")} />
                <ActionItem icon={<UserPlus />} label="Assign Agent" onClick={() => onCustomerAction(policy, "assign")} />
                <ActionItem icon={<FileText />} label="View Policies" onClick={() => onCustomerAction(policy)} />
                <ActionItem icon={<Clipboard />} label="View Renewal Timeline" onClick={() => onCustomerAction(policy, "timeline")} />
                <ActionItem icon={<CheckCircle style={{ color: "var(--rn-success)" }} />} label="Mark Renewed" onClick={() => onCustomerAction(policy, "renew")} />
                <ActionItem danger icon={<XCircle />} label="Mark Lost" onClick={() => onCustomerAction(policy, "lost")} />
              </div>
            </>,
            document.body,
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function HoverInfo({ label, value, full = false }) {
  return (
    <div className={`rn-hover-item${full ? " rn-hover-item-full" : ""}`}>
      <span className="rn-hover-label">{label}</span>
      <span className="rn-hover-value">{value}</span>
    </div>
  );
}

function ActionItem({ icon, label, onClick, danger = false }) {
  return <button type="button" role="menuitem" className={`rn-dropdown-item${danger ? " rn-dropdown-item-danger" : ""}`} onClick={onClick}>{icon}{label}</button>;
}
