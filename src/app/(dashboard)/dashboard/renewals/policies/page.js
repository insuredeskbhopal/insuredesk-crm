"use client";

import { useEffect, useState } from "react";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({ all: 0, motor: 0, warehouse: 0, other: 0 });
  const [activeActionPolicyId, setActiveActionPolicyId] = useState("");
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new window.URLSearchParams(window.location.search);
    const initialQuery = params.get("q") || "";
    setQueryDraft(initialQuery);
    setQuery(initialQuery);
    setPolicyType(params.get("policyType") || "All");
    setCompany(params.get("company") || "All");
    setRenewalMonth(normalizeRenewalRegisterMonth(params.get("month")));
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
        const params = new window.URLSearchParams({ tab: "register", page: String(page), limit: String(PAGE_SIZE) });
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
  }, [company, initialized, page, policyType, query, refreshKey, renewalMonth]);

  const syncUrl = (updates = {}) => {
    const next = { query, policyType, company, renewalMonth, page, ...updates };
    const params = new window.URLSearchParams();
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
    router.replace("/dashboard/renewals/policies", { scroll: false });
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

  const openCustomerAction = (policy, action = "") => {
    const digits = String(policy.contactNumber || "").replace(/\D/g, "");
    const customerKey = policy.customerPortfolioId || (digits.length >= 10 ? digits.slice(-10) : `NO-MOBILE-${policy.id}`);
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
  const isMotorView = policyType === "Motor";

  return (
    <section className="rn-policy-register">
      <div className="rn-policy-register__intro">
        <div>
          <p>Policy-wise register</p>
          <h2>{selectedMonthLabel ? `${selectedMonthLabel} Renewals` : "All Renewals"}</h2>
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
                <th>Policyholder</th><th>Policy Number</th><th>Policy Type</th><th>Company</th><th>Vehicle / Risk</th>
                {!isMotorView ? <th>Start Date</th> : null}
                <th>Expiry Date</th>
                {isMotorView ? <th>Due In</th> : <th>Sum Insured / IDV</th>}
                <th>Premium</th><th>Renewal Mobile</th><th>WhatsApp Status</th><th>Status</th><th>Actions</th>
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
}) {
  return (
    <tr>
      <td><strong className="rn-policy-register__primary">{policy.insuredName || "Name not available"}</strong></td>
      <td><span className="rn-policy-register__mono">{policy.policyNumber || "—"}</span></td>
      <td>{policy.displayPolicyType || policy.policyType || "—"}</td>
      <td>{policy.insuranceCompany || "—"}</td>
      <td>{asset}</td>
      {!isMotorView ? <td>{formatRenewalRegisterDate(policy.startDate)}</td> : null}
      <td><strong>{formatRenewalRegisterDate(policy.expiryDate)}</strong>{!isMotorView ? <small>{policy.daysStatus || ""}</small> : null}</td>
      {isMotorView ? <td><strong>{formatRenewalRegisterDueIn(policy.daysRemaining)}</strong></td> : <td>{formatRenewalRegisterAmount(policy.sumInsured || policy.idv)}</td>}
      <td>{formatRenewalRegisterAmount(policy.totalPremium || policy.premium)}</td>
      <td>{policy.renewalRecipientMobile || policy.contactNumber || "—"}</td>
      <td>
        <span className={`rn-policy-register__status rn-policy-register__status--${policy.whatsappMessageSentAt ? "success" : "neutral"}`}>
          {policy.whatsappMessageSentAt ? "Sent" : "Not sent"}
        </span>
        {policy.whatsappMessageSentAt ? <small>{formatRenewalRegisterDate(policy.whatsappMessageSentAt)}</small> : null}
      </td>
      <td><span className={`rn-policy-register__status rn-policy-register__status--${statusTone}`}>{String(policy.renewalStatus || "unknown").replaceAll("_", " ")}</span></td>
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

function ActionItem({ icon, label, onClick, danger = false }) {
  return <button type="button" role="menuitem" className={`rn-dropdown-item${danger ? " rn-dropdown-item-danger" : ""}`} onClick={onClick}>{icon}{label}</button>;
}
