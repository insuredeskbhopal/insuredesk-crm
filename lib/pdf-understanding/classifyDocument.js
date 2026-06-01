function classifyDocument(text = "") {
  const normalized = String(text || "");
  const candidates = [
    {
      company: "HDFC ERGO",
      documentFormat: "HDFC_ERGO_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Private Car Comprehensive Policy",
      signals: [/HDFC\s+ERGO/i, /PRIVATE\s+CAR\s+COMPREHENSIVE\s+POLICY/i, /Total\s+IDV/i, /CSC\s+Name/i]
    },
    {
      company: "Go Digit General Insurance Ltd.",
      documentFormat: "GO_DIGIT_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Digit Private Car Stand-alone Own Damage Policy",
      signals: [/Go\s+Digit\s+General\s+Insurance/i, /Digit\s+Private[- ]Car/i, /IRDAN158/i]
    },
    {
      company: "Bajaj Allianz General Insurance Company Limited",
      documentFormat: "BAJAJ_ALLIANZ_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Private Car Package Policy",
      signals: [/Bajaj\s+(?:Allianz|General\s+Insurance)/i, /IRDAN113|IRDAI\s+Reg(?:\.|\s+)?No\s*113/i, /OG-\d{2}-\d{4}/i]
    },
    {
      company: "IFFCO-TOKIO",
      documentFormat: "IFFCO_TOKIO_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [/IFFCO[- ]?TOKIO/i, /Policy\s+Schedule/i, /Registration\s+(?:No|Mark)/i, /Net\s+Premium/i]
    },
    {
      company: "Generali Central Insurance Company Limited",
      documentFormat: "GENERALI_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Protect Private Car Package Policy",
      signals: [/Generali\s+Central/i, /Future\s+Generali/i, /Motor Protect Private Car Package Policy/i, /INSURED MOTOR VEHICLE DETAILS/i]
    },
    {
      company: "The New India Assurance Company Limited",
      documentFormat: "NEW_INDIA_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [/New India Assurance/i, /Chassis no\.?\/Engine Number/i, /Insured Declared Value/i, /Certificate/i]
    },
    {
      company: "ICICI Lombard General Insurance Company Limited",
      documentFormat: "ICICI_WAREHOUSE_V1",
      documentCategory: "Warehouse Insurance",
      policyType: "MSME Suraksha Kavach Package Policy - Advance",
      signals: [/ICICI Lombard/i, /MSME Suraksha Kavach/i, /Premises to be Insured/i, /Description of Block/i]
    }
  ];

  let best = { company: "", documentFormat: "", documentCategory: "", policyType: "", confidence: 0, matchedSignals: [] };
  for (const candidate of candidates) {
    const matchedSignals = candidate.signals.filter((pattern) => pattern.test(normalized)).map((pattern) => pattern.source);
    const confidence = matchedSignals.length / candidate.signals.length;
    if (confidence > best.confidence) {
      best = { ...candidate, confidence, matchedSignals };
    }
  }

  if (best.confidence < 0.25) {
    return {
      company: "",
      documentFormat: "GENERIC_POLICY_V1",
      documentCategory: "",
      policyType: "",
      confidence: 0,
      matchedSignals: []
    };
  }

  return best;
}

module.exports = { classifyDocument };
