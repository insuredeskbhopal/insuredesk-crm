const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../../master/insurance-companies.cjs");
const { matchGroup, escapeRegExp } = require("../../utils/regex.cjs");
const { normalizeAmount, sumPlainAmounts } = require("../../utils/amounts.cjs");
const { normalizeFuelType, isPlausibleEngineNumber, splitGenericMakeModel } = require("../../utils/motor.cjs");
const { cleanHdfcValue, cleanWarehouseBlock } = require("../../utils/text.cjs");
const { localExtractLocationPart } = require("../../utils/locations.cjs");
const { findIffcoEvidence } = require("../iffco/index.cjs");
const { normalizeWarehouseDate } = require("../../utils/dates.cjs");

// Start of isBajajIssuerDocument (Lines 5780-5787)
function isBajajIssuerDocument(text) {
  return (
    /Bajaj\s+General\s+Insurance\s+Limited/i.test(text) ||
    /BAJAJ\s+GENERAL\s+INSURANCE\s+LIMITED/i.test(text) ||
    /careforyou@bajajgeneral\.com/i.test(text) ||
    /IRDAN113/i.test(text)
  );
}

// Start of isBajajAllianzMotor (Lines 6478-6499)
function isBajajAllianzMotor(text) {
  const hasBajajCompanyMarker =
    /Bajaj\s+Allianz/i.test(text) ||
    /Bajaj\s+General\s+Insurance/i.test(text) ||
    /careforyou@bajajgeneral\.com/i.test(text);

  if (!hasBajajCompanyMarker) return false;

  const signals = [
    /Private\s*Car\s*Package\s*Policy/i,
    /Certificate\s*of\s*Insurance/i,
    /Policy\s*Number\s*[:.-]?\s*OG-/i,
    /IRDAN113/i,
  ];
  let matches = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) {
      matches++;
    }
  }
  return matches >= 1;
}

// Start of normalizeBajajDate (Lines 6501-6527)
function normalizeBajajDate(dateStr) {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/[^a-zA-Z0-9-]/g, "").trim();
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    let day = parts[0].trim().padStart(2, "0");
    let monthName = parts[1].trim().toUpperCase();
    let year = parts[2].trim();
    const months = {
      JAN: "01",
      FEB: "02",
      MAR: "03",
      APR: "04",
      MAY: "05",
      JUN: "06",
      JUL: "07",
      AUG: "08",
      SEP: "09",
      OCT: "10",
      NOV: "11",
      DEC: "12",
    };
    const month = months[monthName] || monthName;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Start of extractBajajMakeModel (Lines 6529-6600)
function extractBajajMakeModel(text) {
  // Only look in text after B.VehicleDetails to avoid proposer name/address matches (e.g. MAHINDRA SHIKSHA SAMITI)
  let searchSpace = text;
  const vehicleDetailsIndex = text.search(/B\.VehicleDetails|VehicleDetails|Registration\s+Number/i);
  if (vehicleDetailsIndex !== -1) {
    searchSpace = text.slice(vehicleDetailsIndex);
  }

  const lines = searchSpace
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const knownMakes = [
    "FORCE MOTORS",
    "FORCE",
    "MARUTI",
    "HYUNDAI",
    "TATA",
    "MAHINDRA",
    "TOYOTA",
    "FORD",
    "RENAULT",
    "NISSAN",
    "VOLKSWAGEN",
    "KIA",
    "MG",
    "SKODA",
    "HONDA",
    "BAJAJ",
    "HERO",
    "TVS",
    "YAMAHA",
    "SUZUKI",
    "ROYAL ENFIELD",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    if (
      upper.includes("INSURANCE") ||
      upper.includes("FORMERLY KNOWN AS") ||
      upper.includes("REGISTERED AND HEAD OFFICE") ||
      upper.includes("CORPORATE IDENTITY NUMBER") ||
      upper.includes("PROPOSAL")
    ) {
      continue;
    }

    const make = knownMakes.find((m) => upper.startsWith(m));
    if (make) {
      const makeIndex = upper.indexOf(make);
      let firstLine = line.slice(makeIndex);
      const vinMatch = firstLine.match(/M[A-EZ][A-Z0-9]{15}/i);
      if (vinMatch) {
        firstLine = firstLine.slice(0, firstLine.indexOf(vinMatch[0])).replace(/\d+$/, "");
        return firstLine.trim();
      }

      let collected = [firstLine];
      let j = i + 1;
      while (j < lines.length && j < i + 10) {
        const nextLine = lines[j];
        if (/NCB|Premium|Policy|Period|Limit|Address|Customer|Compulsory/i.test(nextLine)) break;
        if (/^\d{3,4}$/.test(nextLine)) break;
        if (/^\d{1,2}$/.test(nextLine)) break;
        if (/^\d{4}$/.test(nextLine)) break;
        if (/^\d+,\d+/.test(nextLine)) break;
        if (/\b(?:Petrol|Diesel|CNG|EV|Electric)\b/i.test(nextLine)) break;

        if (knownMakes.some((m) => nextLine.toUpperCase().startsWith(m))) break;
        if (/^[A-Z]{2}\d{2}/i.test(nextLine)) break;
        if (/^\d+\.\d+/.test(nextLine)) break;

        // Break if we hit the digit block prefixing the chassis number
        if (/\b\d+M[A-EZ]/i.test(nextLine) || /^\d+M[A-EZ]/i.test(nextLine)) {
          break;
        }

        const lineVinMatch = nextLine.match(/M[A-EZ][A-Z0-9]{15}/i);
        if (lineVinMatch) {
          let cleanedLine = nextLine.slice(0, nextLine.indexOf(lineVinMatch[0])).replace(/\d+$/, "");
          if (cleanedLine.trim()) {
            collected.push(cleanedLine);
          }
          break;
        }

        collected.push(nextLine);
        j++;
      }
      let full = collected
        .join(" ")
        .replace(/\s+/g, " ");
      full = full.replace(/(\w+)-\s+(\w+)/g, "$1$2");
      full = full.replace(/\s*-\s*/g, " - ").trim();
      return full;
    }
  }
  return "";
}

function isPlausibleChassisNumber(value = "") {
  const cleaned = String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleaned.length !== 17) return false;
  if (!/\d/.test(cleaned) || !/[A-Z]/.test(cleaned)) return false;
  if (/(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|KIA|MG|SKODA|FORCE|WAGON|STING|VENUE|KAPPA)/i.test(cleaned)) {
    return false;
  }
  return true;
}

function isPlausibleEngineForBajaj(value = "", rto = "", regNo = "") {
  const cleaned = String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (!isPlausibleEngineNumber(cleaned)) return false;
  if (/(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TG|TN|TR|TS|UA|UK|UP|UT|WB)\d{2}/i.test(cleaned)) {
    if (/^(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TG|TN|TR|TS|UA|UK|UP|UT|WB)\d{2}$/i.test(cleaned)) {
      return false;
    }
  }
  if (/(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|KIA|MG|SKODA|FORCE|WAGON|STING|VENUE|KAPPA|TRAVELLER|SCHOOL|BUS|PASSENGER|CAR|MOTOR|VEHICLE|PETROL|DIESEL|CNG|LPG|ELECTRIC|HYBRID|TURBO|GDIPETROL|DCTSX)/i.test(cleaned)) {
    return false;
  }
  if (rto) {
    const rtoClean = rto.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.includes(rtoClean)) return false;
  }
  if (regNo) {
    const regClean = regNo.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (regClean.includes(cleaned)) return false;
  }
  if (/(?:BHOPAL|INDORE|GWALIOR|JABALPUR|RAJGARH)/i.test(cleaned)) return false;
  return true;
}

function extractSubEngine(block, rto = "", regNo = "") {
  let cleaned = block.toUpperCase();
  if (rto) {
    const rtoClean = rto.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.includes(rtoClean)) {
      const parts = cleaned.split(rtoClean);
      for (const p of parts) {
        const sub = extractSubEngine(p, rto, regNo);
        if (sub) return sub;
      }
    }
  }
  const stateCodeRegex = /(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TG|TN|TR|TS|UA|UK|UP|UT|WB)\d{2}/i;
  const rtoPrefixMatch = cleaned.match(stateCodeRegex);
  if (rtoPrefixMatch) {
    const parts = cleaned.split(rtoPrefixMatch[0]);
    for (const p of parts) {
      const sub = extractSubEngine(p, rto, regNo);
      if (sub) return sub;
    }
  }
  if (isPlausibleEngineForBajaj(cleaned, rto, regNo)) {
    return cleaned;
  }
  return "";
}

// Start of extractBajajAllianzMotor (Lines 6602-6778)
function extractBajajAllianzMotor(text, _sourceFile = "") {
  if (!isBajajAllianzMotor(text)) return { documentDetected: false };

  const policyNumber =
    matchGroup(text, /(OG-\d{2}-\d{4}-\d{4}-\d{8})/i) ||
    matchGroup(text, /Policy\s*Number\s*[:.-]?\s*(OG-[0-9a-zA-Z/-]+)/i) ||
    matchGroup(text, /PolicyNumber\s*[:.-]?\s*(OG-[0-9a-zA-Z/-]+)/i);

  let insuredName = "";
  const proposerNameMatch = matchGroup(text, /Proposer\s*Name(?!d)\s*[:.-]?\s*([A-Z0-9\s/.,&()-]+?)(?:Address|\n|$)/i);
  if (proposerNameMatch && proposerNameMatch.trim().length > 3) {
    insuredName = proposerNameMatch;
  }
  if (!insuredName) {
    const dearMatch = matchGroup(text, /Dear\s+([A-Z0-9\s/.,&()-]+?)(?:,|\n|$)/i);
    if (dearMatch && !/^(Customer|Policyholder|Sir|Madam|Insured|Valued|Proposer)$/i.test(dearMatch.trim()) && dearMatch.trim().length > 3) {
      insuredName = dearMatch;
    }
  }
  if (!insuredName) {
    const insuredNameMatch = matchGroup(text, /Insured\s*Name(?!d)\s*[:.-]?\s*([A-Z0-9\s/.,&()-]+?)(?:Insured|Address|\n|$)/i);
    if (insuredNameMatch && insuredNameMatch.trim().length > 3) {
      insuredName = insuredNameMatch;
    }
  }
  insuredName = insuredName.replace(/\s+/g, " ").trim();

  const startDateRaw =
    matchGroup(text, /From\s*:\s*(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
    matchGroup(text, /From\s+(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
    matchGroup(text, /on\s+(\d{1,2}-[A-Z]{3}-\d{4})/i);
  const expiryDateRaw =
    matchGroup(text, /To\s*:\s*(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
    matchGroup(text, /To\s+(\d{1,2}-[A-Z]{3}-\d{4})/i) ||
    matchGroup(text, /on\s+(\d{1,2}-[A-Z]{3}-\d{4})/i);

  const startDate = normalizeBajajDate(startDateRaw);
  const expiryDate = normalizeBajajDate(expiryDateRaw);

  const registrationNumber = (
    matchGroup(text, /Registration\s+Number\s*\n\s*Place[^\n]*\n\s*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i) ||
    matchGroup(text, /([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i)
  )
    .toUpperCase()
    .replace(/\s+/g, "");

  const rtoLocation = matchGroup(text, /(?:Name\s*of\s*Registration\s*Authority|NAMEOFREGISTRATIONAUTHORITY)\s*[:.-]?\s*([A-Z0-9 -]{3,30})/i) || "";

  const makeModel = extractBajajMakeModel(text);
  const parsedMakeModel = splitGenericMakeModel(makeModel);
  const make = parsedMakeModel.make || "";
  const model = parsedMakeModel.model || "";

  // Improved variant extraction matching logic
  let variant = "";
  const subTypeRegex = /Sub\s*Type(?:Year|[\s\S]{0,60}?)\n\s*([A-Z0-9 ./-]+?)(?:\r?\n\s*([A-Z0-9 ./-]+?))?\s*(?=\s*\d{4}[-\s\d])/i;
  const subTypeMatch = text.match(subTypeRegex);
  if (subTypeMatch) {
    const val = [subTypeMatch[1], subTypeMatch[2]].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (val && !/seating|capacity|engine|chassis|registration|make|model/i.test(val)) {
      variant = val;
    }
  }

  if (!variant) {
    const simpleMatch = matchGroup(text, /Vehicle\s*Sub\s*Type\s*\n\s*([A-Z0-9 ./-]+)/i) ||
                        matchGroup(text, /SubType\s*\n\s*([A-Z0-9 ./-]+)/i);
    if (simpleMatch && !/MP\d{2}/i.test(simpleMatch) && simpleMatch.length < 50) {
      variant = simpleMatch.trim();
    }
  }

  // Try layout-aware concatenated table rows for engine and chassis numbers
  let engineNumber = "";
  let chassisNumber = "";
  let cubicCapacity = "";
  let manufacturingYear = "";
  let seatingCapacity = "";
  
  if (registrationNumber) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineCleaned = lines[i].replace(/\s+/g, "");
      if (lineCleaned.startsWith(registrationNumber)) {
        // Concatenate this line and next 8 lines (removing spaces and hyphens)
        let combined = lineCleaned;
        for (let k = 1; k <= 8; k++) {
          if (lines[i + k]) combined += lines[i + k].replace(/\s+/g, "");
        }

        const normalizedCombined = combined.replace(/[^A-Z0-9]/gi, "").toUpperCase();

        // Standard Indian chassis starts with MA, MB, MC, MD, ME, MZ, and is 17 characters long.
        const vinRegex = /M[A-EZ][A-Z0-9]{15}/gi;
        let vinMatch;
        let vinStartIndex = -1;
        while ((vinMatch = vinRegex.exec(normalizedCombined)) !== null) {
          const candidateChassis = vinMatch[0].toUpperCase();
          if (isPlausibleChassisNumber(candidateChassis)) {
            chassisNumber = candidateChassis;
            vinStartIndex = vinMatch.index;
            break;
          }
        }

        if (chassisNumber && vinStartIndex !== -1) {
          const vinEndIndex = vinStartIndex + 17;
          
          const engineRegex = /[A-Z0-9]{6,35}/gi;
          let match;
          while ((match = engineRegex.exec(normalizedCombined)) !== null) {
            const block = match[0];
            const candStartIndex = match.index;
            const candEndIndex = candStartIndex + block.length;
            
            let safeParts = [];
            if (candStartIndex >= vinEndIndex || candEndIndex <= vinStartIndex) {
              safeParts.push(block);
            } else {
              if (candStartIndex < vinStartIndex) {
                safeParts.push(block.slice(0, vinStartIndex - candStartIndex));
              }
              if (candEndIndex > vinEndIndex) {
                safeParts.push(block.slice(vinEndIndex - candStartIndex));
              }
            }
            
            for (const part of safeParts) {
              if (part.length >= 6) {
                const subEngine = extractSubEngine(part, rtoLocation, registrationNumber);
                if (subEngine) {
                  engineNumber = subEngine;
                  break;
                }
              }
            }
            if (engineNumber) break;
          }

          // Fallback: Now look at subsequent lines for a plausible engine number
          if (!engineNumber) {
            let currentLength = 0;
            let vinEndLineIndex = i;
            for (let k = 0; k <= 8; k++) {
              if (lines[i + k]) {
                currentLength += lines[i + k].replace(/\s+/g, "").length;
                if (currentLength >= vinEndIndex) {
                  vinEndLineIndex = i + k;
                  break;
                }
              }
            }
            for (let k = vinEndLineIndex + 1; k < Math.min(lines.length, i + 9); k++) {
              if (lines[k]) {
                const possibleEngine = lines[k].replace(/[^A-Z0-9]/gi, "").trim().toUpperCase();
                if (isPlausibleEngineForBajaj(possibleEngine, rtoLocation, registrationNumber)) {
                  engineNumber = possibleEngine;
                  break;
                }
              }
            }
          }

          // If engine number not found, try to extract a plausible engine prefix from afterVin
          if (!engineNumber) {
            const afterVin = normalizedCombined.slice(vinEndIndex);
            let cutoffIndex = afterVin.length;
            const headerKeywords = ["FUEL", "VEHICLE", "IDV", "ELEC", "ACC", "NON", "TRAILER", "CNG", "LPG", "LNG", "TOTAL", "SUM", "INSURED"];
            for (const kw of headerKeywords) {
              const idx = afterVin.indexOf(kw);
              if (idx !== -1 && idx < cutoffIndex) {
                cutoffIndex = idx;
              }
            }
            const candidate = afterVin.slice(0, cutoffIndex);
            if (isPlausibleEngineForBajaj(candidate, rtoLocation, registrationNumber)) {
              engineNumber = candidate;
            }
          }



          // Parse digits preceding the VIN
          const vinIndexInCombined = normalizedCombined.indexOf(chassisNumber);
          const beforeVin = normalizedCombined.slice(0, vinIndexInCombined);
          const digitsBeforeVinMatch = beforeVin.match(/(\d+)$/);
          if (digitsBeforeVinMatch) {
            const digits = digitsBeforeVinMatch[1];
            const yearMatch = digits.match(/(19\d{2}|20\d{2})/);
            if (yearMatch) {
              manufacturingYear = yearMatch[1];
              const yearIndex = digits.indexOf(manufacturingYear);
              cubicCapacity = digits.slice(0, yearIndex);
              seatingCapacity = digits.slice(yearIndex + 4);
            }
          }
        }

        if (engineNumber && chassisNumber) {
          break;
        }
      }
    }
  }

  // Fallback to the original matching logic if layout-aware extraction failed
  if (!engineNumber || !chassisNumber) {
    const engineChassisMatch = text.match(
      /Engine NumberChassis Number[\s\S]*?\n\s*([A-Z0-9]+)\s*\n\s*([A-Z0-9]+)\s*\n\s*(?:\d)/i,
    );
    if (engineChassisMatch) {
      const combined = (engineChassisMatch[1] + engineChassisMatch[2]).replace(/\s+/g, "").toUpperCase();
      if (!chassisNumber) chassisNumber = combined.slice(-17);
      if (!engineNumber) engineNumber = combined.slice(0, -17);
    }
  }

  let fuelType = "";
  const fuelTypeMatch = text.match(/Fuel\s*Type\s*(?:Vehicle\s*IDV)?\s*(DIESEL|PETROL|CNG|LPG|ELECTRIC|EV|HYBRID)/i) ||
                        text.match(/(DIESEL|PETROL|CNG|LPG|ELECTRIC|EV|HYBRID)\s*\d/i);
  if (fuelTypeMatch) {
    fuelType = normalizeFuelType(fuelTypeMatch[1]);
  }

  if (!cubicCapacity || !manufacturingYear || !seatingCapacity) {
    const concatRowMatch = text.match(
      /(\d{3,4})\s*(Petrol|Diesel|CNG|Electric|EV|LPG|Hybrid)\s*(\d{4})\s*(\d{1,2})/i,
    );
    if (concatRowMatch) {
      if (!cubicCapacity) cubicCapacity = concatRowMatch[1];
      if (!fuelType) fuelType = normalizeFuelType(concatRowMatch[2]);
      if (!manufacturingYear) manufacturingYear = concatRowMatch[3];
      if (!seatingCapacity) seatingCapacity = concatRowMatch[4];
    } else {
      const valueMatch = text.replace(/\s+/g, "").match(/(-45|-[0-9]{2})(\d{3,4})(\d)(\d{4})/);
      if (valueMatch) {
        if (!cubicCapacity) cubicCapacity = valueMatch[2];
        if (!seatingCapacity) seatingCapacity = valueMatch[3];
        if (!manufacturingYear) manufacturingYear = valueMatch[4];
      }
    }
  }

  const idv = normalizeAmount(
    matchGroup(text, /Total\s*Sum\s*Insured[\s\S]{0,150}?\b(\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?)/i) ||
      matchGroup(text, /Vehicle\s*IDV[\s\S]{0,150}?\b(\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?)/i) ||
      matchGroup(text, /Total\s*Sum\s*Insured[\s\S]{0,150}?\b(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?)\b/i) ||
      matchGroup(text, /Vehicle\s*IDV[\s\S]{0,150}?\b(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?)\b/i) ||
      matchGroup(text, /Total\s*Sum\s*Insured[\s\S]{0,150}?\b(\d+)(?:\.\d{2})?\b/i) ||
      matchGroup(text, /Vehicle\s*IDV[\s\S]{0,150}?\b(\d+)(?:\.\d{2})?\b/i) ||
      matchGroup(text, /Total Value[\s\S]{0,100}?([0-9,]+(?:\.\d{2})?)/i) ||
      matchGroup(text, /Total IDV[\s\S]{0,100}?([0-9,]+(?:\.\d{2})?)/i),
  );

  const odPremium = normalizeAmount(
    matchGroup(text, /Total\s*Own\s*Damage\s*Premium\s*[:.-]?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Total OD Premium\s*-\s*A\s*([0-9,.]+)/i) ||
      matchGroup(text, /Own Damage Premium\s*([0-9,.]+)/i),
  );

  const netPremium = normalizeAmount(
    matchGroup(text, /Net\s*Premium\s*[:.-]?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Total Premium\s*\(Net Premium\)\s*\(A\+B\)\s*([0-9,.]+)/i) ||
      matchGroup(text, /Net Premium\s*\(A\+B\)\s*([0-9,.]+)/i),
  );

  const tpDriverOwner = normalizeAmount(
    matchGroup(text, /Total\s*Liability\s*Premium\s*[:.-]?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Total Act Premium\s*-\s*B\s*([0-9,.]+)/i)
  );

  const totalPremium = normalizeAmount(
    matchGroup(text, /Final Premium[\s\S]{0,150}?\b([0-9,]+\.\d{2})/i) ||
      matchGroup(text, /Total Amount\s*(?:Rs\.?)?\s*([0-9,.]+)/i),
  );

  const sgst = matchGroup(text, /State GST\s*\(\d+%\)\s*([0-9,.]+)/i);
  const cgst = matchGroup(text, /Central GST\s*\(\d+%\)\s*([0-9,.]+)/i);
  let gstAmount = "";
  if (sgst && cgst) {
    gstAmount = (parseFloat(sgst.replace(/,/g, "")) + parseFloat(cgst.replace(/,/g, ""))).toFixed(2);
  }

  const customerMobile = matchGroup(text, /Proposer Mobile Number\s*[:.-]?\s*([0-9*]+)/i);
  const customerEmail = matchGroup(
    text,
    /Proposer e-mail id\s*[:.-]?\s*([a-zA-Z0-9*._%+-]+@[a-zA-Z0-9*.-]+\.[a-zA-Z]{2,})/i,
  );

  const previousPolicyNumber =
    matchGroup(text, /Previous Policy Expiry Date[\s\S]{0,20}?Previous Policy No\s*:\s*([A-Z0-9]+)/i) ||
    matchGroup(text, /Previous Policy\s*No\s*(?:\n\s*No\s*)?[:.-]?\s*([A-Z0-9]+)/i);

  const previousInsurer = matchGroup(text, /Insurance Provider\s*:\s*([A-Za-z0-9 .,&-]+?)(?:\r?\n|$)/i);
  const nomineeName = matchGroup(
    text,
    /Nominee Details[\s\S]{0,100}?Name\s*:\s*([A-Za-z\s]+?)(?=\s*-|\s*Relationship|$)/i,
  )
    .replace(/\s+/g, " ")
    .trim();
  
  const financerName = cleanHdfcValue(
    matchGroup(text, /HYPOTHECATED\s+WITH\s*[:.-]?\s*([A-Z0-9/&()., -]{2,80})/i) ||
    matchGroup(text, /Financial\s+Institute\s+Name\s*\n?\s*1([^\n]+)/i) ||
    matchGroup(text, /Name\s+of\s+the\s+financial\s+institution[^:]*:\s*([^\n]+)/i)
  );

  // Client GSTIN is not present in policy PDFs; "Company GST No" is the insurer's GSTIN.
  const gstin = "";

  let ncbPercentage = matchGroup(text, /NCB\s*\(No\s*Claim\s*Bonus\)[\s\S]{0,200}?([0-9-]+)\s*%/i);
  if (ncbPercentage) {
    ncbPercentage = ncbPercentage.replace(/[^0-9]/g, "") + "%";
  }

  let policyType = "Private Car Package Policy";
  const extractedProduct = matchGroup(text, /Product\s*([A-Za-z\s]{3,50}?(?:Package|Liability|Standard|Bundled)?\s*Policy)/i);
  if (extractedProduct) {
    policyType = extractedProduct;
  } else if (/Commercial\s*Vehicle/i.test(text)) {
    policyType = "Commercial Vehicle Package Policy";
  }

  return {
    documentDetected: true,
    companyName: normalizeCompanyFromMaster(
      /Bajaj\s+General\s+Insurance\s+Limited/i.test(text)
        ? "Bajaj General Insurance Limited"
        : "Bajaj Allianz General Insurance Company Limited",
    ),
    policyNumber,
    insuredName,
    policyType,
    policyStartDate: startDate,
    policyEndDate: expiryDate,
    registrationNumber,
    vehicleMake: make,
    vehicleModel: model,
    makeModel,
    variant,
    engineNumber,
    chassisNumber,
    fuelType,
    cubicCapacity,
    manufacturingYear,
    seatingCapacity,
    idv,
    totalPremium,
    netPremium,
    odPremium,
    tpDriverOwner,
    gstAmount,
    rtoLocation,
    customerMobile,
    customerEmail,
    previousPolicyNumber,
    previousInsurer,
    nomineeName,
    gstin,
    ncbPercentage,
    financerName,
  };
}

// Start of extractBajajWarehouse (Lines 7114-7218)
function extractBajajWarehouse(text) {
  const isBajaj = /Bajaj\s+(?:General|Allianz)\s+Insurance/i.test(text) || /BAJAJ\s+GENERAL\s+INSURANCE/i.test(text);
  const isWarehouse = /\bWAREHOUSE\b|Business\s+of\s+Proposer\s*:\s*warehouse|Nature\s+of\s+Trade\s+or\s+Business\s*:\s*Storage/i.test(text);
  const hasWarehouseProduct = /FLEXI\s+COMMERCIAL\s+PROPERTY\s+GUARD|FIDELITY\s+GUARANTEE\s+INSURANCE\s+POLICY|BURGLARY\s+INSURANCE\s+POLICY/i.test(text);
  if (!isBajaj || !isWarehouse || !hasWarehouseProduct) return { documentDetected: false };

  const productName =
    cleanHdfcValue(matchGroup(text, /(FLEXI\s+COMMERCIAL\s+PROPERTY\s+GUARD)/i)) ||
    cleanHdfcValue(matchGroup(text, /(FIDELITY\s+GUARANTEE\s+INSURANCE\s+POLICY)/i)) ||
    cleanHdfcValue(matchGroup(text, /(BURGLARY\s+INSURANCE\s+POLICY)/i));

  let policyNumber =
    matchGroup(text, /Policy\s+Number\s*([A-Z0-9]{2}-\d{2}-\d{4}-\d{4}-\d{8})/i) ||
    matchGroup(text, /Policy\s+No\.?\s*([A-Z0-9]{2}-\d{2}-\d{4}-\d{4}-\d{8})/i) ||
    matchGroup(text, /\bPolicy\s+No\.?:\s*([A-Z0-9]{2}-\d{2}-\d{4}-\d{4}-\d{8})/i) ||
    matchGroup(text, /\b([A-Z0-9]{2}-\d{2}-\d{4}-\d{4}-\d{8})\b/i);

  if (policyNumber) {
    policyNumber = policyNumber.replace(/^(06|0G|O6|QG)-/i, "OG-");
  }

  const insuredName =
    cleanHdfcValue(matchGroup(text, /Insured(?:'s|’s)?\s+Name\s*([^\n]+?)(?=Email|Mobile|Insured\s+Address|Insured(?:'s|’s)?\s+Address|$)/i)) ||
    cleanHdfcValue(matchGroup(text, /Dear\s+([^,\n]+WAREHOUSE[^,\n]*),/i));

  const mailingAddress = cleanWarehouseBlock(
    matchGroup(text, /Insured(?:'s|’s)?\s+Address\s*([\s\S]+?)(?:Bank\s+Details|GSTIN|Place\s+of\s+Supply|Policy\s+Details)/i) ||
      matchGroup(text, /(?:Permanent\s+Address)?\s*Mailing\s+Address[\s\S]{0,220}?(PROP[\s\S]+?)\s*State/i) ||
      matchGroup(text, /Mailing\s+Address\s*([\s\S]+?)(?:Bank\s+Details|GSTIN|Place\s+of\s+Supply|Policy\s+Details)/i)
  );

  const riskLocation = cleanWarehouseBlock(
    matchGroup(text, /Address\s+of\s+the\s+premises\s+to\s+be\s+insured\s*:\s*([\s\S]+?)(?:3\.|4\.|What\s+materials)/i) ||
      matchGroup(text, /Location\s+of\s+risk\/business\s+to\s+be\s+covered[\s\S]+?\n1([\s\S]+?)\s*Storage\s+of/i) ||
      mailingAddress,
  );

  const dates = extractBajajWarehouseDates(text);

  let netPremium = "";
  let cgst = "";
  let sgst = "";
  let igst = "0.00";
  let premiumIncludingGst = "";

  const taxTablePattern = /Premium\s*\(Before\s*GST\)[\s\S]{0,150}?Total\s*Premium[\s\S]{0,100}?([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})/i;
  const taxTableMatch = text.match(taxTablePattern);
  if (taxTableMatch) {
    netPremium = normalizeAmount(taxTableMatch[1]);
    cgst = normalizeAmount(taxTableMatch[2]);
    sgst = normalizeAmount(taxTableMatch[3]);
    igst = normalizeAmount(taxTableMatch[4]);
    premiumIncludingGst = normalizeAmount(taxTableMatch[6]);
  } else {
    netPremium = normalizeAmount(
      matchGroup(text, /Total\s+Premium\s+\(Before\s+GST\)\s*[:\n]?\s*(?:Rs\.?)?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Net\s+Premium\s*[:\n]?\s*(?:Rs\.?)?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Net\s+Premium\s*([0-9,.]+)(?:\/-)?/i) ||
      matchGroup(text, /Total\s+Premium\s+\(Before\s+GST\)\s*([0-9,.]+)(?:\/-)?/i) ||
      matchGroup(text, /Gross\s+Premium\s*[:\n]?\s*Rs\.?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Base\s+Premium\s*([0-9,.]+)/i),
    );
    cgst = normalizeAmount(
      matchGroup(text, /Central\s+GST\s*\(\d+%\)\s*([0-9,.]+)/i) ||
      matchGroup(text, /Central\s+GST\s*\([^)]+\)\s*[:\n]?\s*([0-9,.]+)/i) ||
      matchGroup(text, /CGST\s*[:\n]?\s*(?:Rs\.?)?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Central\s+GST\s*\([^)]+\)\s*([0-9,.]+)(?:\/-)?/i)
    );
    sgst = normalizeAmount(
      matchGroup(text, /State\s+GST\s*\(\d+%\)\s*([0-9,.]+)/i) ||
      matchGroup(text, /State\s+GST\s*\([^)]+\)\s*[:\n]?\s*([0-9,.]+)/i) ||
      matchGroup(text, /SGST\s*[:\n]?\s*(?:Rs\.?)?\s*([0-9,.]+)/i) ||
      matchGroup(text, /State\s+GST\s*\([^)]+\)\s*([0-9,.]+)(?:\/-)?/i)
    );
    igst = normalizeAmount(
      matchGroup(text, /Integrated\s+GST\s*\([^)]+\)\s*[:\n]?\s*([0-9,.]+)/i) ||
      matchGroup(text, /IGST\s*[:\n]?\s*(?:Rs\.?)?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Integrated\s+GST\s*\([^)]+\)\s*([0-9,.]+)(?:\/-)?/i) ||
      "0.00"
    );
    premiumIncludingGst = normalizeAmount(
      matchGroup(text, /Total\s+Premium\s*\(INR\)\s*[:\n]?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Total\s+Amount\s*\(Rounded\s+Off\)\s*:\s*Rs\.?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Final\s+Premium\s*([0-9,.]+)(?:\/-)?/i) ||
      matchGroup(text, /Gross\s+Premium\s*([0-9,.]+)(?:\/-)?/i) ||
      matchGroup(text, /Total\s+Premium\s*([0-9,.]+)/i) ||
      matchGroup(text, /Total\s+Amount\s*Rs\.?\s*([0-9,.]+)/i) ||
      matchGroup(text, /Gross\s+Premium\s*Rupees\s+[A-Za-z\s]+\b([0-9,.]+)\s*Only/i) ||
      matchGroup(text, /Gross\s+Premium\s*([0-9,.]+)/i) ||
      matchGroup(text, /Total\s+Amount\s+([0-9,.]+)/i) ||
      matchGroup(text, /Total\s+Amount\s*:\s*([0-9,.]+)/i)
    );
  }
  if (premiumIncludingGst && (!netPremium || netPremium === "0.00")) {
    const totalVal = parseFloat(premiumIncludingGst.replace(/,/g, ""));
    if (!isNaN(totalVal) && totalVal > 0) {
      const calculatedNet = totalVal / 1.18;
      const calculatedGst = totalVal - calculatedNet;
      const halfGst = calculatedGst / 2;
      netPremium = calculatedNet.toFixed(2);
      cgst = halfGst.toFixed(2);
      sgst = halfGst.toFixed(2);
      igst = "0.00";
    }
  }
  const gstAmount = sumPlainAmounts(cgst, sgst, igst);

  const contentsSumInsured = normalizeAmount(
    matchGroup(text, /Total\s*([0-9][0-9,]+(?:\.00)?)\s*(?:E\.|18\.|N\. B|$)/i) ||
      matchGroup(text, /Location\s+1\s*([0-9][0-9,]+(?:\.00)?)/i),
  );
  const burglarySumInsured = /BURGLARY/i.test(productName)
    ? normalizeAmount(matchGroup(text, /Stocks\s*([0-9][0-9,]+(?:\.00)?)/i) || matchGroup(text, /Total\s*([0-9][0-9,]+(?:\.00)?)/i))
    : "";
  
  const fidelityMatch = text.match(/Per\s+Employee\s+Limit\s+Rs\s*([0-9,]+)(?:\s*(?:each|Each)?\.?\s*([0-9,.]+))?/i);
  const fidelitySumInsured = /FIDELITY/i.test(productName) && fidelityMatch
    ? normalizeAmount(fidelityMatch[2] || fidelityMatch[1])
    : "";
  const sumInsured = contentsSumInsured || burglarySumInsured || fidelitySumInsured;
  const coverages = [
    contentsSumInsured && { sectionName: "Fire / Property", sumInsured: contentsSumInsured },
    burglarySumInsured && { sectionName: "Burglary", sumInsured: burglarySumInsured },
    fidelitySumInsured && { sectionName: "Fidelity", sumInsured: fidelitySumInsured },
  ].filter(Boolean);

  const issueDateRaw =
    matchGroup(text, /Policy\s+Issued\s+on\s*([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})/i) ||
    matchGroup(text, /Policy\s+Issued\s+on\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i) ||
    matchGroup(text, /Receipt\s+Date\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i) ||
    matchGroup(text, /Date\s*:\s*([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})/i);
  const invoiceDate = normalizeWarehouseDate(issueDateRaw);

  const agencyMatch = text.match(/Agency\s*Code\s*(?:&|and)\s*Name\s*(?:\r?\n\s*)?([0-9a-zA-Z]+)\s*,\s*([^\n]+)/i);
  let brokerCode = "";
  let brokerName = "";
  if (agencyMatch) {
    brokerCode = agencyMatch[1].trim();
    brokerName = cleanHdfcValue(agencyMatch[2]);
  } else {
    const codeMatch = matchGroup(text, /Agency\s*Code\s*(?:[:.-]?\s*)?([A-Z0-9]+)/i);
    brokerCode = codeMatch.replace(/Channel.*/i, "").trim();
    brokerName = cleanHdfcValue(matchGroup(text, /Agency\s*Name\s*[:.-]?\s*([^\n|]+)/i)) || "INSUREDESK";
  }

  const clientNumber =
    matchGroup(text, /Customer\s*ID\s*[:.-]?\s*(\d+)/i) ||
    matchGroup(text, /Client\s*(?:Code|No|Number)\s*[:.-]?\s*(\d+)/i) ||
    matchGroup(text, /Proposer\s*Code\s*[:.-]?\s*(\d+)/i) ||
    matchGroup(text, /Premium\s+Payer\s+ID\s*[:.-]?\s*(\d+)/i) ||
    "";

  const tieUpCode =
    matchGroup(text, /Client\s+Tie\s*[-_]?\s*Up\s*(?:Code|No|Number)?\s*[:.-]?\s*([a-zA-Z0-9]+)/i) ||
    matchGroup(text, /Tie\s*[-_]?\s*Up\s*(?:Code|No|Number)?\s*[:.-]?\s*([a-zA-Z0-9]+)/i) ||
    "";

  return enrichBajajWarehouseTraining({
    documentDetected: true,
    productName,
    policyType: productName,
    policyNumber,
    insuredName,
    mailingAddress,
    riskLocation,
    businessDescription: /BURGLARY/i.test(productName) ? "Storage" : "Warehouse",
    occupancy: "Warehouse",
    startDate: dates.startDate,
    expiryDate: dates.expiryDate,
    netPremium,
    premiumIncludingGst,
    cgst,
    sgst,
    igst,
    gstAmount,
    invoiceNumber: policyNumber,
    invoiceDate,
    gstin: "", // Client GSTIN not in policy PDF; these patterns match the insurer's GSTIN
    hypothecationDetails: cleanHdfcValue(
      matchGroup(text, /Financial\s+Institute\s+Name\s*\n?\s*1([^\n]+)/i) ||
        matchGroup(text, /Name\s+of\s+the\s+financial\s+institution[^:]*:\s*([^\n]+)/i),
    ),
    brokerName,
    brokerCode,
    brokerMobile: "",
    clientNumber,
    tieUpCode,
    sumInsured,
    contentsSumInsured,
    burglarySumInsured,
    fidelitySumInsured,
    coverages,
  }, text);
}

// Start of getBajajWarehouseSubtypeCode (Lines 7220-7225)
function getBajajWarehouseSubtypeCode(productName = "") {
  if (/FLEXI\s+COMMERCIAL\s+PROPERTY\s+GUARD/i.test(productName)) return "WAREHOUSE_FIRE_POLICY";
  if (/BURGLARY\s+INSURANCE\s+POLICY/i.test(productName)) return "WAREHOUSE_BURGLARY_POLICY";
  if (/FIDELITY\s+GUARANTEE\s+INSURANCE\s+POLICY/i.test(productName)) return "WAREHOUSE_FIDELITY_POLICY";
  return "WAREHOUSE_POLICY";
}

// Start of normalizeBajajWarehouseProfileName (Lines 7227-7233)
function normalizeBajajWarehouseProfileName(value = "") {
  return cleanHdfcValue(
    String(value || "")
      .replace(/\bM\/S\b\.?/gi, "")
      .replace(/\s{2,}/g, " "),
  );
}

// Start of extractBajajProposalAddress (Lines 7235-7251)
function extractBajajProposalAddress(text = "", kind = "permanent") {
  const block =
    matchGroup(text, /(?:Permanent\s+Address)?\s*Mailing\s+Address([\s\S]+?)\d\.\s*Contact\s+person/i) ||
    matchGroup(text, /Mailing\s+Address([\s\S]+?)\d\.\s*Contact\s+person/i) ||
    matchGroup(text, /Permanent\s+AddressMailing\s+Address([\s\S]+?)1\.Contact\s+person/i);
  if (!block) return "";
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const useful = [];
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];
    line = line
      .replace(/^(?:House No\.\/|Building No\.\/|Flat No|House No|Building No|Flat No|No\.|Street|Locality|Landmark|State|City|Area|Pin code|District)\s*/i, "")
      .replace(/^[|:\s——]+/, "")
      .trim();
    if (line) {
      useful.push(line);
    }
  }
  const half = Math.ceil(useful.length / 2);
  const selected = kind === "mailing" ? useful.slice(half) : useful.slice(0, half);
  return cleanWarehouseBlock(selected.join(" "));
}

// Start of extractBajajRiskLocation (Lines 7253-7262)
function extractBajajRiskLocation(text = "") {
  return cleanWarehouseBlock(
    matchGroup(
      text,
      /Location\s+of\s+risk\/business\s+to\s+be\s+covered[\s\S]+?\n1([\s\S]+?)(?:\b[C6]\.?\s*Details\b|\bDetails\s+about\s+business\b)/i,
    ) ||
    matchGroup(
      text,
      /Location\s+of\s+risk\/business\s+to\s+be\s+covered[\s\S]+?\n1([\s\S]+?)(?:Storage\s+of\s+Non|CDetails|6\.Details)/i,
    ) ||
      matchGroup(text, /Location\s+DescriptionAddressItem\s+DescriptionItem\s+SIItem\s+Premium\s*Storage([\s\S]+?)stock\s+of/i) ||
      matchGroup(text, /Address\s*\n([\s\S]+?)\s*Construction/i),
  );
}

// Start of extractBajajOccupancy (Lines 7264-7270)
function extractBajajOccupancy(text = "") {
  return cleanWarehouseBlock(
    matchGroup(text, /(Storage\s+of\s+Non[\s\S]{0,220}?stored\s+therein\.?)/i)
      .replace(/Non-\s*/i, "Non-")
      .replace(/\s+,/g, ","),
  );
}

// Start of extractBajajAddressParts (Lines 7272-7284)
function extractBajajAddressParts(address = "") {
  const cleaned = cleanWarehouseBlock(address);
  const tehsilAndDistrict = cleaned.match(/\bTEHSIL\s+AND\s+DIST\s+([A-Z ]+?)(?:\s+MADHYA|\s+\d{6}|,|$)/i);
  
  let tehsil = "";
  let district = "";
  
  if (tehsilAndDistrict) {
    tehsil = cleanHdfcValue(tehsilAndDistrict[1]).toUpperCase();
    district = cleanHdfcValue(tehsilAndDistrict[1]).toUpperCase();
  } else {
    tehsil = matchGroup(cleaned, /\b(?:TEHSIL|TEH)\s+([A-Z]+)/i) || localExtractLocationPart(cleaned, "tehsil");
    district = matchGroup(cleaned, /\b(?:DISTRICT|DIST|DIS)\s+([A-Z]+)/i) || localExtractLocationPart(cleaned, "district");
  }

  let village = cleanHdfcValue(
    matchGroup(cleaned, /\b(?:VILLAGE|GRAM|VILL|VIL|GRM)\s+((?!House|Building|No|Street|State|City|Pincode|Area|Tehsil|District|Road|Flat|Post|PO\b)[A-Z0-9-]+(?:\s+(?!House|Building|No|Street|State|City|Pincode|Area|Tehsil|District|Road|Flat|Post|PO\b)[A-Z0-9-]+)?)/i)
  ).toUpperCase();
  
  if (!village) {
    const beforeTehsil = cleaned.match(/(?:PROP\.?\s+[A-Z. ]+?,\s*)?([A-Z0-9\s-]+?)(?:\s*,\s*|\s+)TEHSIL/i);
    if (beforeTehsil) {
      const candidate = beforeTehsil[1].trim();
      if (candidate && candidate.length < 30 && !/ROAD|STREET|PUMP/i.test(candidate)) {
        village = candidate.toUpperCase();
      }
    }
  }

  if (!village) {
    const fallbackVillage = matchGroup(cleaned, /MADHYA\s+PRADESH,\s*([A-Z]+),/i);
    if (fallbackVillage && fallbackVillage.toUpperCase() !== tehsil.toUpperCase() && fallbackVillage.toUpperCase() !== district.toUpperCase() && !/ROAD|STREET|PUMP|NO|BUILDING/i.test(fallbackVillage)) {
      village = fallbackVillage.toUpperCase();
    }
  }

  const finalTehsil = dedupeBajajPlace(tehsil);
  const finalDistrict = dedupeBajajPlace(district);
  let finalVillage = village.replace(/\s+/g, " ").trim();
  if (!finalVillage) {
    finalVillage = finalTehsil;
  }

  return {
    village: finalVillage,
    tehsil: finalTehsil,
    district: finalDistrict,
    state: /MADHYA\s+PRADESH|\bMP\b/i.test(cleaned) ? "MADHYA PRADESH" : "",
    pincode: matchGroup(cleaned, /\b(\d{6})(?!\d)/),
  };
}

// Start of dedupeBajajPlace (Lines 7286-7294)
function dedupeBajajPlace(value = "") {
  const words = cleanHdfcValue(value)
    .toUpperCase()
    .replace(/\bDISTRICT\b/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1 && words.every((word) => word === words[0])) return words[0];
  return words.join(" ");
}

// Start of extractBajajFinancialInstitutions (Lines 7296-7323)
function extractBajajFinancialInstitutions(text = "", fallback = "") {
  const sources = [
    matchGroup(text, /Financial\s+Institute\s+Name\s*([\s\S]+?)\s*\b3\b\.?\s*Period/i),
    matchGroup(text, /Sr\.\s*No\.Financial\s+Institute\s+Name\s*([\s\S]+?)\s*3\.Period/i),
    matchGroup(text, /Bank\s+Details\s*:\s*([\s\S]+?)(?:GSTIN|Company\s+GST|Mobile\s+No|CoverNote)/i),
    fallback,
  ].filter(Boolean);

  const items = [];
  for (const src of sources) {
    const cleanedSrc = cleanWarehouseBlock(src);
    if (!cleanedSrc || /No Details/i.test(cleanedSrc)) continue;
    
    const parts = cleanedSrc.split(/,\s*|\bAND\b|;/i);
    for (const part of parts) {
      const cleaned = cleanHdfcValue(
        part
          .replace(/\bHYPO\.?/gi, "")
          .replace(/^\d+\)/g, "")
          .replace(/^\d+\)+/g, "")
          .replace(/^\d+(?=[A-Z])/g, "")
          .replace(/^\)+/, "")
          .replace(/BRANCH:.*/i, "")
          .replace(/\s*ID-\s*BI/i, "IDBI")
          .replace(/IN-\s*DIA/i, "INDIA")
      );
      
      const half = Math.floor(cleaned.length / 2);
      const finalPart = half > 8 && cleaned.slice(0, half).trim() === cleaned.slice(half).trim() 
        ? cleaned.slice(0, half).trim() 
        : cleaned;
        
      if (finalPart && (/BANK|FINANCE|INSTITUTION|SBI|MPWLC/i.test(finalPart) || finalPart.length > 8)) {
        if (!items.includes(finalPart)) {
          items.push(finalPart);
        }
      }
    }
  }
  
  return items.filter((item, idx) => {
    const isSub = items.some((other, oIdx) => oIdx !== idx && other.includes(item));
    return !isSub;
  });
}

// Start of extractBajajLineAmount (Lines 7325-7328)
function extractBajajLineAmount(text = "", label = "") {
  const escaped = escapeRegExp(label);
  return normalizeAmount(
    matchGroup(text, new RegExp(`(?:^|\\n|\\s)${escaped}\\s*([0-9][0-9,.]*(?:\\.\\d{2})?)`, "i")) ||
    matchGroup(text, new RegExp(`${escaped}\\s*([0-9][0-9,.]*)`, "i"))
  );
}

// Start of extractBajajBuildingAmount (Lines 7330-7337)
function extractBajajBuildingAmount(text = "") {
  return normalizeAmount(
    matchGroup(text, /Building\s*(?:including|Including)[\s\S]{0,100}?(?:plinth|Plinth)[^0-9]*([0-9][0-9,]*(?:\.\d{2})?)/i) ||
    matchGroup(text, /Building\s+Including\s+Plinth\s*&\s*Foundation[\s\S]{0,240}?([0-9][0-9,]*(?:\.\d{2})?)/i) ||
    matchGroup(text, /Building\s*(?:including|Including)[^0-9]*([0-9][0-9,]*(?:\.\d{2})?)/i)
  );
}

// Start of extractBajajPropertySums (Lines 7339-7352)
function extractBajajPropertySums(text = "") {
  const tableStartMatch = 
    String(text || "").match(/ItemItem\s+DescriptionSum\s+Insured\s+\(INR\)/i) ||
    String(text || "").match(/Description\s+of\s+BlockSum\s+Insured/i) ||
    String(text || "").match(/Description\s+of\s+Block[\s\S]{0,30}Sum\s+Insured/i) ||
    String(text || "").match(/Item\s+Description\s+Sum\s+Insured/i);

  let tableBlock = text;
  if (tableStartMatch) {
    const startIndex = tableStartMatch.index + tableStartMatch[0].length;
    const nextSectionMatch = text.slice(startIndex).match(/Total\s*[0-9]|Floater\s+Cover|E\.\s+Details|F\.\s+Additional|G\.\s+Premium/i);
    if (nextSectionMatch) {
      tableBlock = text.slice(startIndex, startIndex + nextSectionMatch.index + 20);
    } else {
      tableBlock = text.slice(startIndex);
    }
  }

  const buildingSumInsured = extractBajajBuildingAmount(tableBlock);
  const stockSumInsured = extractBajajLineAmount(tableBlock, "Stocks") || extractBajajLineAmount(tableBlock, "Stock");
  const plantMachinerySumInsured = extractBajajLineAmount(tableBlock, "Plant and Machinery") || extractBajajLineAmount(tableBlock, "Plant & Machinery");
  const furnitureFixturesSumInsured = extractBajajLineAmount(tableBlock, "Furniture, Fitting and Fixtures") || extractBajajLineAmount(tableBlock, "Furniture & Fixtures, Fittings");
  const stockInProcessSumInsured = extractBajajLineAmount(tableBlock, "Stock in Process");
  const electricalInstallationSumInsured = extractBajajLineAmount(tableBlock, "Electrical Installations") || extractBajajLineAmount(tableBlock, "Electrical Installation");
  const otherContentsSumInsured = extractBajajLineAmount(tableBlock, "Contents") || extractBajajLineAmount(tableBlock, "Other Contents");

  const totalSumInsured =
    normalizeAmount(matchGroup(text, /Total\s+Sum\s+(?:Insured|lnsured)\s*\(INR\)\s*([0-9][0-9,.]*)/i)) ||
    normalizeAmount(matchGroup(text, /Total\s+Sum\s+(?:Insured|lnsured)\s*\(Rs\.?\)\s*([0-9][0-9,.]*)/i)) ||
    normalizeAmount(matchGroup(text, /Total\s+Sum\s+(?:Insured|lnsured)[^0-9]*([0-9][0-9,.]*)/i)) ||
    normalizeAmount(matchGroup(tableBlock, /Total\s*([0-9][0-9,.]*)/i)) ||
    normalizeAmount(matchGroup(text, /Total\s*([0-9][0-9,.]*)/i));

  return {
    buildingSumInsured,
    plantMachinerySumInsured,
    furnitureFixturesSumInsured,
    stockSumInsured,
    stockInProcessSumInsured,
    electricalInstallationSumInsured,
    otherContentsSumInsured,
    totalSumInsured
  };
}

// Start of extractBajajAddonDetails (Lines 7354-7367)
function extractBajajAddonDetails(text = "") {
  const addons = [];
  const pattern = /^\s*\d+\s*([A-Za-z][A-Za-z /&-]+?)\s*([0-9][0-9,.]+\.00)\s*$/gim;
  let match;
  while ((match = pattern.exec(text))) {
    const addon = cleanHdfcValue(match[1]);
    if (/Location|Employee|Building|Stocks|Total/i.test(addon)) continue;
    const item = { addon, sumInsured: normalizeAmount(match[2]) };
    if (!addons.some((existing) => existing.addon === item.addon && existing.sumInsured === item.sumInsured)) {
      addons.push(item);
    }
  }
  return addons;
}

// Start of extractBajajFidelityDetails (Lines 7369-7380)
function extractBajajFidelityDetails(text = "", fidelitySumInsured = "") {
  const employeeLine = matchGroup(text, /DescriptionSum\s+Insured\s+\(Rs\)\s*([^\n]+)/i) || matchGroup(text, /Description\s+Sum\s+Insured\s+\(Rs\)\s*([^\n]+)/i);
  const employeeCount = matchGroup(employeeLine, /(\d+)\s+on\s+roll\s+Employees/i) || matchGroup(employeeLine, /(\d+)\s+Employees/i) || matchGroup(text, /(\d+)\s+on\s+roll\s+Employees/i);
  const perEmployeeLimit = normalizeAmount(matchGroup(employeeLine, /Per\s+Employee\s+Limit\s+Rs\s*([0-9]+)(?=\.)/i) || matchGroup(text, /Per\s+Employee\s+Limit\s+Rs\s*([0-9,.]+)/i));
  return {
    employeeCount,
    employeeCategory: /Unnamed|on\s+roll/i.test(employeeLine || text) ? "On roll Employees" : "",
    perEmployeeLimit,
    employeeSumInsured: fidelitySumInsured,
    aggregateSumInsured: fidelitySumInsured,
  };
}

// Start of buildBajajCoverageDetails (Lines 7382-7403)
function buildBajajCoverageDetails(data = {}) {
  if (/FLEXI/i.test(data.productName || "")) {
    return [
      data.buildingSumInsured && { coverage: "Building", status: "Covered", sumInsured: data.buildingSumInsured },
      data.stockSumInsured && data.stockSumInsured !== "0.00" && { coverage: "Stocks", status: "Covered", sumInsured: data.stockSumInsured },
      ...(data.addonDetails || []).map((addon) => ({ coverage: addon.addon, status: "Covered", sumInsured: addon.sumInsured })),
    ].filter(Boolean);
  }
  if (/BURGLARY/i.test(data.productName || "")) {
    return [
      { coverage: "Burglary", status: "Covered", sumInsured: data.burglarySumInsured || data.sumInsured },
      { coverage: "Stocks", status: "Covered", sumInsured: data.stockSumInsured || data.burglarySumInsured || data.sumInsured },
    ].filter(Boolean);
  }
  if (/FIDELITY/i.test(data.productName || "")) {
    return [
      { coverage: "Fidelity Guarantee", status: "Covered", sumInsured: data.fidelitySumInsured || data.sumInsured },
      data.perEmployeeLimit && { coverage: "Per Employee Limit", status: "Covered", sumInsured: data.perEmployeeLimit },
    ].filter(Boolean);
  }
  return data.coverages || [];
}

// Start of buildBajajFieldEvidence (Lines 7405-7418)
function buildBajajFieldEvidence(text = "", data = {}) {
  return {
    insuranceCompany: findIffcoEvidence(text, "Bajaj", /Bajaj\s+(?:General|Allianz)[^\n]*/i),
    productName: findIffcoEvidence(text, data.productName),
    policyNumber: findIffcoEvidence(text, data.policyNumber, /Policy\s+(?:Number|No)[^\n]*/i),
    insuredName: findIffcoEvidence(text, data.insuredName, /Insured\s+Name[^\n]*/i),
    riskLocation: findIffcoEvidence(text, data.riskLocation, /Location\s+of\s+risk[\s\S]{0,260}|Location\s+DescriptionAddress[\s\S]{0,260}/i),
    occupancy: findIffcoEvidence(text, data.occupancy, /Storage\s+of\s+Non[\s\S]{0,180}/i),
    sumInsured: findIffcoEvidence(text, data.sumInsured, /Total\s+Sum\s+Insured[^\n]*/i),
    netPremium: findIffcoEvidence(text, data.netPremium, /Net\s+Premium[^\n]*/i),
    totalPremium: findIffcoEvidence(text, data.premiumIncludingGst, /Final\s+Premium[^\n]*|Gross\s+Premium[^\n]*/i),
    financialInstitutions: findIffcoEvidence(text, data.financialInstitutions?.[0] || data.hypothecationDetails, /Financial\s+Institute[\s\S]{0,160}|Bank\s+Details[\s\S]{0,220}/i),
  };
}

// Start of buildBajajFieldConfidence (Lines 7420-7430)
function buildBajajFieldConfidence(data = {}) {
  const confidence = {};
  ["productName", "policyNumber", "insuredName", "riskLocation", "sumInsured", "netPremium", "premiumIncludingGst"].forEach((field) => {
    confidence[field] = data[field] ? 0.95 : 0.6;
  });
  confidence.occupancy = data.occupancy ? 0.9 : 0.6;
  confidence.financialInstitutions = data.financialInstitutions?.length ? 0.9 : 0.6;
  confidence.addressEntity = data.addressEntity?.pincode ? 0.85 : 0.6;
  confidence.coverageDetails = data.coverageDetails?.length ? 0.9 : 0.6;
  return confidence;
}

// Start of enrichBajajWarehouseTraining (Lines 7432-7522)
function enrichBajajWarehouseTraining(data = {}, text = "") {
  const policySubType = getBajajWarehouseSubtypeCode(data.productName);
  const strictPolicyNumber = data.policyNumber || matchGroup(text, /\b(OG-\d{2}-\d{4}-\d{4}-\d{8})\b/i);
  const permanentAddress = cleanWarehouseBlock(extractBajajProposalAddress(text, "permanent") || data.mailingAddress).replace(/\s*Policy Issued on.*$/i, "");
  const mailingAddress = cleanWarehouseBlock(extractBajajProposalAddress(text, "mailing") || data.mailingAddress).replace(/\s*Policy Issued on.*$/i, "");
  const riskLocation = extractBajajRiskLocation(text) || data.riskLocation || mailingAddress;
  const addressParts = extractBajajAddressParts(riskLocation || mailingAddress);
  const occupancy = extractBajajOccupancy(text) || (/FIDELITY/i.test(data.productName) ? "Warehouse" : data.occupancy || "Warehouse");
  const financialInstitutions = extractBajajFinancialInstitutions(text, data.hypothecationDetails);
  const propertySums = extractBajajPropertySums(text);
  const fidelityDetails = extractBajajFidelityDetails(text, data.fidelitySumInsured || data.sumInsured);
  const firePolicyReference = matchGroup(text, /Fire\s+Policy\s+No\.?\s*([A-Z0-9-]+)/i);
  
  const totalSumInsured = propertySums.totalSumInsured || data.sumInsured || data.burglarySumInsured || data.fidelitySumInsured;

  const enriched = {
    ...data,
    policyNumber: strictPolicyNumber,
    policySubType,
    warehousePolicySubType: policySubType,
    warehouseProfileName: normalizeBajajWarehouseProfileName(data.insuredName),
    permanentAddress,
    mailingAddress,
    riskLocation,
    occupancy,
    village: addressParts.village,
    tehsil: addressParts.tehsil,
    district: addressParts.district || data.district,
    state: addressParts.state,
    pincode: addressParts.pincode,
    businessType: /warehouse/i.test(text) ? "Warehouse" : "",
    warehouseType: "Warehouse",
    financialInstitutions,
    bankEntity: financialInstitutions.map((name) => ({ bankName: name })),
    hypothecationDetails: data.hypothecationDetails || financialInstitutions.join(", "),
    constructionType: cleanHdfcValue(matchGroup(text, /Construction\s*([A-Z]+)/i)),
    ageOfBuilding: cleanHdfcValue(matchGroup(text, /OccupancyAge\s+of\s+UnitFloor\*[\s\S]+?(Lessthan\s+\d+Years?)/i)),
    floor: cleanHdfcValue(matchGroup(text, /(Ground\s+Floor)/i)),
    ...propertySums,
    addonDetails: extractBajajAddonDetails(text),
    ...fidelityDetails,
    firePolicyReference,
    sumInsured: totalSumInsured,
    stockSumInsured: propertySums.stockSumInsured !== "" ? propertySums.stockSumInsured : data.burglarySumInsured || data.contentsSumInsured || "",
    buildingSumInsured: propertySums.buildingSumInsured || "",
    securitySystems: matchGroup(text, /Security\s+Systems?\s*:?\s*([^\n]+)/i),
    alarmSystems: matchGroup(text, /Alarm\s+Systems?\s*:?\s*([^\n]+)/i),
    extractionTrainingVersion: "BAJAJ_WAREHOUSE_TRAINING_V1",
  };

  enriched.addressEntity = {
    permanentAddress: enriched.permanentAddress,
    mailingAddress: enriched.mailingAddress,
    riskLocation: enriched.riskLocation,
    village: enriched.village,
    tehsil: enriched.tehsil,
    district: enriched.district,
    state: enriched.state,
    pincode: enriched.pincode,
  };
  enriched.riskEntity = {
    occupancy: enriched.occupancy,
    businessType: enriched.businessType,
    warehouseType: enriched.warehouseType,
    storageType: /food\s+grain|wheat|pulses|stock/i.test(text) ? "Food Grain Storage" : "Warehouse Storage",
    riskDescription: enriched.riskLocation,
  };
  enriched.premiumEntity = {
    netPremium: enriched.netPremium,
    cgst: enriched.cgst,
    sgst: enriched.sgst,
    igst: enriched.igst,
    gstAmount: enriched.gstAmount,
    totalPremium: enriched.premiumIncludingGst,
  };
  enriched.coverageDetails = buildBajajCoverageDetails(enriched);
  enriched.coverageEntity = enriched.coverageDetails;
  enriched.coverages = enriched.coverageDetails.map((c) => ({
    sectionName: c.coverage,
    sumInsured: c.sumInsured,
  }));
  enriched.warehouseProfile = {
    warehouseName: enriched.warehouseProfileName,
    insuredName: enriched.insuredName,
    riskLocation: enriched.riskLocation,
    district: enriched.district,
    tehsil: enriched.tehsil,
    occupancy: enriched.occupancy,
    financer: enriched.financialInstitutions.join(", "),
    policySubType,
    policyNumber: enriched.policyNumber,
  };
  enriched.fieldEvidence = buildBajajFieldEvidence(text, enriched);
  enriched.fieldConfidence = buildBajajFieldConfidence(enriched);
  if (policySubType !== "WAREHOUSE_FIDELITY_POLICY") {
    enriched.employeeCount = "";
    enriched.employeeSumInsured = "";
    enriched.employeeCategory = "";
    enriched.perEmployeeLimit = "";
  }
  if (policySubType === "WAREHOUSE_FIDELITY_POLICY") {
    enriched.financialInstitutions = [];
    enriched.bankEntity = [];
    enriched.hypothecationDetails = "";
  }
  enriched.tieUpCode = "";

  const required = ["policyNumber", "insuredName", "riskLocation", "startDate", "expiryDate", "sumInsured", "netPremium", "premiumIncludingGst"];
  enriched.needsManualReview = required.some((field) => !String(enriched[field] || "").trim());
  enriched.extractionConfidence = enriched.needsManualReview ? 0.78 : 0.93;
  return enriched;
}

// Start of extractBajajWarehouseDates (Lines 7532-7541)
function extractBajajWarehouseDates(text) {
  const direct =
    text.match(/Period\s+of\s+Insurance:\s*From\s*([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})\s+To\s+([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})/i) ||
    text.match(/From\s+[0-9:]+\s+([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})\s+To\s+([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})/i) ||
    text.match(/Policy\s+period\s+sought\s+from:\s*([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})\s+To:\s*([0-9]{1,2}-[A-Z]{3}-[0-9]{2,4})/i);
  return {
    startDate: normalizeWarehouseDate(direct?.[1] || ""),
    expiryDate: normalizeWarehouseDate(direct?.[2] || ""),
  };
}

module.exports = {
  isBajajIssuerDocument,
  isBajajAllianzMotor,
  normalizeBajajDate,
  extractBajajMakeModel,
  extractBajajAllianzMotor,
  extractBajajWarehouse,
  getBajajWarehouseSubtypeCode,
  normalizeBajajWarehouseProfileName,
  extractBajajProposalAddress,
  extractBajajRiskLocation,
  extractBajajOccupancy,
  extractBajajAddressParts,
  dedupeBajajPlace,
  extractBajajFinancialInstitutions,
  extractBajajLineAmount,
  extractBajajBuildingAmount,
  extractBajajPropertySums,
  extractBajajAddonDetails,
  extractBajajFidelityDetails,
  buildBajajCoverageDetails,
  buildBajajFieldEvidence,
  buildBajajFieldConfidence,
  enrichBajajWarehouseTraining,
  extractBajajWarehouseDates
};
