
const { escapeRegExp } = require("./regex.cjs");

let rtoMaster = null;

const MP_DISTRICTS = [
  "AGAR MALWA", "ALIRAJPUR", "ANUPPUR", "ASHOKNAGAR", "ASHOK NAGAR", "BALAGHAT", "BARWANI", "BETUL",
  "BHIND", "BHOPAL", "BURHANPUR", "CHHATARPUR", "CHHINDWARA", "DAMOH", "DATIA", "DEWAS", "DHAR",
  "DINDORI", "GUNA", "GWALIOR", "HARDA", "HOSHANGABAD", "NARMADAPURAM", "INDORE", "JABALPUR",
  "JHABUA", "KATNI", "KHANDWA", "KHARGONE", "MANDLA", "MANDSAUR", "MORENA", "NARSINGHPUR",
  "NEEMUCH", "NIWARI", "PANNA", "RAISEN", "RAJGARH", "RATLAM", "REWA", "SAGAR", "SATNA", "SEHORE",
  "SEONI", "SHAHDOL", "SHAJAPUR", "SHEOPUR", "SHIVPURI", "SIDHI", "SINGRAULI", "TIKAMGARH",
  "UJJAIN", "UMARIA", "VIDISHA"
];

// Start of lookupRtoLocation (Lines 1210-1233)
function lookupRtoLocation(vehicleNumber) {
  if (!vehicleNumber) return null;
  const clean = vehicleNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const match = clean.match(/^([A-Z]{2})(\d{1,2})/);
  if (!match) return null;

  const state = match[1];
  const digits = match[2].padStart(2, "0");
  const rtoCode = state + digits;

  if (!rtoMaster) {
    try {
      rtoMaster = require("../../../../../rto-data/rto-master.json");
    } catch {
      rtoMaster = {};
    }
  }

  const info = rtoMaster[rtoCode];
  if (info) {
    return (info.rtoOffice || info.district || info.jurisdiction || "").toUpperCase().trim();
  }
  return null;
}

// Start of extractLocationPart (Lines 3825-3890)
function extractLocationPart(text, riskLocation, kind) {
  const haystack = `${riskLocation || ""} ${text}`.replace(/\s+/g, " ");
  
  if (kind === "district") {
    // 1. Explicit DISTRICT / DIST prefix match (as primary if matched value is/contains a valid MP district)
    const distMatch = haystack.match(/\b(?:DIST(?:RICT|ICT)?|DIS)\b\s*[-.:,]*\s*([A-Z]+(?:\s+[A-Z]+)?)/i);
    if (distMatch) {
      let val = distMatch[1].trim().toUpperCase();
      val = val.replace(/^TRICT\s+/i, ""); // Clean prefix
      if (val !== "TEHSIL" && val !== "TEH" && val !== "STATE" && val !== "MADHYA") {
        const matchedMpDist = MP_DISTRICTS.find(d => val === d || val.startsWith(d + " "));
        if (matchedMpDist) {
          return val;
        }
      }
    }

    // 2. Lookup known MP districts positionally (find the first occurrence of any valid MP district name in riskLocation first, then in haystack)
    const searchArea = riskLocation || haystack;
    let bestDist = "";
    let bestIndex = Infinity;
    for (const dist of MP_DISTRICTS) {
      const reg = new RegExp("\\b" + escapeRegExp(dist) + "\\b", "i");
      const match = searchArea.match(reg);
      if (match && match.index < bestIndex) {
        bestIndex = match.index;
        bestDist = dist;
      }
    }
    if (bestDist) {
      return bestDist;
    }

    // 3. Position before MADHYA PRADESH fallback
    const beforeMpMatch = haystack.match(/\b([A-Z]+(?:\s+[A-Z]+)?)[,\s-]+MADHYA\s+PRADESH/i);
    if (beforeMpMatch) {
      let val = beforeMpMatch[1].trim().toUpperCase();
      if (val !== "TEHSIL" && val !== "TEH" && val !== "STATE") {
        return val;
      }
    }

    // 4. Position after MADHYA PRADESH fallback
    const afterMpMatch = haystack.match(/MADHYA\s+PRADESH\s+([A-Z]+(?:\s+[A-Z]+)?)/i);
    if (afterMpMatch) {
      let val = afterMpMatch[1].trim().toUpperCase();
      if (val !== "TEHSIL" && val !== "TEH" && val !== "STATE") {
        return val;
      }
    }

    return "";
  }

  // kind === "tehsil"
  // 1. Explicit TEHSIL / TEH prefix match
  const tehMatch = haystack.match(/\b(?:TEH(?:SIL|ESIL|SHIL|S|H)?|TESH(?:IL)?|TEH\.)\b\s*[-.:,]*\s*([A-Z]+(?:\s+[A-Z]+)?)/i);
  if (tehMatch) {
    let val = tehMatch[1].trim().toUpperCase();
    if (val !== "DISTRICT" && val !== "DIST" && val !== "STATE" && val !== "MADHYA") {
      return val;
    }
  }

  return "";
}

// Start of localExtractLocationPart (Lines 7742-7744)
function localExtractLocationPart(address, type) {
  return extractLocationPart(address, address, type);
}

module.exports = {
  lookupRtoLocation,
  extractLocationPart,
  localExtractLocationPart
};
