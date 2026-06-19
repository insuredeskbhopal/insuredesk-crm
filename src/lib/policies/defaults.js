export const FIELD_TYPES = ["text", "number", "date", "currency", "dropdown", "textarea", "boolean"];

export const DEFAULT_BANK_SOURCES = [
  { name: "HDFC Bank", aliases: ["HDFC", "HDFC BANK LTD"] },
  { name: "SBI", aliases: ["State Bank of India", "SBI Bank"] },
  { name: "ICICI Bank", aliases: ["ICICI", "ICICI BANK LTD"] },
  { name: "Direct Client", aliases: ["Direct", "Customer Direct"] },
  { name: "Broker Channel", aliases: ["Broker", "Agent Channel", "Intermediary"] },
];

export const DEFAULT_COMPANIES = [
  {
    name: "ICICI Lombard",
    aliases: ["ICICI Lombard General Insurance", "ICICI Lombard General Insurance Company Limited"],
  },
  {
    name: "HDFC Ergo",
    aliases: [
      "HDFC ERGO",
      "HDFC ERGO General Insurance",
      "HDFC ERGO General Insurance Company Limited",
      "HDFC Ergo General Insurance Company Limited",
    ],
  },
  { name: "Tata AIG", aliases: ["TATA AIG General Insurance", "Tata AIG General Insurance Company Limited"] },
  {
    name: "New India Assurance",
    aliases: ["The New India Assurance", "New India Assurance Company Limited"],
  },
];

export const DEFAULT_CATEGORIES = [
  {
    name: "Vehicle Insurance",
    aliases: ["Motor Insurance"],
    keywords: ["vehicle", "motor", "registration", "chassis", "engine number", "idv", "own damage"],
  },
  {
    name: "Health Insurance",
    aliases: ["Medical Insurance"],
    keywords: ["health", "tpa", "hospitalization", "room rent", "pre-existing disease", "mediclaim"],
  },
  {
    name: "Life Insurance",
    aliases: ["Term Insurance"],
    keywords: ["life assured", "death benefit", "maturity", "nominee", "sum assured"],
  },
  {
    name: "Commercial Insurance",
    aliases: ["Business Insurance"],
    keywords: [
      "fire",
      "stock",
      "building",
      "machinery",
      "burglary",
      "liability",
      "marine",
      "msme",
      "warehouse",
      "godown",
      "contents",
      "fidelity",
    ],
  },
  {
    name: "Bank Insurance",
    aliases: ["Bank Related Policy"],
    keywords: ["loan account", "hypothecation", "bank clause", "mortgage", "financier"],
  },
  {
    name: "Cyber Insurance",
    aliases: ["Cyber Risk"],
    keywords: ["cyber", "data breach", "privacy breach", "network security", "ransomware"],
  },
  {
    name: "Travel Insurance",
    aliases: ["Trip Insurance"],
    keywords: ["travel", "passport", "trip", "journey", "medical evacuation", "baggage"],
  },
];

export const DEFAULT_POLICY_TYPES = [
  {
    category: "Vehicle Insurance",
    name: "Car Insurance",
    aliases: [
      "Private Car Package Policy",
      "Private Car Comprehensive Policy",
      "PRIVATE CAR COMPREHENSIVE POLICY",
      "Motor Package Policy",
    ],
    keywords: [
      "private car",
      "private car comprehensive policy",
      "vehicle details",
      "premium details",
      "vehicle number",
      "registration no",
      "chassis no",
      "engine no",
      "total idv",
      "idv",
      "own damage",
      "basic third party liability",
    ],
    fields: [
      field("insuredName", "Insured Name", "text", true, [
        "Name of the Insured",
        "Insured Name",
        "Proposer Name",
      ]),
      field("policyNumber", "Policy Number", "text", true, [
        "Policy No",
        "Policy No.",
        "Policy Number",
        "Policy Schedule No",
        "Certificate No",
      ]),
      field("proposalNumber", "Proposal Number", "text", false, ["Proposal No", "Proposal No."]),
      field("invoiceNumber", "Invoice Number", "text", false, ["Invoice No", "Invoice No."]),
      field("insurerName", "Insurer Name", "text", true, [
        "Insurance Company",
        "Insurer",
        "Company Name",
        "HDFC ERGO General Insurance Company Limited",
      ]),
      field("vehicleNumber", "Vehicle Number", "text", true, [
        "Vehicle No",
        "Vehicle Number",
        "Registration No",
        "Regn No",
      ]),
      field("registrationNumber", "Registration Number", "text", false, [
        "Registration Number",
        "Registration No",
        "Reg No",
      ]),
      field("chassisNumber", "Chassis Number", "text", true, ["Chassis No", "Chassis Number"]),
      field("engineNumber", "Engine Number", "text", true, ["Engine No", "Engine Number"]),
      field("policyStartDate", "Policy Start Date", "date", true, [
        "From",
        "Start Date",
        "Policy Start Date",
        "Period From",
      ]),
      field("policyEndDate", "Policy End Date", "date", true, [
        "To",
        "Expiry Date",
        "Policy End Date",
        "Period To",
      ]),
      field("vehicleMake", "Vehicle Make", "text", false, ["Make"]),
      field("vehicleModel", "Vehicle Model", "text", false, ["Model"]),
      field("rto", "RTO", "text", false, ["RTO"]),
      field("idv", "IDV", "currency", false, ["IDV", "Total IDV", "Insured Declared Value"]),
      field("premium", "Premium", "currency", true, [
        "Premium",
        "Total Premium",
        "Net Premium",
        "Premium inclusive Tax",
      ]),
      field("gst", "GST", "currency", false, ["GST", "GST Amount", "Tax"]),
      field("ncbPercentage", "NCB", "text", false, ["NCB", "No Claim Bonus"]),
      field("nominee", "Nominee", "text", false, ["Nominee", "Nominee Name"]),
      field("hypothecationBank", "Hypothecation Bank", "text", false, [
        "Hypothecation",
        "Financier",
        "Bank Clause",
      ]),
    ],
  },
  {
    category: "Vehicle Insurance",
    name: "Bike Insurance",
    aliases: ["Two Wheeler Insurance", "Two Wheeler Package Policy"],
    keywords: ["two wheeler", "bike", "scooter", "registration no", "chassis no", "engine no", "idv"],
    fields: [
      field("insuredName", "Insured Name", "text", true, ["Name of the Insured", "Insured Name"]),
      field("policyNumber", "Policy Number", "text", true, ["Policy No", "Policy Number", "Certificate No"]),
      field("insurerName", "Insurer Name", "text", true, ["Insurance Company", "Insurer"]),
      field("vehicleNumber", "Vehicle Number", "text", true, ["Vehicle No", "Registration No", "Regn No"]),
      field("chassisNumber", "Chassis Number", "text", true, ["Chassis No", "Chassis Number"]),
      field("engineNumber", "Engine Number", "text", true, ["Engine No", "Engine Number"]),
      field("policyStartDate", "Policy Start Date", "date", true, ["From", "Start Date", "Period From"]),
      field("policyEndDate", "Policy End Date", "date", true, ["To", "Expiry Date", "Period To"]),
      field("idv", "IDV", "currency", false, ["IDV", "Insured Declared Value"]),
      field("premium", "Premium", "currency", true, ["Premium", "Total Premium"]),
    ],
  },
  {
    category: "Vehicle Insurance",
    name: "Commercial Vehicle",
    aliases: ["Commercial Vehicle Package Policy"],
    keywords: ["commercial vehicle", "goods carrying", "passenger carrying", "permit", "fitness certificate"],
    fields: [
      field("insuredName", "Insured Name", "text", true, ["Name of the Insured", "Insured Name"]),
      field("policyNumber", "Policy Number", "text", true, ["Policy No", "Policy Number"]),
      field("vehicleNumber", "Vehicle Number", "text", true, ["Vehicle No", "Registration No"]),
      field("chassisNumber", "Chassis Number", "text", true, ["Chassis No", "Chassis Number"]),
      field("engineNumber", "Engine Number", "text", true, ["Engine No", "Engine Number"]),
      field("permitNumber", "Permit Number", "text", false, ["Permit No", "Permit Number"]),
      field("policyStartDate", "Policy Start Date", "date", true, ["From", "Policy Start Date"]),
      field("policyEndDate", "Policy End Date", "date", true, ["To", "Expiry Date"]),
      field("idv", "IDV", "currency", false, ["IDV"]),
      field("premium", "Premium", "currency", true, ["Premium", "Total Premium"]),
      field("hypothecationBank", "Hypothecation Bank", "text", false, ["Hypothecation", "Financier"]),
    ],
  },
  {
    category: "Health Insurance",
    name: "Individual Health",
    aliases: ["Individual Mediclaim"],
    keywords: ["individual health", "hospitalization", "tpa", "room rent", "pre-existing disease"],
    fields: healthFields(),
  },
  {
    category: "Health Insurance",
    name: "Family Floater",
    aliases: ["Family Health Insurance"],
    keywords: ["family floater", "members covered", "dependent", "relationship", "tpa"],
    fields: healthFields(),
  },
  {
    category: "Health Insurance",
    name: "Group Mediclaim",
    aliases: ["GMC", "Group Health"],
    keywords: ["group mediclaim", "employee", "members covered", "tpa", "corporate"],
    fields: healthFields(),
  },
  {
    category: "Commercial Insurance",
    company: "ICICI Lombard",
    name: "MSME Suraksha Kavach Package Policy - Advance",
    aliases: ["MSME Suraksha Kavach", "MSME Package Policy", "MSME Suraksha Kavach Package Policy"],
    keywords: [
      "msme suraksha kavach",
      "package policy",
      "advance",
      "contents",
      "burglary",
      "fidelity",
      "standard fire",
      "special perils",
      "warehouse",
      "godown",
    ],
    fields: msmeSurakshaFields(),
  },
  {
    category: "Commercial Insurance",
    name: "Fire Policy",
    aliases: ["Standard Fire and Special Perils", "SFSP"],
    keywords: ["fire", "building", "stock", "machinery", "risk location", "occupancy"],
    fields: commercialFields("Fire Policy"),
  },
  {
    category: "Commercial Insurance",
    name: "Marine Policy",
    aliases: ["Marine Cargo"],
    keywords: ["marine", "cargo", "transit", "consignment", "invoice"],
    fields: commercialFields("Marine Policy"),
  },
  {
    category: "Commercial Insurance",
    name: "Burglary",
    aliases: ["Burglary Policy"],
    keywords: ["burglary", "theft", "premises", "stock", "safe"],
    fields: commercialFields("Burglary"),
  },
  {
    category: "Commercial Insurance",
    name: "Liability",
    aliases: ["Public Liability", "Professional Indemnity"],
    keywords: ["liability", "indemnity", "third party", "limit of indemnity"],
    fields: commercialFields("Liability"),
  },
  {
    category: "Bank Insurance",
    name: "Loan Insurance",
    aliases: ["Loan Protection"],
    keywords: ["loan account", "borrower", "emi", "bank", "hypothecation"],
    fields: bankFields("Loan Insurance"),
  },
  {
    category: "Bank Insurance",
    name: "Property Mortgage Insurance",
    aliases: ["Mortgage Property Policy"],
    keywords: ["mortgage", "bank clause", "property", "hypothecation", "loan account"],
    fields: bankFields("Property Mortgage Insurance"),
  },
];

function healthFields() {
  return [
    field("insuredName", "Insured Name", "text", true, [
      "Name of the Insured",
      "Insured Name",
      "Proposer Name",
    ]),
    field("policyNumber", "Policy Number", "text", true, ["Policy No", "Policy Number", "Certificate No"]),
    field("insurerName", "Insurer Name", "text", true, ["Insurance Company", "Insurer"]),
    field("sumInsured", "Sum Insured", "currency", true, ["Sum Insured", "Coverage Amount"]),
    field("premium", "Premium", "currency", true, ["Premium", "Total Premium"]),
    field("membersCovered", "Members Covered", "textarea", false, [
      "Members Covered",
      "Insured Persons",
      "Covered Members",
    ]),
    field("policyStartDate", "Policy Start Date", "date", true, ["From", "Policy Start Date", "Period From"]),
    field("policyEndDate", "Policy End Date", "date", true, ["To", "Expiry Date", "Period To"]),
    field("tpaName", "TPA Name", "text", false, ["TPA", "TPA Name", "Third Party Administrator"]),
    field("nominee", "Nominee", "text", false, ["Nominee", "Nominee Name"]),
  ];
}

function commercialFields(policyName) {
  return [
    field("insuredName", "Insured Name", "text", true, ["Name of the Insured", "Insured Name"]),
    field("policyNumber", "Policy Number", "text", true, [
      "Policy No",
      "Policy Number",
      "Policy Schedule No",
    ]),
    field("insurerName", "Insurer Name", "text", true, ["Insurance Company", "Insurer"]),
    field("policyType", "Policy Type", "text", true, ["Policy Type", policyName]),
    field("riskLocation", "Risk Location", "textarea", true, [
      "Risk Location",
      "Premises to be Insured",
      "Location of Risk",
    ]),
    field("buildingValue", "Building Value", "currency", false, ["Building", "Building Value"]),
    field("stockValue", "Stock Value", "currency", false, ["Stock", "Stock Value"]),
    field("machineryValue", "Machinery Value", "currency", false, ["Machinery", "Machinery Value"]),
    field("occupancy", "Occupancy", "textarea", false, [
      "Occupancy",
      "Business of the Insured",
      "Description of Block",
    ]),
    field("sumInsured", "Sum Insured", "currency", true, ["Sum Insured", "Total Sum Insured"]),
    field("premium", "Premium", "currency", true, ["Premium", "Total Premium"]),
    field("fireCoverage", "Fire Coverage", "textarea", false, ["Fire Coverage", "Perils Covered", "Covers"]),
    field("policyStartDate", "Policy Start Date", "date", true, ["From", "Start Date"]),
    field("policyEndDate", "Policy End Date", "date", true, ["To", "Expiry Date"]),
    field("hypothecationBank", "Hypothecation Bank", "text", false, [
      "Hypothecation",
      "Bank Clause",
      "Financier",
    ]),
  ];
}

function msmeSurakshaFields() {
  return [
    field("insuredName", "Insured Name", "text", true, ["Name of the Insured", "Insured Name"]),
    field("policyNumber", "Policy Number", "text", true, ["Policy No", "Policy Number", "PolicyNo"]),
    field("mailingAddress", "Mailing Address", "textarea", false, [
      "Mailing Address of the Insured",
      "Mailing Address",
    ]),
    field("policyStartDate", "Policy Start Date", "date", true, ["Period of Insurance From", "From"]),
    field("policyEndDate", "Policy End Date", "date", true, ["To", "Midnight of", "Expiry Date"]),
    field("businessOfInsured", "Business of Insured", "textarea", false, [
      "Business of the Insured",
      "Business",
    ]),
    field("riskLocation", "Premises / Risk Location", "textarea", true, [
      "Premises to be Insured",
      "Risk Location",
      "Location of Risk",
    ]),
    field("issuedAt", "Issued At", "text", false, ["Issued at"]),
    field("premium", "Premium Including GST", "currency", true, [
      "Premium (`) (Including GST)",
      "Premium",
      "Total Premium",
    ]),
    field("hypothecationDetails", "Hypothecation Details", "text", false, [
      "Hypothecation Details",
      "Hypothecation",
      "Bank Clause",
    ]),
    field("loanAccountNumber", "Loan Account Number", "text", false, [
      "Loan Account No",
      "Loan Account Number",
    ]),
    field("brokerName", "Broker / Agency Name", "text", false, ["Agency/Broker Name", "Broker Name"]),
    field("brokerCode", "Broker / Agency Code", "text", false, ["Agency/Broker Code", "Broker Code"]),
    field("brokerMobile", "Broker Mobile Number", "text", false, [
      "Agency/Broker Mobile No",
      "Broker Mobile",
    ]),
    field("brokerEmail", "Broker Email", "text", false, ["Agency/Broker Email-ID", "Broker Email"]),
    field("contentsSumInsured", "Contents Sum Insured", "currency", false, [
      "MSME Suraksha Kavach - Contents",
      "Contents",
    ]),
    field("burglarySumInsured", "Burglary Sum Insured", "currency", false, ["Burglary"]),
    field("fidelitySumInsured", "Fidelity Sum Insured", "currency", false, ["Fidelity"]),
    field("clauses", "Clauses / Endorsements", "textarea", false, [
      "Subject to Clause",
      "Endorsement",
      "Agreed Bank Clause",
    ]),
    field("specialConditions", "Special Conditions", "textarea", false, ["Special Conditions", "Warranted"]),
  ];
}

function bankFields(policyName) {
  return [
    field("insuredName", "Insured Name", "text", true, [
      "Name of the Insured",
      "Borrower Name",
      "Insured Name",
    ]),
    field("policyNumber", "Policy Number", "text", true, ["Policy No", "Policy Number", "Certificate No"]),
    field("policyType", "Policy Type", "text", true, ["Policy Type", policyName]),
    field("bankName", "Bank Name", "text", true, ["Bank", "Bank Name", "Financier", "Hypothecation"]),
    field("loanAccountNumber", "Loan Account Number", "text", false, [
      "Loan Account",
      "Loan Account No",
      "LAN",
    ]),
    field("propertyAddress", "Property Address", "textarea", false, [
      "Property Address",
      "Risk Location",
      "Mortgage Property",
    ]),
    field("sumInsured", "Sum Insured", "currency", true, ["Sum Insured", "Mortgage Value", "Property Value"]),
    field("premium", "Premium", "currency", true, ["Premium", "Total Premium"]),
    field("policyStartDate", "Policy Start Date", "date", true, ["From", "Start Date"]),
    field("policyEndDate", "Policy End Date", "date", true, ["To", "Expiry Date"]),
  ];
}

function field(key, label, fieldType, required, aliases = [], options = []) {
  return { key, label, fieldType, required, aliases, options };
}
