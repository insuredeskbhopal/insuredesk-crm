const { classifyDocument } = require("./classifyDocument");
const { detectSections } = require("./detectSections");
const { detectTables } = require("./detectTables");
const { detectLayout } = require("./detectLayout");

function understandDocument(text = "") {
  const sourceText = String(text || "");
  const pages = buildPages(sourceText);
  const classification = classifyDocument(sourceText);
  const sections = detectSections(sourceText, pages);
  const tables = detectTables(sourceText, pages);
  const layout = detectLayout(sourceText, sections, tables);
  const importantLabels = collectImportantLabels(sourceText);
  const confidence = calculateConfidence(classification, sections, tables, importantLabels);

  return {
    company: classification.company || "",
    policyType: classification.policyType || "",
    documentFormat: classification.documentFormat || "",
    documentCategory: classification.documentCategory || "",
    layoutVersion: layout.layoutVersion,
    layout,
    pages: pages.map(({ text: _text, ...page }) => page),
    sections,
    tables,
    importantLabels,
    confidence
  };
}

function buildPages(text) {
  const explicitPages = String(text || "").split(/\f/);
  const sourcePages = explicitPages.length > 1 ? explicitPages : chunkByLines(text, 85);
  let currentLine = 0;
  return sourcePages.map((pageText, index) => {
    const lines = pageText.split(/\n/);
    const page = {
      pageNumber: index + 1,
      startLine: currentLine,
      endLine: currentLine + Math.max(0, lines.length - 1),
      lineCount: lines.length,
      text: pageText
    };
    currentLine += lines.length;
    return page;
  });
}

function chunkByLines(text, size) {
  const lines = String(text || "").split(/\n/);
  const pages = [];
  for (let i = 0; i < lines.length; i += size) {
    pages.push(lines.slice(i, i + size).join("\n"));
  }
  return pages.length ? pages : [String(text || "")];
}

function collectImportantLabels(text) {
  const labels = [
    "Policy No", "Policy Number", "Proposal No", "Invoice No", "Issuance Date", "Period of Insurance",
    "Name of Insured", "Insured/Proposer", "Communication Address", "Registration No", "RTO",
    "Make", "Model", "Engine No", "Chassis No", "Cubic Capacity", "Seating Capacity", "Total IDV",
    "Total Premium", "GST", "NCB", "Previous Policy No", "Nominee", "Hypothecation", "CSC Name"
  ];
  return labels.filter((label) => new RegExp(label.replace(/\s+/g, "\\s+"), "i").test(text));
}

function calculateConfidence(classification, sections, tables, labels) {
  const score = (classification.confidence || 0) * 0.45 +
    Math.min(1, sections.length / 8) * 0.25 +
    Math.min(1, tables.length / 4) * 0.15 +
    Math.min(1, labels.length / 12) * 0.15;
  return Number(score.toFixed(2));
}

module.exports = { understandDocument };
