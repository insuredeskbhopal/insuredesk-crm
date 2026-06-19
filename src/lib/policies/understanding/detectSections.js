const SECTION_DEFINITIONS = [
  ["policy_details", [/Policy\s+(?:No|Number)/i, /Certificate/i, /Period of Insurance/i, /Policy Schedule/i]],
  [
    "insured_details",
    [/Insured/i, /Proposer/i, /Customer Name/i, /Communication Address/i, /Mailing Address/i],
  ],
  [
    "vehicle_details",
    [/Vehicle Details/i, /INSURED MOTOR VEHICLE DETAILS/i, /Registration No/i, /Chassis No/i, /Engine No/i],
  ],
  [
    "premium_details",
    [/Premium Details/i, /SCHEDULE OF PREMIUM/i, /Total Premium/i, /Net Premium/i, /Gross Premium/i],
  ],
  ["gst_table", [/GST/i, /CGST/i, /SGST/i, /Central Tax/i, /State Tax/i, /Tax Invoice/i]],
  ["add_on_covers", [/Add-?on/i, /Zero Depreciation/i, /Engine and Gear/i, /Consumables/i]],
  ["nominee_details", [/Nominee/i, /Compulsory PA/i]],
  ["financier_details", [/Hypothecation/i, /Financier/i, /Financer/i]],
  ["previous_policy_details", [/Previous Policy/i, /Previous Insurer/i, /No Claim Bonus/i, /\bNCB\b/i]],
  ["risk_location", [/Risk Location/i, /Premises to be Insured/i, /Warehouse/i]],
  ["warehouse_details", [/Description of Block/i, /MSME Suraksha Kavach/i, /Business of the Insured/i]],
];

function detectSections(text = "", pages = []) {
  const source = String(text || "");
  const lines = source.split(/\n/);
  const matches = [];

  SECTION_DEFINITIONS.forEach(([type, patterns]) => {
    let firstLine = -1;
    let matchedLabel = "";
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const pattern = patterns.find((candidate) => candidate.test(line));
      if (pattern) {
        firstLine = i;
        matchedLabel = line.trim().slice(0, 120);
        break;
      }
    }
    if (firstLine !== -1) {
      matches.push({
        type,
        title: labelForSection(type),
        startLine: firstLine,
        endLine: Math.min(lines.length - 1, firstLine + 45),
        page: pageForLine(pages, firstLine),
        matchedLabel,
        text: lines
          .slice(firstLine, Math.min(lines.length, firstLine + 46))
          .join("\n")
          .trim(),
      });
    }
  });

  return matches.sort((a, b) => a.startLine - b.startLine);
}

function labelForSection(type) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pageForLine(pages, lineNumber) {
  const page = pages.find(
    (candidate) => lineNumber >= candidate.startLine && lineNumber <= candidate.endLine,
  );
  return page?.pageNumber || 1;
}

module.exports = { detectSections, SECTION_DEFINITIONS };
