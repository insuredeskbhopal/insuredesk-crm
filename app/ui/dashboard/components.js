import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle,
  CircleHelp,
  Download,
  LayoutDashboard,
  LogOut,
  Search,
  Users,
  X
} from "lucide-react";
import { formatDate, formatMoney } from "./helpers";

export function TopNavigation({ query, onQueryChange }) {
  return (
    <header className="top-bar">
      <div className="top-brand">
        <strong>InsurCRM</strong>
        <nav>
          <a href="#explore">Explore</a>
          <a className="active" href="#bulk">Bulk PDF Upload</a>
        </nav>
      </div>

      <div className="top-actions">
        <label className="global-search">
          <Search size={18} />
          <input value={query} placeholder="Search policies..." onChange={(event) => onQueryChange(event.target.value)} />
        </label>
        <button className="icon-button" type="button" aria-label="Calendar">
          <CalendarDays size={19} />
        </button>
        <button className="icon-button has-dot" type="button" aria-label="Notifications">
          <Bell size={19} />
        </button>
        <div className="avatar">IC</div>
      </div>
    </header>
  );
}

export function Sidebar({ activePage, navItems, onPageChange }) {
  return (
    <aside className="side-nav">
      <div className="portal-title">
        <h1>InsurCRM</h1>
        <p>Enterprise Portal</p>
      </div>

      <nav>
        <button type="button" onClick={() => onPageChange("dashboard")}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={activePage === item.id ? "active" : ""} type="button" key={item.id} onClick={() => onPageChange(item.id)}>
              <Icon size={20} /> {item.label}
            </button>
          );
        })}
      </nav>

      <div className="side-footer">
        <button type="button"><CircleHelp size={20} /> Help Center</button>
        <button type="button"><LogOut size={20} /> Logout</button>
      </div>
    </aside>
  );
}

export function PreviewField({ label, value, onChange, type = "text", wide }) {
  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AlertCard({ alert, onDismiss }) {
  const isError = alert.type === "error";
  return (
    <section className={`alert-card ${alert.type || "info"}`} role={isError ? "alert" : "status"}>
      <div className="alert-icon">
        {isError ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
      </div>
      <div>
        <strong>{alert.title}</strong>
        <p>{alert.message}</p>
      </div>
      <button className="alert-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss alert">
        <X size={15} />
      </button>
    </section>
  );
}

export function ClientProfile({ client, onBack }) {
  return (
    <div className="client-profile">
      <div className="profile-head">
        <div className="profile-title-block">
          <div className="profile-avatar"><Users size={20} /></div>
          <div>
            <p className="eyebrow">Client Profile</p>
            <h2>{client.name}</h2>
            <span>
              {client.policies.length} linked polic{client.policies.length === 1 ? "y" : "ies"}
              {client.district ? ` · ${client.district}` : ""}
              {client.contactNumber ? ` · ${client.contactNumber}` : ""}
            </span>
          </div>
        </div>
        <button type="button" onClick={onBack}>Back to Clients</button>
      </div>

      <section className="profile-metrics">
        <Metric label="Total premium" value={formatMoney(client.premiumTotal)} />
        <Metric label="Total sum insured" value={formatMoney(client.sumInsuredTotal)} />
        <Metric label="District" value={client.district || "-"} />
        <Metric label="Contact" value={client.contactNumber || "-"} />
      </section>

      <div className="policy-table-card">
        <div className="policy-table-head">
          <h3>Linked Policies ({client.policies.length})</h3>
        </div>
        <div className="table-wrap compact-table">
          <table>
            <thead>
              <tr>
                <th>Policy No.</th>
                <th>Type</th>
                <th>Premium</th>
                <th>Sum Insured</th>
                <th>Effective Dates</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {client.policies.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.policyNumber || "No policy number"}</strong></td>
                  <td>{record.policyType || record.sourceFile || "Policy document"}</td>
                  <td>{formatMoney(record.premium)}</td>
                  <td>{formatMoney(record.sumInsured)}</td>
                  <td>{record.startDate || "-"} - {record.expiryDate || "-"}</td>
                  <td>
                    {record.hasPdf ? (
                      <a className="pdf-icon-link" href={`/api/records/${record.id}/pdf`} title="Download PDF" aria-label="Download PDF">
                        <Download size={14} />
                      </a>
                    ) : (
                      <span className="missing-pdf compact">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function RecordsTable({ records }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sr No</th>
            <th>Saved At</th>
            <th>Insured Name</th>
            <th>Contact No.</th>
            <th>Contact Person Name</th>
            <th>Group Name</th>
            <th>Policy No.</th>
            <th>Policy Type</th>
            <th>Sum Insured</th>
            <th>Premium</th>
            <th>Start Date</th>
            <th>Expiry Date</th>
            <th>Duration</th>
            <th>Risk Location</th>
            <th>District</th>
            <th>Tehsil</th>
            <th>Insurance Company</th>
            <th>Description / Non Declaration</th>
            <th>PPT / MPWLC</th>
            <th>Occupancy</th>
            <th>Valid In</th>
            <th>Source File</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {records.length ? records.map((record) => (
            <tr key={record.id}>
              <td>{record.srNo || ""}</td>
              <td>{formatDate(record.savedAt)}</td>
              <td>{record.insuredName || ""}</td>
              <td>{record.contactNumber || ""}</td>
              <td>{record.contactPerson || ""}</td>
              <td>{record.groupName || ""}</td>
              <td>{record.policyNumber || ""}</td>
              <td>{record.policyType || ""}</td>
              <td>{record.sumInsured || ""}</td>
              <td>{record.premium || ""}</td>
              <td>{record.startDate || ""}</td>
              <td>{record.expiryDate || ""}</td>
              <td>{record.duration || ""}</td>
              <td>{record.riskLocation || ""}</td>
              <td>{record.district || ""}</td>
              <td>{record.tehsil || ""}</td>
              <td>{record.insuranceCompany || ""}</td>
              <td>{record.description || ""}</td>
              <td>{record.pptMpwlc || ""}</td>
              <td>{record.occupancy || ""}</td>
              <td>{record.validIn || ""}</td>
              <td>{record.sourceFile || ""}</td>
              <td>
                {record.hasPdf ? (
                  <a className="pdf-icon-link" href={`/api/records/${record.id}/pdf`} title="Download PDF" aria-label="Download PDF">
                    <Download size={14} />
                  </a>
                ) : "-"}
              </td>
            </tr>
          )) : (
            <tr>
              <td className="empty" colSpan={23}>No database records yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
