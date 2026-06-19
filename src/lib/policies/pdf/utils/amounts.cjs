

// Start of normalizeAmount (Lines 3758-3763)
function normalizeAmount(value) {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, "");
  if (!cleaned.includes(".")) return `${cleaned}.00`;
  return cleaned.replace(/\.(\d)$/, ".$10");
}

// Start of sumAmounts (Lines 3765-3774)
function sumAmounts(...values) {
  const nums = values
    .map((value) => Number(String(value || "").replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
  if (!nums.length) return "";

  return nums
    .reduce((total, value) => total + value, 0)
    .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Start of diffAmounts (Lines 3776-3782)
function diffAmounts(first, second) {
  const a = Number(String(first || "").replace(/,/g, ""));
  const b = Number(String(second || "").replace(/,/g, ""));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";

  return (a - b).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Start of extractIffcoPremiumFromBlock (Lines 4665-4691)
function extractIffcoPremiumFromBlock(block) {
  if (!block) return "";
  // remove non-numeric except dots and commas
  const candidate = block.replace(/[^0-9.,]/g, "");
  // split on sequences of zeros or repeated runs to try capture decimal groups
  const numbers = candidate.match(/[0-9,]+\.[0-9]{2}/g) || [];
  if (!numbers.length) {
    // fallback: find sequences of digits and infer last two as cents
    const digits = candidate.replace(/,/g, "");
    const groups = digits.match(/[0-9]{3,}/g) || [];
    if (!groups.length) return "";
    // try to recover last group as xxx.yy by taking last 3-6 chars
    const last = groups[groups.length - 1];
    if (last.length > 2) {
      const dollars = last.slice(0, -2);
      const cents = last.slice(-2);
      return normalizeAmount(`${dollars}.${cents}`);
    }
    return "";
  }

  // prefer the last number which is not .00
  for (let i = numbers.length - 1; i >= 0; i--) {
    if (!numbers[i].endsWith(".00")) return normalizeAmount(numbers[i]);
  }
  return normalizeAmount(numbers[numbers.length - 1]);
}

// Start of sumPlainAmounts (Lines 7683-7689)
function sumPlainAmounts(...values) {
  const total = values.reduce((sum, value) => {
    const number = Number(String(value || "").replace(/,/g, ""));
    return Number.isFinite(number) ? sum + number : sum;
  }, 0);
  return total ? total.toFixed(2) : "";
}

// Start of parseDenseGst (Lines 7691-7713)
function parseDenseGst(str) {
  const firstDigitIndex = str.search(/\d/);
  if (firstDigitIndex === -1) return null;
  const clean = str.slice(firstDigitIndex).replace(/,/g, "");
  const parts = clean.split(".");
  if (parts.length < 5) return null;
  
  const val0_int = parts[0];
  const val0_dec = parts[1].slice(0, 2);
  const val1_int = parts[1].slice(2);
  const val1_dec = parts[2].slice(0, 2);
  const val2_int = parts[2].slice(2);
  const val2_dec = parts[3].slice(0, 2);
  const val3_int = parts[3].slice(2);
  const val3_dec = parts[4].slice(0, 2);
  
  return {
    cgst: parseFloat(`${val0_int}.${val0_dec}`).toFixed(2),
    sgst: parseFloat(`${val1_int}.${val1_dec}`).toFixed(2),
    igst: parseFloat(`${val2_int}.${val2_dec}`).toFixed(2),
    cess: parseFloat(`${val3_int}.${val3_dec}`).toFixed(2)
  };
}

// Start of parseDenseAmounts (Lines 7715-7740)
function parseDenseAmounts(str) {
  const firstDigitIndex = str.search(/\d/);
  if (firstDigitIndex === -1) return null;
  const clean = str.slice(firstDigitIndex).replace(/,/g, "");
  const parts = clean.split(".");
  if (parts.length < 6) return null;
  
  const val0_int = parts[0];
  const val0_dec = parts[1].slice(0, 2);
  const val1_int = parts[1].slice(2);
  const val1_dec = parts[2].slice(0, 2);
  const val2_int = parts[2].slice(2);
  const val2_dec = parts[3].slice(0, 2);
  const val3_int = parts[3].slice(2);
  const val3_dec = parts[4].slice(0, 2);
  const val4_int = parts[4].slice(2);
  const val4_dec = parts[5].slice(0, 2);
  
  return {
    taxableValue: parseFloat(`${val0_int}.${val0_dec}`).toFixed(2),
    cgst: parseFloat(`${val1_int}.${val1_dec}`).toFixed(2),
    sgst: parseFloat(`${val2_int}.${val2_dec}`).toFixed(2),
    igst: parseFloat(`${val3_int}.${val3_dec}`).toFixed(2),
    cess: parseFloat(`${val4_int}.${val4_dec}`).toFixed(2)
  };
}

module.exports = {
  normalizeAmount,
  sumAmounts,
  diffAmounts,
  extractIffcoPremiumFromBlock,
  sumPlainAmounts,
  parseDenseGst,
  parseDenseAmounts
};
