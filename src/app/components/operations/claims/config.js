export const CLAIM_WIZARD_STEPS = [
  "Client Details",
  "Claim Details",
  "Surveyor Details",
  "Supporting Documents",
];

const CLAIM_TYPE_OPTIONS = [
  "Motor",
  "Health",
  "Life",
  "Warehouse / Fire",
  "Marine",
  "Engineering",
  "Liability",
  "Other",
];

const CLAIM_STATUS_OPTIONS = ["Open", "Follow Up", "Documents Pending", "Settled", "Rejected"];
const CLAIM_PRIORITY_OPTIONS = ["Normal", "High", "Urgent"];
const YES_NO_OPTIONS = ["No", "Yes"];

export const CLIENT_DETAIL_FIELDS = [
  { key: "insuredName", label: "Insured Name", placeholder: "Enter insured name", required: true },
  {
    key: "mobileNo",
    label: "Mobile Number",
    placeholder: "Enter mobile number",
    inputMode: "tel",
    required: true,
  },
  { key: "contactPerson", label: "Contact Person", placeholder: "Enter contact person" },
  { key: "policyNo", label: "Policy Number", placeholder: "Enter policy number", required: true },
  {
    key: "insuranceCompany",
    label: "Insurance Company",
    placeholder: "Enter insurance company",
    required: true,
  },
  { key: "groupName", label: "Group Name", placeholder: "Enter group name" },
  { key: "claimType", label: "Claim Type", type: "select", options: CLAIM_TYPE_OPTIONS, required: true },
  { key: "customerId", label: "Customer ID", readOnly: true },
  { key: "assignedExecutive", label: "Assigned Executive", placeholder: "Enter assigned executive" },
  { key: "branchOffice", label: "Branch Office", placeholder: "Enter branch office" },
  { key: "policyStartDate", label: "Policy Start Date", type: "date" },
  { key: "policyExpiryDate", label: "Policy Expiry Date", type: "date" },
];

export const COMMON_CLAIM_FIELDS = [
  { key: "claimNo", label: "Claim Number", placeholder: "Enter claim number", required: true },
  { key: "claimDate", label: "Claim Date", type: "date", required: true },
  { key: "dateOfLoss", label: "Date of Loss", type: "date", required: true },
  { key: "claimStatus", label: "Claim Status", type: "select", options: CLAIM_STATUS_OPTIONS },
  { key: "claimPriority", label: "Claim Priority", type: "select", options: CLAIM_PRIORITY_OPTIONS },
  { key: "followUpDate", label: "Follow-up Date", type: "date" },
  {
    key: "claimDescription",
    label: "Claim Description",
    type: "textarea",
    placeholder: "Enter claim description",
  },
  {
    key: "currentRemark",
    label: "Current Remark",
    type: "textarea",
    placeholder: "Enter current remark or claim follow-up note",
  },
];

export const CLAIM_SPECIFIC_FIELDS = {
  Motor: [
    { key: "vehicleNumber", label: "Vehicle Number" },
    { key: "driverName", label: "Driver Name" },
    { key: "driverMobile", label: "Driver Mobile", inputMode: "tel" },
    { key: "accidentLocation", label: "Accident Location" },
    { key: "firNumber", label: "FIR Number" },
    { key: "policeStation", label: "Police Station" },
    { key: "garageName", label: "Garage Name" },
  ],
  Health: [
    { key: "patientName", label: "Patient Name" },
    { key: "hospitalName", label: "Hospital Name" },
    { key: "admissionDate", label: "Admission Date", type: "date" },
    { key: "dischargeDate", label: "Discharge Date", type: "date" },
    { key: "diagnosis", label: "Diagnosis" },
    {
      key: "cashlessReimbursement",
      label: "Cashless / Reimbursement",
      type: "select",
      options: ["Cashless", "Reimbursement"],
    },
    { key: "tpaName", label: "TPA Name" },
  ],
  "Warehouse / Fire": [
    { key: "propertyAddress", label: "Property Address" },
    { key: "warehouseName", label: "Warehouse Name" },
    { key: "causeOfLoss", label: "Cause of Loss" },
    { key: "estimatedLoss", label: "Estimated Loss", inputMode: "decimal" },
    { key: "stockDamaged", label: "Stock Damaged" },
    {
      key: "fireBrigadeReportAvailable",
      label: "Fire Brigade Report Available",
      type: "select",
      options: YES_NO_OPTIONS,
    },
  ],
  Marine: [
    { key: "shipmentNumber", label: "Shipment Number" },
    { key: "lrNumber", label: "LR Number" },
    { key: "invoiceNumber", label: "Invoice Number" },
    { key: "transporter", label: "Transporter" },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
    { key: "cargoDescription", label: "Cargo Description" },
  ],
  Life: [
    { key: "nomineeName", label: "Nominee Name" },
    { key: "dateOfDeathEvent", label: "Date of Death / Event", type: "date" },
    { key: "causeOfClaim", label: "Cause of Claim" },
    { key: "relationshipWithInsured", label: "Relationship with Insured" },
  ],
  Engineering: [
    { key: "incidentLocation", label: "Incident Location" },
    { key: "assetOrProject", label: "Asset / Project" },
    { key: "causeOfIncident", label: "Cause of Incident" },
    { key: "estimatedLoss", label: "Estimated Loss", inputMode: "decimal" },
    { key: "thirdPartyInvolved", label: "Third Party Involved", type: "select", options: YES_NO_OPTIONS },
  ],
  Liability: [
    { key: "incidentLocation", label: "Incident Location" },
    { key: "claimantName", label: "Claimant Name" },
    { key: "liabilityNature", label: "Nature of Liability" },
    { key: "estimatedExposure", label: "Estimated Exposure", inputMode: "decimal" },
    { key: "legalNoticeReceived", label: "Legal Notice Received", type: "select", options: YES_NO_OPTIONS },
  ],
  Other: [
    { key: "incidentLocation", label: "Incident Location" },
    { key: "incidentCategory", label: "Incident Category" },
    { key: "causeOfIncident", label: "Cause of Incident" },
    { key: "estimatedLoss", label: "Estimated Loss", inputMode: "decimal" },
    { key: "additionalReference", label: "Additional Reference" },
  ],
};

export const SURVEYOR_FIELDS = [
  { key: "surveyAssigned", label: "Survey Assigned", type: "select", options: YES_NO_OPTIONS },
  { key: "surveyAssignedDate", label: "Survey Assigned Date", type: "date" },
  { key: "surveyorName", label: "Surveyor Name" },
  { key: "surveyorCompany", label: "Surveyor Company" },
  { key: "irdaiLicenseNumber", label: "IRDAI License Number" },
  { key: "surveyorMobile", label: "Mobile Number", inputMode: "tel" },
  { key: "surveyorEmail", label: "Email Address", type: "email" },
  { key: "surveyDate", label: "Survey Date", type: "date" },
  { key: "surveyTime", label: "Survey Time", type: "time" },
  { key: "surveyLocation", label: "Survey Location" },
  {
    key: "surveyStatus",
    label: "Survey Status",
    type: "select",
    options: ["Not Assigned", "Assigned", "Scheduled", "Completed", "Report Awaited"],
  },
  { key: "surveyEstimatedLoss", label: "Estimated Loss", inputMode: "decimal" },
  { key: "recommendedSettlement", label: "Recommended Settlement", inputMode: "decimal" },
  { key: "surveyRemarks", label: "Survey Remarks", type: "textarea" },
  { key: "reportReceived", label: "Report Received", type: "select", options: YES_NO_OPTIONS },
  { key: "reportSubmissionDate", label: "Report Submission Date", type: "date" },
];

export const EMPTY_CLAIM = {
  internalClaimId: "",
  customerId: "",
  insuredName: "",
  mobileNo: "",
  contactPerson: "",
  policyNo: "",
  insuranceCompany: "",
  claimNo: "",
  groupName: "",
  claimDescription: "",
  claimDate: "",
  claimType: "Motor",
  claimStatus: "Open",
  dateOfLoss: "",
  claimPriority: "Normal",
  followUpDate: "",
  currentRemark: "",
  assignedExecutive: "",
  branchOffice: "",
  policyStartDate: "",
  policyExpiryDate: "",
  claimDetails: {},
  surveyorDetails: {
    surveyAssigned: "No",
    surveyStatus: "Not Assigned",
    reportReceived: "No",
  },
  remarks: [],
  documents: [],
};

export const DETAIL_FIELDS = [
  ["Internal Claim ID", "internalClaimId"],
  ["Customer ID", "customerId"],
  ["Insured Name", "insuredName"],
  ["Mobile No.", "mobileNo"],
  ["Contact Person", "contactPerson"],
  ["Policy No.", "policyNo"],
  ["Insurance Company", "insuranceCompany"],
  ["Assigned Executive", "assignedExecutive"],
  ["Branch Office", "branchOffice"],
  ["Policy Start Date", "policyStartDate"],
  ["Policy Expiry Date", "policyExpiryDate"],
  ["Claim No.", "claimNo"],
  ["Group Name", "groupName"],
  ["Claim Date", "claimDate"],
  ["Date of Loss", "dateOfLoss"],
  ["Claim Type", "claimType"],
  ["Claim Status", "claimStatus"],
  ["Claim Priority", "claimPriority"],
  ["Follow-up Date", "followUpDate"],
  ["Claim Description", "claimDescription"],
  ["Current Remark", "currentRemark"],
];

export const FILTERS = [
  { id: "all", label: "All Claims", accent: "orange" },
  { id: "open", label: "Open Claims", accent: "amber" },
  { id: "follow-up", label: "Follow Ups", accent: "blue" },
  { id: "documents", label: "Documents Pending", accent: "red" },
  { id: "settled", label: "Settled Claims", accent: "green" },
  { id: "rejected", label: "Rejected Claims", accent: "slate" },
];
