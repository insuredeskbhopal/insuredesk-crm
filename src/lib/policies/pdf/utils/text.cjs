

function matchGroup(text, pattern, groupIndex = 1) {
  const match = text.match(pattern);
  return match?.[groupIndex]?.replace(/\s+/g, " ").trim() || "";
}

// Start of cleanWarehouseAddress (Lines 2302-2314)
function cleanWarehouseAddress(value) {
  return cleanHdfcValue(
    String(value || "")
      .replace(/--\./g, ", ")
      .replace(/--/g, ", ")
      .replace(/\s+\.\s*/g, ", ")
      .replace(/\s*,\s*,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/,\s*DATIA,\s*MADHYA PRADESH\s*-\s*475335$/i, "")
      .replace(/,\s*MADHYA PRADESH,\s*DATIA,\s*475335$/i, "")
      .replace(/\s*,\s*$/g, ""),
  );
}

// Start of cleanWarehouseDescription (Lines 2316-2322)
function cleanWarehouseDescription(value) {
  const text = cleanHdfcValue(String(value || "").replace(/\s+/g, " "));
  if (/Storage of Non-hazardous goods/i.test(text) && /Storage in godown or warehouse/i.test(text)) {
    return "Storage of Non-hazardous goods / godown or warehouse";
  }
  return cleanHdfcValue(text.replace(/\s+-\s+/g, " / "));
}

// Start of sliceText (Lines 3008-3014)
function sliceText(text, startPattern, endPattern) {
  const start = text.search(startPattern);
  if (start === -1) return "";
  const rest = text.slice(start);
  const end = rest.search(endPattern);
  return end === -1 ? rest : rest.slice(0, end);
}

// Start of cleanHdfcValue (Lines 3277-3284)
function cleanHdfcValue(value) {
  return String(value || "")
    .replace(/\r/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*(?:\||;)+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Start of cleanInsuredName (Lines 3286-3292)
function cleanInsuredName(value) {
  return String(value || "")
    .replace(/\bUnique\s+Invoice\s+No\b.*$/i, "")
    .replace(/\bUnique\b\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Start of cleanText (Lines 3294-3302)
function cleanText(text) {
  return text
    .replace(/\r/g, " ")
    .replace(/\u0000/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

// Start of cleanMakeModel (Lines 3304-3319)
function cleanMakeModel(text) {
  const patterns = [
    /(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA|FORCE)\s+[A-Z0-9][A-Z0-9 /.,-]{2,60}/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      return match[0]
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s*(?:Registration|Chassis|Engine|Seating|Vehicle|Side Car|Accessories).*$/i, "")
        .trim();
    }
  }
  return "";
}

// Start of cleanMotorTableMakeModel (Lines 3321-3330)
function cleanMotorTableMakeModel(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\b(?:NULL|NA|N\/A)\b/gi, "")
    .replace(
      /\s*(?:Registration|Chassis|Engine|Seating|Capacity|Premium|VehicleSide|Insured Declared Values).*$/i,
      "",
    )
    .trim();
}

// Start of deriveGroupName (Lines 3892-3901)
function deriveGroupName(text, sourceFile, insuredName, pptMpwlc) {
  if (pptMpwlc) return pptMpwlc;

  const filenameGroup = matchGroup(sourceFile, /\b([A-Z]{3,})\b/i);
  if (filenameGroup && ["PDF", "POLICY"].indexOf(filenameGroup.toUpperCase()) === -1) {
    return filenameGroup.toUpperCase();
  }

  return matchGroup(insuredName || text, /\b([A-Z]{3,})\b/i);
}

// Start of cleanWarehouseBlock (Lines 7524-7530)
function cleanWarehouseBlock(value = "") {
  return cleanHdfcValue(
    String(value || "")
      .replace(/\s*\n\s*/g, " ")
      .replace(/\s{2,}/g, " "),
  );
}

module.exports = {
  cleanWarehouseAddress,
  cleanWarehouseDescription,
  sliceText,
  cleanHdfcValue,
  cleanInsuredName,
  cleanText,
  cleanMakeModel,
  cleanMotorTableMakeModel,
  deriveGroupName,
  cleanWarehouseBlock
};
