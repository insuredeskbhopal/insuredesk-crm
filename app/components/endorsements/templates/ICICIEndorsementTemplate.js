import Image from "next/image";

export function ICICIEndorsementTemplate({ data, previewRef }) {
  return (
    <div ref={previewRef} className="icici-schedule-page">
      <div className="icici-logo-wrap">
        <Image className="icici-logo" src="/icici.png" alt="ICICI Lombard Logo" width={272} height={82} priority unoptimized />
      </div>

      <div className="icici-top-line" />

      <div className="icici-band">
        <div className="icici-band-red" />
        <div className="icici-band-slant" />
        <div className="icici-band-orange" />
      </div>

      <main className="icici-content">
        <h1>{valueOrDash(data.policyTitle)} Endorsement Schedule</h1>

        <p>
          We value your relationship with ICICI Lombard General Insurance Company Limited and thank you for choosing us as
          your preferred service provider.
        </p>

        <p>Based on your request, your policy has been endorsed. Refer table below for updated details:</p>

        <div className="icici-section-title">Endorsement Details:</div>

        <table className="icici-table">
          <tbody>
            <TableRow label="Insured Name" value={data.insuredName} />
            <TableRow label="Mailing Address" value={data.mailingAddress} />
            <TableRow label="Policy Number" value={data.policyNo} />
            <TableRow
              label="Period of Insurance"
              value={`From: 00:00 Hours of ${valueOrDash(data.policyStartDateText)} To: 23:59 of ${valueOrDash(data.policyExpiryDateText)}`}
            />
            <TableRow label="Endorsement Number" value={data.endorsementNo} />
            <TableRow
              label={
                <>
                  Endorsement Effective Time &<br />
                  Date
                </>
              }
              value={`${valueOrDash(data.effectiveTimeText)} ${valueOrDash(data.effectiveDateText)}`}
            />
            <TableRow label="Date of Issue" value={data.dateOfIssueText} />
            <TableRow label="Issued Office" value={data.issuedOffice} />
          </tbody>
        </table>

        <div className="icici-financer-title">Financer Details:</div>

        <table className="icici-table icici-financer">
          <tbody>
            <tr>
              <th>Name of the Financer</th>
              <th className="icici-financer-branch">Branch</th>
              <th className="icici-financer-agreement">Agreement</th>
            </tr>
            <tr>
              <td>{valueOrDash(data.financer?.name)}</td>
              <td>{valueOrDash(data.financer?.branch)}</td>
              <td>{valueOrDash(data.financer?.agreement)}</td>
            </tr>
          </tbody>
        </table>

        <table className="icici-table icici-wording-table">
          <tbody>
            <tr>
              <td className="icici-wording-label">Endorsement Wording:</td>
              <td className="icici-wording">{valueOrDash(data.endorsementWording)}</td>
            </tr>
            <tr>
              <td className="icici-premium-label">Total Premium ₹:</td>
              <td className="icici-premium-value">{valueOrDash(data.premium)}</td>
            </tr>
            <tr>
              <td colSpan="2" className="icici-premium-note">
                *Premium value mentioned above is inclusive of taxes applicable
              </td>
            </tr>
            <tr>
              <td colSpan="2" className="icici-signature-box">
                <div className="icici-fake-sign">Gautam Arora</div>
                <div className="icici-sign-bold">Authorized Signatory</div>
                <div className="icici-sign-bold">ICICI Lombard General Insurance Company Ltd.</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="icici-table icici-gst-footer">
          <tbody>
            <tr>
              <td>GSTIN Reg no : 23AAACI7904G1ZV</td>
            </tr>
            <tr>
              <td>IL GIC GSTIN Address : Second and Third Floor, Nungambakkam High Road, Chottabhai Centre, Chennai, Tamil Nadu 600034</td>
            </tr>
            <tr>
              <td>HSN/SAC Code : 997137/ GENERAL INSURANCE SERVICES</td>
            </tr>
            <tr>
              <td>
                Subject otherwise to the terms, conditions, exclusions, limitations and warranties attached to the within
                mentioned policy.
              </td>
            </tr>
          </tbody>
        </table>
      </main>

      <Image className="icici-digital-sign" src="/icici-digital-signature.png" alt="Signature Not Verified" width={180} height={80} unoptimized />

      <ICICIFooter policyTitle={data.policyTitle} />
    </div>
  );
}

function ICICIFooter({ policyTitle }) {
  return (
    <div className="icici-page-footer">
      <div className="icici-footer-strip">
        <div className="icici-footer-orange" />
        <div className="icici-footer-slant" />
        <div className="icici-footer-red" />
        <div className="icici-footer-cream" />
      </div>

      <div className="icici-footer-company">ICICI Lombard General Insurance Company Limited</div>

      <div className="icici-footer-details">
        <div>
          <div className="icici-footer-bold">IRDA Reg. No. 115</div>
          <div className="icici-footer-bold">Mailing Address:</div>
          <div>
            601 &amp; 602, 6th Floor, Interface 16, New
            <br />
            Linking Road, Malad (West) Mumbai - 400
            <br />
            064
          </div>
        </div>

        <div>
          <div className="icici-footer-bold">CIN: L67200MH2000PLC129408</div>
          <div className="icici-footer-bold">Registered Office Address:</div>
          <div>
            ICICI Lombard House, 414 Veer Savarkar Marg,
            <br />
            Near Siddhi Vinayak Temple, Prabhadevi,
            <br />
            Mumbai - 400 025.
          </div>
        </div>

        <div>
          <div className="icici-footer-bold">UIN - IRDAN115RPPP0012V01202425</div>
          <FooterRow label="Toll free no." value="1800 2666" />
          <FooterRow label="Alternate No." value="86552 22666 (chargeable)" />
          <FooterRow label="Email" value="customersupport@icicilombard.com" />
          <FooterRow label="Website" value="www.icicilombard.com" />
        </div>

        <div className="icici-footer-policy">{valueOrDash(policyTitle)}</div>
      </div>
    </div>
  );
}

function TableRow({ label, value }) {
  return (
    <tr>
      <td className="icici-label">{label}</td>
      <td>{valueOrDash(value)}</td>
    </tr>
  );
}

function FooterRow({ label, value }) {
  return (
    <div className="icici-footer-row">
      <b>{label}</b>
      <span>:</span>
      <span>{value}</span>
    </div>
  );
}

function valueOrDash(value) {
  return String(value || "").trim() || "-";
}
