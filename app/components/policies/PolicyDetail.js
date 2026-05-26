import { FileText, Download } from "lucide-react";
import Metric from "../shared/Metric";
import PdfLink from "../shared/PdfLink";
import { formatMoney } from "@/lib/analytics";

export default function PolicyDetail({ client, record, onBack }) {
  return (
    <div className="policy-detail-page">
      <div className="profile-head">
        <div className="profile-title-block">
          <div className="profile-avatar"><FileText size={20} /></div>
          <div>
            <p className="eyebrow">Policy Detail</p>
            <h2>{record.policyNumber || "No policy number"}</h2>
            <span>{client.name} {record.policyType ? `- ${record.policyType}` : ""}</span>
          </div>
        </div>
        <button type="button" onClick={onBack}>Back to Profile</button>
      </div>

      <section className="profile-metrics">
        <Metric label="Client" value={client.name} />
        <Metric label="Premium" value={formatMoney(record.premium)} />
        <Metric label="Sum insured" value={formatMoney(record.sumInsured)} />
        <Metric label="Validity" value={`${record.startDate || "-"} - ${record.expiryDate || "-"}`} />
      </section>

      <section className="policy-detail-grid">
        <DetailGroup title="Client Details" items={[
          ["Insured Name", client.name],
          ["Contact", client.contactNumber || record.contactNumber || "-"],
          ["District", record.district || client.district || "-"],
          ["Tehsil", record.tehsil || client.tehsil || "-"],
          ["Group Name", record.groupName || "-"],
          ["Contact Person", record.contactPerson || "-"]
        ]} />
        <DetailGroup title="Policy Details" items={[
          ["Policy No.", record.policyNumber || "-"],
          ["Policy Type", record.policyType || "-"],
          ["Insurance Company", record.insuranceCompany || "-"],
          ["Duration", record.duration || "-"],
          ["PPT / MPWLC", record.pptMpwlc || "-"],
          ["Valid In", record.validIn || "-"]
        ]} />
        <DetailGroup title="Risk & Description" wide items={[
          ["Risk Location", record.riskLocation || "-"],
          ["Occupancy", record.occupancy || "-"],
          ["Description / Non Declaration", record.description || "-"],
          ["Source File", record.sourceFile || record.pdfFileName || "-"]
        ]} />
      </section>

      {record.hasPdf ? (
        <PdfLink className="pdf-link policy-detail-pdf" href={`/api/records/${record.id}/pdf`}>
          <Download size={14} /> Download PDF
        </PdfLink>
      ) : null}
    </div>
  );
}

function DetailGroup({ title, items, wide }) {
  return (
    <section className={`detail-group ${wide ? "wide" : ""}`}>
      <h3>{title}</h3>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
