const XLSX = require("xlsx");
const path = require("path");

// Sheet 1: Non-Motor & Warehouse
const nonMotorData = [
  {
    "Insurance Company": "United India Insurance Co. Ltd.",
    "Insured Name": "John Doe",
    "Policy Number": "UIIC/123456789/2025",
    "Policy Type": "Fire Policy",
    "Start Date": "2025-08-01",
    "Expiry Date": "2026-07-31",
    "Status": "ACTIVE",
    "Sum Insured": 1500000,
    "Net Premium": 10000,
    "Premium Including GST": 11800,
    "Contact Number": "9876543210",
    "Contact Person": "John Doe Sr",
    "Risk Location": "Plot No 42, Sector 5, Industrial Area, Noida",
    "Business Description": "Storage of electronic components and packaging materials",
    "Occupancy": "Warehouse",
    "Remark": "Needs renewal quote sent by email"
  },
  {
    "Insurance Company": "Bajaj Allianz General Insurance",
    "Insured Name": "HARIOM WAREHOUSE A/C MPWLC",
    "Policy Number": "BAGI/987654321/2025",
    "Policy Type": "Warehouse Insurance",
    "Start Date": "2025-07-01",
    "Expiry Date": "2026-06-30",
    "Status": "ACTIVE",
    "Sum Insured": 90000000,
    "Net Premium": 16351,
    "Premium Including GST": 19294,
    "Contact Number": "9876543222",
    "Contact Person": "Store Manager",
    "Risk Location": "Khasra No 112, Vidisha Warehouse Complex, Vidisha, MP",
    "Business Description": "Storage of Non-hazardous goods - Storage in godown or warehouse",
    "Occupancy": "Warehouse Godown",
    "Remark": "Requires custom discount approval for renewal"
  }
];

// Sheet 2: Motor Policies
const motorData = [
  {
    "Insurance Company": "TATA AIG General Insurance",
    "Insured Name": "Robert Johnson",
    "Policy Number": "BAGI/554433221",
    "Policy Type": "Motor Policy",
    "Start Date": "2025-07-21",
    "Expiry Date": "2026-07-20",
    "Status": "RENEWED",
    "Sum Insured": 450000,
    "Premium": 9200,
    "Contact Number": "9876543212",
    "Vehicle Number": "DL3CAN1234",
    "Make / Model": "Maruti Swift",
    "Variant": "VXI",
    "Manufacturing Year": 2020,
    "Engine Number": "K12M123456",
    "Chassis Number": "MA3EBG1A123456",
    "Fuel Type": "Petrol",
    "Cubic Capacity": 1197,
    "NCB": "20%",
    "RTO Location": "DELHI",
    "Remark": "Already renewed for next year"
  }
];

// Sheet 3: All Columns (Generic)
const genericData = [
  {
    "Insurance Company": "United India Insurance Co. Ltd.",
    "Insured Name": "John Doe",
    "Policy Number": "UIIC/123456789/2025",
    "Policy Type": "Fire Policy",
    "Start Date": "2025-08-01",
    "Expiry Date": "2026-07-31",
    "Status": "ACTIVE",
    "Sum Insured": 1500000,
    "Premium": 11800,
    "Net Premium": 10000,
    "Premium Including GST": 11800,
    "Contact Number": "9876543210",
    "Contact Person": "John Doe Sr",
    "Vehicle Number": "",
    "Make / Model": "",
    "Variant": "",
    "Manufacturing Year": "",
    "Engine Number": "",
    "Chassis Number": "",
    "Fuel Type": "",
    "Cubic Capacity": "",
    "NCB": "",
    "RTO Location": "",
    "Risk Location": "Plot No 42, Sector 5, Industrial Area, Noida",
    "Business Description": "Storage of electronic components and packaging materials",
    "Occupancy": "Warehouse",
    "Remark": "Needs renewal quote sent by email"
  },
  {
    "Insurance Company": "Bajaj Allianz General Insurance",
    "Insured Name": "HARIOM WAREHOUSE A/C MPWLC",
    "Policy Number": "BAGI/987654321/2025",
    "Policy Type": "Warehouse Insurance",
    "Start Date": "2025-07-01",
    "Expiry Date": "2026-06-30",
    "Status": "ACTIVE",
    "Sum Insured": 90000000,
    "Premium": 19294,
    "Net Premium": 16351,
    "Premium Including GST": 19294,
    "Contact Number": "9876543222",
    "Contact Person": "Store Manager",
    "Vehicle Number": "",
    "Make / Model": "",
    "Variant": "",
    "Manufacturing Year": "",
    "Engine Number": "",
    "Chassis Number": "",
    "Fuel Type": "",
    "Cubic Capacity": "",
    "NCB": "",
    "RTO Location": "",
    "Risk Location": "Khasra No 112, Vidisha Warehouse Complex, Vidisha, MP",
    "Business Description": "Storage of Non-hazardous goods - Storage in godown or warehouse",
    "Occupancy": "Warehouse Godown",
    "Remark": "Requires custom discount approval for renewal"
  },
  {
    "Insurance Company": "TATA AIG General Insurance",
    "Insured Name": "Robert Johnson",
    "Policy Number": "BAGI/554433221",
    "Policy Type": "Motor Policy",
    "Start Date": "2025-07-21",
    "Expiry Date": "2026-07-20",
    "Status": "RENEWED",
    "Sum Insured": 450000,
    "Premium": 9200,
    "Net Premium": 7800,
    "Premium Including GST": 9200,
    "Contact Number": "9876543212",
    "Contact Person": "Robert Johnson",
    "Vehicle Number": "DL3CAN1234",
    "Make / Model": "Maruti Swift",
    "Variant": "VXI",
    "Manufacturing Year": 2020,
    "Engine Number": "K12M123456",
    "Chassis Number": "MA3EBG1A123456",
    "Fuel Type": "Petrol",
    "Cubic Capacity": 1197,
    "NCB": "20%",
    "RTO Location": "DELHI",
    "Risk Location": "",
    "Business Description": "",
    "Occupancy": "",
    "Remark": "Already renewed for next year"
  }
];

function main() {
  const outputPath = path.join(__dirname, "..", "storage", "generic_renewal_template.xlsx");
  console.log(`Generating multi-sheet renewal template Excel sheet at: ${outputPath}`);

  const workbook = XLSX.utils.book_new();

  // Add sheets
  const wsNonMotor = XLSX.utils.json_to_sheet(nonMotorData);
  XLSX.utils.book_append_sheet(workbook, wsNonMotor, "Non-Motor & Warehouse");

  const wsMotor = XLSX.utils.json_to_sheet(motorData);
  XLSX.utils.book_append_sheet(workbook, wsMotor, "Motor Policies");

  const wsGeneric = XLSX.utils.json_to_sheet(genericData);
  XLSX.utils.book_append_sheet(workbook, wsGeneric, "All Columns (Generic)");

  // Write file
  XLSX.writeFile(workbook, outputPath);
  console.log("Multi-sheet Template generated successfully!");
}

main();
