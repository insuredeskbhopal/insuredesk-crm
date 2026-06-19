const { matchGroup } = require("../src/lib/policies/pdf/utils/regex.cjs");

const locations = [
  "PROP. MADHU SHRIVASTAVA, SURVEY NO. 51/5/1, 51/5/2, GRAM GOHAR, POST MANDIBAMORA, KHURAI ROAD, TEHSIL BINA, DISCTRICT SAGAR, MADHYA PRADESH, BAMORA R.S, SAGAR, MADHYA PRADESH, 464240Storage of Non- hazardous goods subject to warranty that hazardous goods of Category I, II, III , Coir waste, Coir fibre and Caddies are not stored therein. Lessthan 5Years, Ground Floor",
  "PROP SANGEETA ASHOK KUMAR PORWAL, STATE HIGHWAY 31 OPPOSITE UPAJ MANDI GRAM SUNTHOD, PO Area - SUNTHOD, , MANDSAUR, MADHYA PRADESH - 458339",
  "PROP. SANGEETA ASHOK KUMAR PORWAL, 1468/2/2, STATE HIGH- WAY 31 OPPOSITE KRISHI UPAJ MANDI, GRAM SUNTHOD, DIS- TRICT MANDSAUR SUNTHOD MANDSAUR MADHYA PRADESH 458339",
  "PROP. ASHA GUPTA, GRAM KHANJAPURA, SEONDHA, DISTRICT DATIA, SEONDHA, DATIA, MADHYA PRADESH, 475682Storage of Non- hazardous goods subject to warranty that hazardous goods of Category I, II, III , Coir waste, Coir fibre and Caddies are not stored therein. Lessthan 5Years, Ground Floor"
];

const regex = /\b(?:VILLAGE|GRAM|VILL|VIL|GRM)\s+((?!House|Building|No|Street|State|City|Pincode|Area|Tehsil|District|Road|Flat|Post|PO\b)[A-Z0-9-]+(?:\s+(?!House|Building|No|Street|State|City|Pincode|Area|Tehsil|District|Road|Flat|Post|PO\b)[A-Z0-9-]+)?)/i;

for (const loc of locations) {
  const match = loc.match(regex);
  console.log(`LOC: ${loc.substring(0, 100)}...`);
  console.log(`MATCH:`, match ? match[0] : "null");
  console.log(`GROUP 1:`, match ? match[1] : "null");
}
