export const OPERATIONS_MODULES = [
  {
    id: "work-center",
    name: "Work Center",
    description: "Plan tasks, reminders, approvals, escalations, and team workload.",
    route: "/work-center",
    buttonLabel: "Open Work Center",
    accent: "blue",
    functions: [
      "Task management",
      "Follow-up planner",
      "Renewal reminders",
      "Approvals",
      "Escalations",
      "Activity feed"
    ]
  },
  {
    id: "customer-profiling",
    name: "Customer Profiling",
    description: "Capture customer requirements before policy recommendation.",
    route: "/operations/customer-profiling",
    buttonLabel: "Open Customer Profiling",
    accent: "green",
    functions: [
      "Create customer profile",
      "Record insurance needs",
      "Existing policy details",
      "Risk assessment",
      "Family information",
      "Income information",
      "Future insurance requirements",
      "Lead qualification"
    ]
  },
  {
    id: "manual-policy-entry",
    name: "Manual Policy Entry",
    description: "Create policy records manually when PDF extraction is unavailable.",
    route: "/operations/manual-policy-entry",
    buttonLabel: "Open Policy Entry",
    accent: "blue",
    functions: [
      "Manual policy creation",
      "Policy editing",
      "Data verification",
      "Policy upload support"
    ]
  },
  {
    id: "claims-management",
    name: "Claims Management",
    description: "Manage customer claims and claim servicing.",
    route: "/operations/claims-management",
    buttonLabel: "Open Claims",
    accent: "red",
    functions: [
      "Register claim",
      "Track claim status",
      "Upload claim documents",
      "Surveyor information",
      "Settlement tracking",
      "Rejection tracking"
    ]
  },
  {
    id: "declarations",
    name: "Declarations",
    description: "Manage customer declarations and compliance documents.",
    route: "/operations/declarations",
    buttonLabel: "Open Declarations",
    accent: "purple",
    functions: [
      "Health declarations",
      "Risk declarations",
      "Business declarations",
      "Proposal declarations",
      "Declaration history"
    ]
  },
  {
    id: "endorsements",
    name: "Endorsements",
    description: "Manage policy modifications and endorsements.",
    route: "/dashboard/endorsements",
    buttonLabel: "Open Endorsements",
    accent: "amber",
    functions: [
      "Address changes",
      "Nominee changes",
      "Vehicle changes",
      "Coverage updates",
      "Policy corrections"
    ]
  },
  {
    id: "service-requests",
    name: "Service Requests",
    description: "Handle customer servicing requests.",
    route: "/operations/service-requests",
    buttonLabel: "Open Service Requests",
    accent: "cyan",
    functions: [
      "Policy copy requests",
      "Renewal support",
      "Premium certificates",
      "NCB certificates",
      "Customer support tickets",
      "General servicing"
    ]
  },
  {
    id: "lead-management",
    name: "Lead Management",
    description: "Manage insurance sales opportunities and prospects.",
    route: "/operations/lead-management",
    buttonLabel: "Open Lead Management",
    accent: "indigo",
    functions: [
      "Lead creation",
      "Lead assignment",
      "Follow-ups",
      "Opportunity tracking",
      "Lead conversion tracking",
      "Lost lead tracking"
    ]
  }
];

export const FUTURE_OPERATIONS_MODULES = [
  "Proposal Management",
  "Quotations",
  "KYC Verification",
  "Document Collection",
  "Inspections",
  "Field Visits",
  "Agent Activities",
  "Customer Support Center",
  "Task Management",
  "Workflow Automation"
];

export function getOperationsModule(id) {
  return OPERATIONS_MODULES.find((module) => module.id === id) || null;
}

