const crypto = require("node:crypto");

function detectLayout(text = "", sections = [], tables = []) {
  const keywordSignature = buildKeywordSignature(text);
  const tableSignature = tables.map((table) => `${table.type}:${table.columnsGuess}`).join(">");
  const sectionOrderSignature = sections.map((section) => section.type).join(">");
  const layoutSeed = [keywordSignature, tableSignature, sectionOrderSignature].join("||");

  return {
    layoutHash: hash(layoutSeed),
    layoutVersion: hash(layoutSeed).slice(0, 12),
    keywordSignature,
    tableSignature,
    sectionOrderSignature,
    pageCount: estimatePageCount(text),
    repeatedHeaders: findRepeatedLines(text),
  };
}

function buildKeywordSignature(text) {
  const keywords = [
    "Policy No",
    "Policy Number",
    "Insured",
    "Proposer",
    "Registration No",
    "Engine No",
    "Chassis No",
    "Total Premium",
    "Gross Premium",
    "GST",
    "Total IDV",
    "Nominee",
    "Hypothecation",
    "Previous Policy",
    "Risk Location",
    "Premises to be Insured",
    "MSME Suraksha",
  ];
  return keywords.filter((keyword) => new RegExp(keyword.replace(/\s+/g, "\\s+"), "i").test(text)).join("|");
}

function findRepeatedLines(text) {
  const counts = new Map();
  String(text || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 18)
    .forEach((line) => {
      counts.set(line, (counts.get(line) || 0) + 1);
    });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .slice(0, 12)
    .map(([line, count]) => ({ line, count }));
}

function estimatePageCount(text) {
  return Math.max(1, (String(text || "").match(/\f/g) || []).length + 1);
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(String(value || ""))
    .digest("hex");
}

module.exports = { detectLayout };
