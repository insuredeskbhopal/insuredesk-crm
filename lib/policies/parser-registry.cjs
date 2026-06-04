function createParserRegistry(parsers = []) {
  return parsers.map((parser, index) => ({
    id: parser.id,
    companyName: parser.companyName || "",
    policyType: parser.policyType || "",
    priority: Number(parser.priority ?? index),
    detect: typeof parser.detect === "function" ? parser.detect : () => true,
    extract: parser.extract
  })).sort((a, b) => a.priority - b.priority);
}

function runParserRegistry(registry = [], document = {}) {
  for (const parser of registry) {
    if (typeof parser.extract !== "function") continue;
    if (!parser.detect(document)) continue;

    const rawResult = parser.extract(document);
    const contract = toParserContract(parser, rawResult);

    if (contract.documentDetected) {
      return {
        parserId: parser.id,
        parser,
        rawResult,
        contract
      };
    }
  }

  return {
    parserId: "",
    parser: null,
    rawResult: { documentDetected: false },
    contract: toParserContract({}, { documentDetected: false })
  };
}

function toParserContract(parser = {}, result = {}) {
  const fields = { ...(result || {}) };
  delete fields.documentDetected;

  return {
    documentDetected: Boolean(result?.documentDetected),
    companyName: result?.companyName || parser.companyName || "",
    policyType: result?.policyType || parser.policyType || "",
    fields,
    evidence: result?.evidence || {},
    confidence: result?.confidence || {}
  };
}

function getRegisteredParserResult(selection, parserId) {
  if (!selection || selection.parserId !== parserId) return null;
  return selection.rawResult;
}

function hasVerifiedEvidence(text = "", patterns = []) {
  const source = String(text || "");
  return patterns.some((pattern) => pattern.test(source));
}

function detectRegisteredCompany(document = {}, patterns = []) {
  return hasVerifiedEvidence(document.text, patterns);
}

module.exports = {
  createParserRegistry,
  runParserRegistry,
  toParserContract,
  getRegisteredParserResult,
  detectRegisteredCompany,
  hasVerifiedEvidence
};
