import { FileText, Download, X } from "lucide-react";
import Metric from "../shared/Metric";
import PdfLink from "../shared/PdfLink";
import InsurerLogo from "@/app/components/brand/InsurerLogo";
import { formatMoney } from "@/lib/records/analytics";

export default function PolicyDetail({ client, record, onBack }) {
  const isMotorPolicy = Boolean(
    record.vehicleNumber ||
    record.registrationNumber ||
    record.engineNumber ||
    record.chassisNumber ||
    /\b(motor|private\s+car|two\s+wheeler|commercial\s+vehicle)\b/i.test(record.policyType || ""),
  );
  const clientDetailItems = [
    ["Insured Name", client.name],
    ["Contact", client.contactNumber || record.contactNumber || "-"],
    ["Contact Person", record.contactPerson || "-"],
    ["WhatsApp Group Name", record.whatsappGroupName || "-"],
  ];
  const policyDetailItems = [
    ["Policy No.", record.policyNumber || "-"],
    ["Policy Type", record.policyType || "-"],
    ["Insurance Company", <InsurerLogo company={record.insuranceCompany} key="insurer-logo" />],
    ["Duration", record.duration || "-"],
    ["PPT / MPWLC", record.pptMpwlc || "-"],
  ];

  if (!isMotorPolicy) {
    clientDetailItems.splice(
      2,
      0,
      ["District", record.district || client.district || "-"],
      ["Tehsil", record.tehsil || client.tehsil || "-"],
      ["Group Name", record.groupName || "-"],
    );
    policyDetailItems.push(["Valid In", record.validIn || "-"]);
  }

  return (
    <div className="policy-detail-page">
      <div className="profile-head">
        <div className="profile-title-block">
          <div className="profile-avatar">
            <FileText size={20} />
          </div>
          <div>
            <p className="eyebrow">Policy Detail</p>
            <h2>{record.policyNumber || "No policy number"}</h2>
            <span>
              {client.name} {record.policyType ? `- ${record.policyType}` : ""}
            </span>
          </div>
        </div>
        <button type="button" onClick={onBack}>
          Back to Profile
        </button>
      </div>

      <section className="profile-metrics">
        <Metric label="Client" value={client.name} />
        <Metric label="Premium" value={formatMoney(record.premium)} />
        <Metric label="Sum insured" value={formatMoney(record.sumInsured)} />
        <Metric label="Validity" value={`${record.startDate || "-"} - ${record.expiryDate || "-"}`} />
      </section>

      <section className="policy-detail-grid">
        <DetailGroup title="Client Details" items={clientDetailItems} />
        <DetailGroup title="Policy Details" items={policyDetailItems} />
        {!isMotorPolicy ? (
          <DetailGroup
            title="Risk & Description"
            wide
            items={[
              ["Risk Location", record.riskLocation || "-"],
              ["Occupancy", record.occupancy || "-"],
              ["Description / Non Declaration", record.description || "-"],
              ["Source File", record.sourceFile || record.pdfFileName || "-"],
            ]}
          />
        ) : null}
      </section>

      {record.hasPdf ? (
        <PdfLink className="pdf-link policy-detail-pdf" href={`/api/records/${record.id}/pdf`}>
          <Download size={14} /> Download PDF
        </PdfLink>
      ) : (
        <div
          className="policy-detail-pdf-missing"
          style={{
            color: "#d93025",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          <X size={16} /> PDF is missing
        </div>
      )}
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
