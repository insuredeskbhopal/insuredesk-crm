function classifyDocument(text = "") {
  const normalized = String(text || "");
  const candidates = [
    {
      company: "United India Insurance Company Limited",
      documentFormat: "UNITED_INDIA_WAREHOUSE_V1",
      documentCategory: "Warehouse Insurance",
      policyType: "United Bharat Laghu Udyam Suraksha Policy",
      signals: [
        /UNITED INDIA INSURANCE COMPANY LIMITED/i,
        /UNITED BHARAT LAGHU UDYAM SURAKSHA POLICY/i,
        /Location\s*\/\s*Risk Details/i,
        /Storage of Non-hazardous goods/i,
      ],
    },
    {
      company: "HDFC ERGO",
      documentFormat: "HDFC_ERGO_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Private Car Comprehensive Policy",
      signals: [/HDFC\s+ERGO/i, /PRIVATE\s+CAR\s+COMPREHENSIVE\s+POLICY/i, /Total\s+IDV/i, /CSC\s+Name/i],
    },
    {
      company: "Go Digit General Insurance Ltd.",
      documentFormat: "GO_DIGIT_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Digit Private Car Stand-alone Own Damage Policy",
      signals: [/Go\s+Digit\s+General\s+Insurance/i, /Digit\s+Private[- ]Car/i, /IRDAN158/i],
    },
    {
      company: "Bajaj Allianz General Insurance Company Limited",
      documentFormat: "BAJAJ_ALLIANZ_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Private Car Package Policy",
      signals: [
        /Bajaj\s+(?:Allianz|General\s+Insurance)/i,
        /IRDAN113|IRDAI\s+Reg(?:\.|\s+)?No\s*113/i,
        /OG-\d{2}-\d{4}/i,
      ],
    },
    {
      company: "The New India Assurance Company Limited",
      documentFormat: "NEW_INDIA_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [
        /\bTHE\s+NEW\s+INDIA\s+ASSURANCE\s+CO\.?\s+LTD\.?\b/i,
        /POLICY\s+SCHEDULE\s+CUM\s+CERTIFICATE\s+OF\s+INSURANCE/i,
        /\bPolicy\s+Number\s*:?\s*\d{10,}/i,
        /\bINSURED\s+DETAILS\b/i,
        /\bPOLICY\s+DETAILS\b/i,
        /\bVEHICLE\s+DETAILS\b/i,
        /\bSCHEDULE\s+OF\s+PREMIUM\b/i,
        /\bChassis\s+no\.?\s*\/\s*Engine\s+(?:Number|no\.?)/i,
      ],
    },
    {
      company: "IFFCO Tokio General Insurance Company Limited",
      documentFormat: "IFFCO_TOKIO_WORKMEN_COMPENSATION_V1",
      documentCategory: "Workmen Compensation Insurance",
      policyType: "Workmen's Compensation Policy",
      signals: [
        /IFFCO[- ]?TOKIO|IFFCO\s+TOKIO\s+GENERAL\s+INSURANCE/i,
        /Workmen'?s\s+Compensation/i,
        /Category\s+of\s+Employee|Total\s+Workers/i,
        /Nature\s+of\s+Work|Place\s+of\s+Employment/i,
      ],
    },
    {
      company: "IFFCO-TOKIO",
      documentFormat: "IFFCO_TOKIO_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [
        /IFFCO[- ]?TOKIO/i,
        /Policy\s+Schedule/i,
        /Registration\s+(?:No|Mark)/i,
        /iffcotokio\.co\.in|P400/i,
      ],
    },
    {
      company: "Generali Central Insurance Company Limited",
      documentFormat: "GENERALI_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Protect Private Car Package Policy",
      signals: [
        /Generali\s+Central/i,
        /Future\s+Generali/i,
        /Motor Protect Private Car Package Policy/i,
        /INSURED MOTOR VEHICLE DETAILS/i,
      ],
    },
    {
      company: "ICICI Lombard General Insurance Company Limited",
      documentFormat: "ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1",
      documentCategory: "Warehouse Insurance",
      policyType: "Warehouse / MSME / Fire & Burglary package",
      signals: [
        /ICICI Lombard/i,
        /MSME Suraksha Kavach/i,
        /Premises to be Insured/i,
        /Section wise details/i,
      ],
    },
    {
      company: "IFFCO Tokio General Insurance Company Limited",
      documentFormat: "IFFCO_TOKIO_WAREHOUSE_V1",
      documentCategory: "Warehouse Insurance",
      policyType: "Warehouse Policy",
      signals: [
        /IFFCO[- ]?TOKIO/i,
        /Flexi\s+Property\s+Protector|Burglary\s+And\s+House\s+Breaking|Fidelity\s+Guarantee|FLEXI\s+PROPERTY|BURGLARY\s+AND\s+HOUSE\s+BREAKING\s+INSURANCE/i,
      ],
    },
    {
      company: "Tata AIG General Insurance Company Limited",
      documentFormat: "TATA_AIG_WAREHOUSE_V1",
      documentCategory: "Warehouse Insurance",
      policyType: "Business Guard Laghu Package Policy",
      signals: [
        /\bTATA\s*AIG\b/i,
        /Business\s+Guard|Laghu|Sookshma|Standard\s+Fire|Occupancy/i,
        /risk\s+location|Location of Risk|Risk Address/i,
      ],
    },
    {
      company: "TATA AIG",
      documentFormat: "TATA_AIG_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [
        /\bTATA\s*AIG\b/i,
        /Auto\s*Secure/i,
        /Private\s*Car/i,
        /Registration\s+No/i,
      ],
    },
    {
      company: "Shriram General Insurance Company Limited",
      documentFormat: "SHRIRAM_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [
        /Shriram\s+General\s+Insurance/i,
        /UIN\s+No\.?IRDAN137/i,
        /209040\/\d{2}\/\d{2}\/\d{6}/i,
      ],
    },
    {
      company: "Royal Sundaram General Insurance Co. Limited",
      documentFormat: "ROYAL_SUNDARAM_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [
        /Royal\s+Sundaram/i,
        /Certificate\s*of\s*Insurance|CERTIFICATEOFINSURANCE/i,
        /Registration Number|Vehicle Details|Motor Vehicles Act/i,
      ],
    },
    {
      company: "Liberty General Insurance Limited",
      documentFormat: "LIBERTY_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyType: "Motor Policy",
      signals: [
        /Liberty\s+General\s+Insurance/i,
        /TWO\s+WHEELER\s+LIABILITY\s+POLICY/i,
        /LGI\s+Branch\s+GSTIN/i,
      ],
    },
  ];

  let best = {
    company: "",
    documentFormat: "",
    documentCategory: "",
    policyType: "",
    confidence: 0,
    matchedSignals: [],
  };
  for (const candidate of candidates) {
    const matchedSignals = candidate.signals
      .filter((pattern) => pattern.test(normalized))
      .map((pattern) => pattern.source);
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
      matchedSignals: [],
    };
  }

  return best;
}

module.exports = { classifyDocument };
