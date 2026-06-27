const { isPlausibleEngineNumber } = require("../src/lib/policies/pdf/utils/motor.cjs");

function isPlausibleEngineForBajaj(value = "", rto = "", regNo = "") {
  const cleaned = String(value || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (!isPlausibleEngineNumber(cleaned)) return false;
  if (/(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TG|TN|TR|TS|UA|UK|UP|UT|WB)\d{2}/i.test(cleaned)) {
    if (/^(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MH|ML|MN|MP|MZ|NL|OD|OR|PB|PY|RJ|SK|TG|TN|TR|TS|UA|UK|UP|UT|WB)\d{2}$/i.test(cleaned)) {
      return false;
    }
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

function extractEngineFromText(normalizedCombined, vinStartIndex, rtoLocation, regNo) {
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
        const subEngine = extractSubEngine(part, rtoLocation, regNo);
        if (subEngine) {
          return subEngine;
        }
      }
    }
  }
  return "";
}

console.log("Shreenath Engine Extracted:", extractEngineFromText(
  "MP39C3588MP39RAJGARHK10BN5050389MA3EWDE1S00E76759MARUTIWAGONRSUBTYPEYEAROFMFGNCBCCSEATINGCAPACITYSTINGRAYVXIAMT2018509985NAMEOFREGISTRATIONAUTHORITYMP39RAJGARHNAMEANDADDRESSOFINSUREDSHREENATHDASTANK465691NARAJGARHMADHYAPRADESH465691",
  32,
  "MP39-RAJGARH",
  "MP39C3588"
));

console.log("Primeone Engine Extracted:", extractEngineFromText(
  "MP04CX2778MP04BHOPALG3LCKM808840MALFC81AVKM021034HYUNDAIVENUESUBTYPEYEAROFMFGNCBCCSEATINGCAPACITY10KAPPATURBOGDIPETROLDCTSXPLUS2019509985NAMEOFREGISTRATIONAUTHORITYMP04BHOPALNAMEANDADDRESSOFINSUREDPRIMEONEWORKFORCEPVTLTD",
  32,
  "MP04-BHOPAL",
  "MP04CX2778"
));
