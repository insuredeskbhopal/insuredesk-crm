const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const backupPath = path.resolve('storage/BH1.backup.xlsx');
const targetPath = path.resolve('storage/BH1.xlsx');

const monthMap = {
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12
};

function formatAndValidate(y, m, d) {
  const pad = n => String(n).padStart(2, '0');
  let year = parseInt(y, 10);
  const month = parseInt(m, 10);
  let day = parseInt(d, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 100) year = year <= 25 ? 2000 + year : 1900 + year;
  if (month < 1 || month > 12) return null;
  if (month === 11 && day === 31) day = 30;

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function cleanPhone(raw) {
  if (!raw) return { primary: '', alternate: '' };
  const str = String(raw).trim();
  const parts = str.split(/[/,&|\n]+/).map(p => p.trim()).filter(Boolean);
  const cleanDigits = (p) => {
    let d = p.replace(/\D/g, '');
    if (d.startsWith('91') && d.length === 12) d = d.slice(2);
    if (d.startsWith('0') && d.length === 11) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : '';
  };
  const primary = parts[0] ? cleanDigits(parts[0]) : '';
  const alternate = parts[1] ? cleanDigits(parts[1]) : '';
  return { primary, alternate };
}

function parseDob(raw) {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return '';
    return formatAndValidate(d.y, d.m, d.d) || '';
  }
  let s = String(raw).replace(/\u00A0/g, ' ').trim();
  if (s === '' || s.toUpperCase() === 'NA' || s === '-' || s.toUpperCase() === 'SWICHED OFF' || s.toUpperCase() === 'USY') {
    return '';
  }
  s = s.replace(/^DATE\s*[:\-]\s*/i, '').trim();

  if (/^0?74[-/]jan[-/]14$/i.test(s)) {
    return formatAndValidate(2014, 1, 7) || '';
  }

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return formatAndValidate(m[1], m[2], m[3]) || '';

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return formatAndValidate(m[3], m[2], m[1]) || '';

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (m) return formatAndValidate(m[3], m[2], m[1]) || '';

  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)\s+(\d{4})$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(m[3], mon, m[1]) || '';
  }

  m = s.match(/^(\d{1,2})[-/]([a-zA-Z]+)[-/](\d{2,4})$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(m[3], mon, m[1]) || '';
  }

  m = s.match(/^(\d{1,2})[-/]([a-zA-Z]+)$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(2000, mon, m[1]) || '';
  }

  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(2000, mon, m[1]) || '';
  }

  return '';
}

function cleanName(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/[\r\n]+/g, ' ')
    .replace(/^[-,\s]+|[-,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const knownPhoneToName = {
  '9575136777': 'Prateek Goyal',
  '9993382370': 'Ashish',
  '7470901186': 'Satya & Group',
  '9893876400': 'Namo Narayan',
  '9926704700': 'Mansa Ji',
  '9993062123': 'Ramesh',
  '7354444525': 'Shree Hariharanand',
  '9229591515': 'Maa Kripa',
  '9575949600': 'Modi Agri Estate',
  '6264774819': 'Maa Ambika',
  '8839463742': 'Rahuveer Shree'
};

const knownNameToPhone = {
  'PIYUSH SAHU': '9893086191',
  'RAJNEESH KUMAR SINGH': '7869451106',
  'MAHESH KUMAR AHUJA': '9893989803',
  'VOSMI SHARMA': '7000338920'
};

const wb = XLSX.readFile(backupPath);
const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const parsedRecords = [];
rawRows.forEach((r, idx) => {
  const rowNum = idx + 2;
  let name = cleanName(r['NAME']);
  let dobRaw = r['DATE OF BIRTH'];
  let phoneRaw = r['MOBILE NO'];
  let lob = cleanName(r['LINE OF BUSINESS']);
  let remark = cleanName(r['REMARK']);

  if (rowNum === 313) {
    name = 'Dhirendra Singh Chouhan';
    lob = 'Pooja & Aashapura Warehouse';
  } else if (rowNum === 481) {
    name = 'Sunil Singh';
    lob = 'Aastha Warehousing Corporation';
    remark = 'Ambey Traders, Arun Marg, Nehru Nagar, Rewa, MP - 486001';
  } else if (rowNum === 110) {
    name = 'Utkarsh Arya';
    dobRaw = null;
    lob = 'Shri Rajendra Prasad Warehouse';
  }

  let { primary: phone, alternate: alternatePhone } = cleanPhone(phoneRaw);

  if (!phone && name && knownNameToPhone[name.toUpperCase()]) {
    phone = knownNameToPhone[name.toUpperCase()];
  }

  if (!name && phone && knownPhoneToName[phone]) {
    name = knownPhoneToName[phone];
  }

  const dob = parseDob(dobRaw);

  parsedRecords.push({
    originalRow: rowNum,
    name: name || 'Unnamed Customer',
    dob,
    phone,
    alternatePhone,
    lob,
    remark
  });
});

const mergedMap = new Map();
parsedRecords.forEach(rec => {
  const key = `${rec.phone || 'NO_PHONE'}|||${rec.name.toLowerCase().trim()}`;
  if (!mergedMap.has(key)) {
    mergedMap.set(key, { ...rec });
  } else {
    const existing = mergedMap.get(key);
    if (!existing.dob && rec.dob) existing.dob = rec.dob;
    if (!existing.alternatePhone && rec.alternatePhone) existing.alternatePhone = rec.alternatePhone;
    if (!existing.lob && rec.lob) existing.lob = rec.lob;
    if (!existing.remark && rec.remark) existing.remark = rec.remark;
    else if (rec.remark && !existing.remark.includes(rec.remark)) {
      existing.remark = `${existing.remark}; ${rec.remark}`;
    }
  }
});

const uniqueRecords = Array.from(mergedMap.values());
console.log(`Deduplicated records for Excel: ${uniqueRecords.length}`);

const exportRows = uniqueRecords.map((r, i) => ({
  'S.NO.': i + 1,
  'NAME': r.name,
  'DATE OF BIRTH': r.dob || 'N/A',
  'MOBILE NO': r.phone || 'N/A',
  'ALTERNATE MOBILE': r.alternatePhone || '',
  'LINE OF BUSINESS': r.lob || '',
  'REMARK': r.remark || ''
}));

const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.json_to_sheet(exportRows);

newWs['!cols'] = [
  { wch: 8 },  // S.NO.
  { wch: 30 }, // NAME
  { wch: 16 }, // DATE OF BIRTH
  { wch: 16 }, // MOBILE NO
  { wch: 18 }, // ALTERNATE MOBILE
  { wch: 35 }, // LINE OF BUSINESS
  { wch: 40 }  // REMARK
];

XLSX.utils.book_append_sheet(newWb, newWs, 'Client Birthdays');
XLSX.writeFile(newWb, targetPath);
console.log(`Successfully wrote perfected BH1.xlsx to ${targetPath}`);
