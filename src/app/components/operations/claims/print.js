import { SURVEYOR_FIELDS } from "./config";
import { formatDate, getClaimSpecificFields } from "./utils";

export function printClaim(record) {
  if (!record) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Please allow popups to print claim details.");
    return;
  }

  printWindow.document.write(buildClaimPrintHtml(record, window.location.origin));
  printWindow.document.close();
}

export function buildClaimPrintHtml(record, origin = "") {
  const claimDetails = record.claimDetails || {};
  const surveyorDetails = record.surveyorDetails || {};
  const remarks = record.remarks || [];

  return `<!doctype html>
    <html>
      <head>
        <title>Claim Details - ${escapeHtml(record.claimNo || "Record")}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            padding: 16px;
            line-height: 1.3;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .header-info h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
          }
          .header-info p {
            margin: 0 0 2px;
            color: #64748b;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .print-logo {
            height: 94px;
            width: auto;
            object-fit: contain;
          }
          .section {
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .section h3 {
            margin: 0 0 6px;
            font-size: 12px;
            font-weight: 700;
            color: #1e3a8a;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 4px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
          }
          .field {
            padding: 5px 8px;
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 4px;
          }
          .label {
            font-size: 8px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            display: block;
            margin-bottom: 1px;
            letter-spacing: 0.5px;
          }
          .value {
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
            word-break: break-all;
          }
          .remark {
            padding: 6px;
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 4px;
            font-size: 10px;
          }
          .remark-meta {
            color: #64748b;
            margin-top: 2px;
          }
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            body {
              zoom: 82%;
            }
            .field {
              background: #f8fafc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-info">
            <p>Claim Record Details</p>
            <h1>${escapeHtml(record.claimNo || "No Claim Number")}</h1>
          </div>
          <img src="${escapeHtml(`${origin}/brand/main-logo-wide.webp`)}" alt="Bima Headquarter" class="print-logo" />
        </div>

        ${renderPrintSection("General Information", [
          ["Internal Claim ID", record.internalClaimId],
          ["Customer ID", record.customerId],
          ["Insured Name", record.insuredName],
          ["Mobile No.", record.mobileNo],
          ["Contact Person", record.contactPerson],
          ["Policy No.", record.policyNo],
          ["Insurance Company", record.insuranceCompany],
          ["Claim No.", record.claimNo],
          ["Group Name", record.groupName],
          ["Assigned Executive", record.assignedExecutive],
          ["Branch Office", record.branchOffice],
          ["Policy Start Date", formatDate(record.policyStartDate)],
          ["Policy Expiry Date", formatDate(record.policyExpiryDate)],
        ])}

        ${renderPrintSection("Dates & Status", [
          ["Claim Date", formatDate(record.claimDate)],
          ["Date of Loss", formatDate(record.dateOfLoss)],
          ["Claim Type", record.claimType],
          ["Claim Status", record.claimStatus],
          ["Claim Priority", record.claimPriority],
          ["Follow-up Date", formatDate(record.followUpDate)],
        ])}

        ${renderPrintSection("Description & Remarks", [
          ["Claim Description", record.claimDescription],
          ["Current Remark", record.currentRemark],
        ])}

        ${renderPrintSection(
          "Claim Specific Details",
          getClaimSpecificFields(record.claimType).map((field) => [
            field.label,
            field.type === "date" ? formatDate(claimDetails[field.key]) : claimDetails[field.key],
          ]),
        )}

        ${renderPrintSection(
          "Surveyor Details",
          SURVEYOR_FIELDS.map((field) => [
            field.label,
            field.type === "date" ? formatDate(surveyorDetails[field.key]) : surveyorDetails[field.key],
          ]),
        )}

        ${renderRemarks(remarks)}

        <script>
          window.onload = function() {
            const image = document.querySelector('.print-logo');
            const finish = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
            if (!image || image.complete) {
              finish();
              return;
            }
            image.onload = finish;
            image.onerror = finish;
            setTimeout(finish, 1500);
          };
        </script>
      </body>
    </html>`;
}

function renderPrintSection(title, fields) {
  const validFields = fields.filter(
    ([, value]) => value !== undefined && value !== null && String(value).trim() !== "",
  );
  if (!validFields.length) return "";

  return `
    <div class="section">
      <h3>${escapeHtml(title)}</h3>
      <div class="grid">
        ${validFields
          .map(
            ([label, value]) => `
              <div class="field">
                <span class="label">${escapeHtml(label)}</span>
                <span class="value">${escapeHtml(value)}</span>
              </div>`,
          )
          .join("")}
      </div>
    </div>`;
}

function renderRemarks(remarks) {
  if (!remarks.length) return "";

  return `
    <div class="section">
      <h3>Remarks History</h3>
      <div style="display: grid; gap: 6px;">
        ${remarks
          .map(
            (remark) => `
              <div class="remark">
                <strong>${escapeHtml(remark.text)}</strong>
                <div class="remark-meta">
                  ${escapeHtml(formatDate(remark.createdAt))}
                  ${remark.followUpDate ? ` | Follow-up: ${escapeHtml(formatDate(remark.followUpDate))}` : ""}
                </div>
              </div>`,
          )
          .join("")}
      </div>
    </div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
