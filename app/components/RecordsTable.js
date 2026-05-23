import { Download } from "lucide-react";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN");
}

export default function RecordsTable({ records }) {
  return (
    <div className="table-wrap records-table-wrap">
      <table className="records-table">
        <colgroup>
          <col className="col-sr" />
          <col className="col-saved" />
          <col className="col-insured" />
          <col className="col-contact" />
          <col className="col-contact-person" />
          <col className="col-group" />
          <col className="col-policy" />
          <col className="col-type" />
          <col className="col-money" />
          <col className="col-money" />
          <col className="col-date" />
          <col className="col-date" />
          <col className="col-duration" />
          <col className="col-location" />
          <col className="col-district" />
          <col className="col-tehsil" />
          <col className="col-company" />
          <col className="col-description" />
          <col className="col-ppt" />
          <col className="col-occupancy" />
          <col className="col-valid" />
          <col className="col-source" />
          <col className="col-pdf" />
        </colgroup>
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
              <td><strong className="record-primary">{record.insuredName || ""}</strong></td>
              <td>{record.contactNumber || ""}</td>
              <td>{record.contactPerson || ""}</td>
              <td>{record.groupName || ""}</td>
              <td><span className="record-code">{record.policyNumber || ""}</span></td>
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
