import { Users } from "lucide-react";
import Metric from "../shared/Metric";
import PdfLink from "../shared/PdfLink";
import { formatMoney } from "@/lib/analytics";

export default function ClientProfile({ client, onBack, onPolicySelect }) {
  return (
    <div className="client-profile">
      <div className="profile-head">
        <div className="profile-title-block">
          <div className="profile-avatar"><Users size={20} /></div>
          <div>
            <p className="eyebrow">Client Profile</p>
            <h2>{client.name} {client.customerId ? <span style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: "500" }}>(#{client.customerId})</span> : null}</h2>
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
                <th>Vehicle No.</th>
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
                  <td>
                    <button className="policy-number-link" type="button" onClick={() => onPolicySelect(record.id)}>
                      {record.policyNumber || "No policy number"}
                    </button>
                  </td>
                  <td><strong>{record.vehicleNumber || record.registrationNumber || "-"}</strong></td>
                  <td>{record.policyType || record.sourceFile || "Policy document"}</td>
                  <td>{formatMoney(record.premium)}</td>
                  <td>{formatMoney(record.sumInsured)}</td>
                  <td>{record.startDate || "-"} - {record.expiryDate || "-"}</td>
                  <td>
                    {record.hasPdf ? (
                      <PdfLink href={`/api/records/${record.id}/pdf`} title="Download PDF" ariaLabel="Download PDF" />
                    ) : (
                      <span className="missing-pdf compact" style={{ color: "#d93025", fontWeight: "700" }}>PDF Missing</span>
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
