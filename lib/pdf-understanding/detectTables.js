const TABLE_TYPES = [
  ["premium_table", [/Premium/i, /Own Damage/i, /Liability/i, /Total/i]],
  ["idv_table", [/\bIDV\b/i, /Declared Value/i, /Year 1/i]],
  ["gst_tax_table", [/GST/i, /CGST/i, /SGST/i, /Central Tax/i, /State Tax/i]],
  ["sum_insured_table", [/Sum Insured/i, /Section/i, /Contents/i]],
  ["vehicle_details_table", [/Registration/i, /Make/i, /Model/i, /Engine/i, /Chassis/i]],
  ["addon_covers_table", [/Zero Depreciation/i, /Consumables/i, /Add-?on/i]],
  ["previous_policy_table", [/Previous Policy/i, /Previous Insurer/i, /\bNCB\b/i]]
];

function detectTables(text = "", pages = []) {
  const lines = String(text || "").split(/\n/);
  const tables = [];
  let block = [];
  let startLine = 0;

  lines.forEach((line, index) => {
    if (looksTabular(line)) {
      if (!block.length) startLine = index;
      block.push(line);
    } else if (block.length) {
      pushTable(tables, block, startLine, index - 1, pages);
      block = [];
    }
  });
  if (block.length) pushTable(tables, block, startLine, lines.length - 1, pages);

  return tables;
}

function looksTabular(line = "") {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const numericTokens = (trimmed.match(/\b\d[\d,.%/-]*\b/g) || []).length;
  const labelHits = TABLE_TYPES.flatMap(([, patterns]) => patterns).filter((pattern) => pattern.test(trimmed)).length;
  const wideSpacing = /\S\s{2,}\S/.test(line);
  const denseLabelRun = /Registration.*Engine|Year.*Cubic.*Seating|Premium.*Tax|Own Damage.*Liability/i.test(trimmed);
  return numericTokens >= 3 || labelHits >= 2 || wideSpacing || denseLabelRun;
}

function pushTable(tables, block, startLine, endLine, pages) {
  if (!block.length) return;
  const text = block.join("\n");
  const [type, patterns] = detectTableType(text);
  tables.push({
    type,
    page: pageForLine(pages, startLine),
    startLine,
    endLine,
    rows: block.map((line) => line.trim()).filter(Boolean),
    columnsGuess: guessColumns(block),
    signature: patterns.map((pattern) => pattern.source).join("|"),
    confidence: Math.min(0.95, 0.45 + patterns.length * 0.12)
  });
}

function detectTableType(blockText) {
  let best = ["unknown_table", []];
  for (const [type, patterns] of TABLE_TYPES) {
    const matched = patterns.filter((pattern) => pattern.test(blockText));
    if (matched.length > best[1].length) best = [type, matched];
  }
  return best;
}

function guessColumns(block) {
  const maxTokens = block.reduce((max, line) => Math.max(max, line.trim().split(/\s{2,}|\t+/).filter(Boolean).length), 0);
  return Math.max(1, maxTokens);
}

function pageForLine(pages, lineNumber) {
  const page = pages.find((candidate) => lineNumber >= candidate.startLine && lineNumber <= candidate.endLine);
  return page?.pageNumber || 1;
}

module.exports = { detectTables };
