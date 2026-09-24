import ExcelJS from "exceljs";

// ─── Color palette (professional pastels) ───
const C = {
  navy: "1B2A4A",
  navyLight: "2D4373",
  white: "FFFFFF",
  offWhite: "F8FAFC",
  headerBg: "1E3A5F",
  headerText: "FFFFFF",
  altRow: "F1F5F9",
  borderLight: "D1D5DB",
  greenBg: "DCFCE7",
  greenText: "166534",
  greenLightBg: "ECFDF5",
  amberBg: "FEF9C3",
  amberText: "92400E",
  redBg: "FEE2E2",
  redText: "991B1B",
  purpleBg: "F3E8FF",
  purpleText: "6B21A8",
  blueBg: "DBEAFE",
  blueText: "1E40AF",
  greyBg: "E2E8F0",
  greyText: "475569",
  orangeBg: "FFEDD5",
  orangeText: "9A3412",
  yellowBg: "FEF9C3",
  yellowText: "854D0E",
};

const thinBorder = {
  top: { style: "thin", color: { argb: C.borderLight } },
  left: { style: "thin", color: { argb: C.borderLight } },
  bottom: { style: "thin", color: { argb: C.borderLight } },
  right: { style: "thin", color: { argb: C.borderLight } },
};

const headerFont = { name: "Calibri", size: 11, bold: true, color: { argb: C.headerText } };
const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
const dataFont = { name: "Calibri", size: 10 };
const boldFont = { name: "Calibri", size: 10, bold: true };

function fmtHM(decimalHours) {
  if (!decimalHours || decimalHours <= 0) return "0h 00m";
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const [y, mo, d] = dateStr.split("-");
  return `${d}-${mo}-${y}`;
}

function statusFill(status) {
  const map = {
    PRESENT: C.greenLightBg,
    HALF_DAY: C.yellowBg,
    LEAVE: C.purpleBg,
    FIELD_WORK: C.blueBg,
    ABSENT: C.redBg,
    PENDING_LOGIN: C.redBg,
    WO: C.greyBg,
  };
  const c = map[status];
  return c ? { type: "pattern", pattern: "solid", fgColor: { argb: c } } : null;
}

function applyHeader(row) {
  row.eachCell((cell) => {
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });
  row.height = 28;
}

function applyData(row, isAlt) {
  row.eachCell((cell) => {
    cell.font = dataFont;
    cell.border = thinBorder;
    cell.alignment = { ...cell.alignment, vertical: "middle" };
    if (isAlt) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.altRow } };
    }
  });
  row.height = 20;
}

function fillCell(cell, bg, text, bold = true) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
  cell.font = { ...dataFont, bold, color: { argb: text } };
}

/**
 * Generates a professionally formatted XLSX workbook buffer from calculateMonthlyAttendance() data.
 */
export async function generateAttendanceXlsx(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bima Headquarter CRM";
  wb.created = new Date();

  const { staff, days, monthName, elapsedWorkingDays } = data;
  const EXP_H = 8.5; // 10:00 AM - 6:30 PM

  // SHEET 1 -- Attendance Summary
  const ws1 = wb.addWorksheet("Attendance Summary", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    headerFooter: { oddFooter: "&CPage &P of &N" },
  });

  ws1.mergeCells("A1:T1");
  const t1 = ws1.getCell("A1");
  t1.value = "BIMA HEADQUARTER \u2014 STAFF ATTENDANCE REPORT";
  t1.font = { name: "Calibri", size: 16, bold: true, color: { argb: C.white } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(1).height = 38;

  ws1.mergeCells("A2:T2");
  const t2 = ws1.getCell("A2");
  t2.value = `Attendance Period: ${monthName}`;
  t2.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } };
  t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyLight } };
  t2.alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(2).height = 24;

  const nowIST = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  ws1.mergeCells("A3:T3");
  ws1.getCell("A3").value = `Generated: ${nowIST} IST`;
  ws1.getCell("A3").font = { name: "Calibri", size: 10, italic: true, color: { argb: C.greyText } };
  ws1.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
  ws1.getRow(3).height = 20;
  ws1.getRow(4).height = 8;

  const sHeaders = [
    "Staff Name", "Email", "Role", "WhatsApp", "Working Days",
    "Present", "Half Days", "Approved Leave", "Field Work", "Absent",
    "Weekly Off", "Late Days", "Early Exit", "Short Hours", "Total Hours Worked",
    "Expected Hours", "Attendance %", "Total Warnings", "Warning Level", "Remarks",
  ];
  const hr = ws1.getRow(5);
  sHeaders.forEach((h, i) => { hr.getCell(i + 1).value = h; });
  applyHeader(hr);

  ws1.columns = [
    { width: 22 }, { width: 24 }, { width: 14 }, { width: 16 }, { width: 13 },
    { width: 10 }, { width: 10 }, { width: 13 }, { width: 12 }, { width: 10 },
    { width: 11 }, { width: 10 }, { width: 11 }, { width: 12 }, { width: 17 },
    { width: 15 }, { width: 13 }, { width: 14 }, { width: 14 }, { width: 18 },
  ];

  staff.forEach((s, idx) => {
    const u = s.user, sm = s.summary;
    const wo = s.days.filter((d) => d.status === "WO").length;
    const expH = elapsedWorkingDays * EXP_H;
    const row = ws1.getRow(6 + idx);
    row.values = [
      u.name, u.email, (u.role || "STAFF").replace(/_/g, " "),
      u.whatsappPhone || "", elapsedWorkingDays,
      sm.presentDays, sm.halfDays, sm.leaveDays, sm.fieldWorkDays, sm.absentDays,
      wo, 0, 0, 0, fmtHM(sm.totalHours), fmtHM(expH),
      sm.attendancePercentage, sm.warningsCount,
      sm.warningsCount > 0 ? `Warning ${sm.warningsCount}` : "\u2014", "",
    ];

    row.getCell(1).font = boldFont;
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    for (let c = 3; c <= 20; c++) {
      row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
    }

    const pct = sm.attendancePercentage;
    const pc = row.getCell(17);
    pc.value = `${pct}%`;
    if (pct >= 98) fillCell(pc, C.greenBg, C.greenText);
    else if (pct >= 95) fillCell(pc, C.greenLightBg, C.greenText);
    else if (pct >= 90) fillCell(pc, C.amberBg, C.amberText);
    else fillCell(pc, C.redBg, C.redText);

    if (sm.absentDays > 0) fillCell(row.getCell(10), C.redBg, C.redText);

    const wc = sm.warningsCount;
    if (wc > 0) {
      const wCell = row.getCell(18);
      if (wc === 1) fillCell(wCell, C.yellowBg, C.yellowText);
      else if (wc === 2) fillCell(wCell, C.amberBg, C.amberText);
      else if (wc === 3) fillCell(wCell, C.orangeBg, C.orangeText);
      else fillCell(wCell, C.redBg, C.redText);
    }

    applyData(row, idx % 2 === 1);
    row.getCell(1).font = boldFont;
    if (pct >= 95) fillCell(pc, pct >= 98 ? C.greenBg : C.greenLightBg, C.greenText);
    else if (pct >= 90) fillCell(pc, C.amberBg, C.amberText);
    else fillCell(pc, C.redBg, C.redText);
    if (sm.absentDays > 0) fillCell(row.getCell(10), C.redBg, C.redText);
  });

  ws1.views = [{ state: "frozen", ySplit: 5, activeCell: "A6" }];
  ws1.autoFilter = { from: "A5", to: `T${5 + staff.length}` };

  // SHEET 2 -- Daily IN-OUT
  const ws2 = wb.addWorksheet("Daily IN-OUT", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    headerFooter: { oddFooter: "&CPage &P of &N" },
  });

  ws2.mergeCells("A1:B1");
  ws2.getCell("A1").value = "Status Legend:";
  ws2.getCell("A1").font = { ...boldFont, size: 11 };
  ws2.getRow(1).height = 20;

  const legend = [
    { l: "P = Present", bg: C.greenLightBg, t: C.greenText },
    { l: "HD = Half Day", bg: C.yellowBg, t: C.yellowText },
    { l: "L = Leave", bg: C.purpleBg, t: C.purpleText },
    { l: "F = Field Visit", bg: C.blueBg, t: C.blueText },
    { l: "A = Absent", bg: C.redBg, t: C.redText },
    { l: "WO = Weekly Off", bg: C.greyBg, t: C.greyText },
  ];
  legend.forEach((item, i) => {
    const col = 3 + i * 2;
    if (col + 1 <= 2 + days.length * 2) ws2.mergeCells(1, col, 1, col + 1);
    const c = ws2.getCell(1, col);
    c.value = item.l;
    c.font = { name: "Calibri", size: 9, bold: true, color: { argb: item.t } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: item.bg } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder;
  });

  ws2.getRow(2).height = 6;

  const dhr = ws2.getRow(3);
  dhr.getCell(1).value = "Staff Name";
  dhr.getCell(2).value = "Role";
  [1, 2].forEach((ci) => {
    const c = dhr.getCell(ci);
    c.font = headerFont; c.fill = headerFill;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = thinBorder;
  });

  days.forEach((d, i) => {
    const cs = 3 + i * 2;
    ws2.mergeCells(3, cs, 3, cs + 1);
    const c = ws2.getCell(3, cs);
    c.value = `${d.dayNumber} ${d.monthShort} ${d.weekday}`;
    c.font = headerFont;
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = d.isSunday
      ? { type: "pattern", pattern: "solid", fgColor: { argb: C.greyBg } }
      : d.isToday
      ? { type: "pattern", pattern: "solid", fgColor: { argb: C.navyLight } }
      : headerFill;
    if (d.isSunday) c.font = { ...headerFont, color: { argb: C.greyText } };
    c.border = thinBorder;
  });
  dhr.height = 26;

  const shr = ws2.getRow(4);
  [1, 2].forEach((ci) => {
    shr.getCell(ci).value = "";
    shr.getCell(ci).fill = headerFill;
    shr.getCell(ci).border = thinBorder;
  });
  days.forEach((d, i) => {
    const ic = 3 + i * 2, oc = ic + 1;
    const inC = shr.getCell(ic), ouC = shr.getCell(oc);
    inC.value = "IN"; ouC.value = "OUT";
    [inC, ouC].forEach((c) => {
      c.font = { name: "Calibri", size: 9, bold: true, color: { argb: d.isSunday ? C.greyText : C.headerText } };
      c.fill = d.isSunday
        ? { type: "pattern", pattern: "solid", fgColor: { argb: C.greyBg } }
        : headerFill;
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = thinBorder;
    });
  });
  shr.height = 20;

  ws2.getColumn(1).width = 24;
  ws2.getColumn(2).width = 16;
  for (let i = 0; i < days.length; i++) {
    ws2.getColumn(3 + i * 2).width = 12;
    ws2.getColumn(4 + i * 2).width = 12;
  }

  staff.forEach((s, idx) => {
    const row = ws2.getRow(5 + idx);
    row.getCell(1).value = s.user.name;
    row.getCell(1).font = boldFont;
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(1).border = thinBorder;
    row.getCell(2).value = (s.user.role || "STAFF").replace(/_/g, " ");
    row.getCell(2).font = dataFont;
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).border = thinBorder;
    if (idx % 2 === 1) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.altRow } };
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.altRow } };
    }

    s.days.forEach((d, di) => {
      const ic = 3 + di * 2, oc = ic + 1;
      const inC = row.getCell(ic), ouC = row.getCell(oc);
      inC.alignment = { horizontal: "center", vertical: "middle" };
      ouC.alignment = { horizontal: "center", vertical: "middle" };
      inC.font = dataFont; ouC.font = dataFont;
      inC.border = thinBorder; ouC.border = thinBorder;

      if (d.status === "WO") {
        inC.value = "WO"; ouC.value = "WO";
        fillCell(inC, C.greyBg, C.greyText, false);
        fillCell(ouC, C.greyBg, C.greyText, false);
      } else if (d.status === "FUTURE") {
        inC.value = ""; ouC.value = "";
      } else if (d.status === "LEAVE") {
        inC.value = "L"; ouC.value = "L";
        fillCell(inC, C.purpleBg, C.purpleText);
        fillCell(ouC, C.purpleBg, C.purpleText);
      } else if (d.status === "FIELD_WORK") {
        inC.value = d.punchIn || "F"; ouC.value = d.punchOut || "F";
        inC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueBg } };
        ouC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueBg } };
      } else if (d.status === "ABSENT" || d.status === "PENDING_LOGIN") {
        inC.value = "A"; ouC.value = "A";
        fillCell(inC, C.redBg, C.redText);
        fillCell(ouC, C.redBg, C.redText);
      } else if (d.status === "HALF_DAY") {
        inC.value = d.punchIn || "HD"; ouC.value = d.punchOut || "";
        inC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.yellowBg } };
        ouC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.yellowBg } };
      } else {
        inC.value = d.punchIn || ""; ouC.value = d.punchOut || "";
        if (d.punchIn) inC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenLightBg } };
        if (d.punchOut) ouC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenLightBg } };
      }
    });
    row.height = 20;
  });

  ws2.views = [{ state: "frozen", xSplit: 2, ySplit: 4, activeCell: "C5" }];

  // SHEET 3 -- Attendance Register
  const ws3 = wb.addWorksheet("Attendance Register", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    headerFooter: { oddFooter: "&CPage &P of &N" },
  });

  ws3.mergeCells("A1:S1");
  const rt = ws3.getCell("A1");
  rt.value = `BIMA HEADQUARTER \u2014 ATTENDANCE REGISTER (${monthName})`;
  rt.font = { name: "Calibri", size: 14, bold: true, color: { argb: C.white } };
  rt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  rt.alignment = { horizontal: "center", vertical: "middle" };
  ws3.getRow(1).height = 32;
  ws3.getRow(2).height = 6;

  const rHeaders = [
    "Date", "Day", "Staff Name", "Email", "Role",
    "Status", "IN Time", "OUT Time", "Worked Duration",
    "Expected Duration", "Late By", "Early Exit By", "Short Hours",
    "Leave Type", "Field Visit", "Warning Generated", "Warning Level",
    "Remark", "Source",
  ];
  const rhr = ws3.getRow(3);
  rHeaders.forEach((h, i) => { rhr.getCell(i + 1).value = h; });
  applyHeader(rhr);

  ws3.columns = [
    { width: 14 }, { width: 12 }, { width: 22 }, { width: 24 }, { width: 14 },
    { width: 14 }, { width: 12 }, { width: 12 }, { width: 16 },
    { width: 16 }, { width: 12 }, { width: 14 }, { width: 13 },
    { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 },
    { width: 22 }, { width: 14 },
  ];

  let rn = 4;
  staff.forEach((s) => {
    const u = s.user;
    s.days.forEach((d) => {
      if (d.status === "FUTURE") return;
      const row = ws3.getRow(rn);
      const worked = d.hours > 0 ? fmtHM(d.hours) : "\u2014";
      const expD = d.status === "WO" ? "\u2014" : fmtHM(EXP_H);
      row.values = [
        fmtDate(d.date), d.weekday, u.name, u.email,
        (u.role || "STAFF").replace(/_/g, " "),
        d.label || d.status,
        d.punchIn || "\u2014",
        d.punchOut || (d.punchIn && d.isToday ? "" : "\u2014"),
        worked, expD,
        "\u2014", "\u2014",
        d.hours > 0 && d.hours < 4.5 ? fmtHM(EXP_H - d.hours) : "\u2014",
        d.status === "LEAVE" ? (d.reason || "Approved Leave") : "\u2014",
        d.status === "FIELD_WORK" ? (d.reason || "Field Work") : "\u2014",
        d.warnings > 0 ? "Yes" : "No",
        d.warnings > 0 ? `Warning ${d.warnings}` : "\u2014",
        d.reason || "", d.punchIn ? "CRM Presence" : "\u2014",
      ];
      const sf = statusFill(d.status);
      if (sf) row.getCell(6).fill = sf;
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).font = boldFont;
      row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
      for (let c = 4; c <= 19; c++) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
      applyData(row, (rn - 4) % 2 === 1);
      row.getCell(3).font = boldFont;
      if (sf) row.getCell(6).fill = sf;
      rn++;
    });
  });

  ws3.views = [{ state: "frozen", ySplit: 3, activeCell: "A4" }];
  ws3.autoFilter = { from: "A3", to: `S${rn - 1}` };

  // SHEET 4 -- Warnings & Exceptions
  const ws4 = wb.addWorksheet("Warnings & Exceptions", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    headerFooter: { oddFooter: "&CPage &P of &N" },
  });

  ws4.mergeCells("A1:N1");
  const wt = ws4.getCell("A1");
  wt.value = `BIMA HEADQUARTER \u2014 WARNINGS & EXCEPTIONS (${monthName})`;
  wt.font = { name: "Calibri", size: 14, bold: true, color: { argb: C.white } };
  wt.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  wt.alignment = { horizontal: "center", vertical: "middle" };
  ws4.getRow(1).height = 32;
  ws4.getRow(2).height = 6;

  const wHeaders = [
    "Date", "Staff Name", "Email", "Role", "Issue Type",
    "Expected", "Actual", "Difference", "Warning Level",
    "Warning Time", "WhatsApp Status", "WhatsApp Recipient",
    "Management Status", "Resolution / Remark",
  ];
  const whr = ws4.getRow(3);
  wHeaders.forEach((h, i) => { whr.getCell(i + 1).value = h; });
  applyHeader(whr);

  ws4.columns = [
    { width: 14 }, { width: 22 }, { width: 24 }, { width: 14 }, { width: 20 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 18 },
    { width: 16 }, { width: 22 },
  ];

  let wn = 4;
  let hasEx = false;

  staff.forEach((s) => {
    const u = s.user;
    s.days.forEach((d) => {
      if (d.status === "FUTURE" || d.status === "WO") return;
      const isAbs = d.status === "ABSENT" || d.status === "PENDING_LOGIN";
      const isHD = d.status === "HALF_DAY";
      const hasW = d.warnings > 0;
      const isLv = d.status === "LEAVE";
      const isFw = d.status === "FIELD_WORK";
      if (!isAbs && !isHD && !hasW && !isLv && !isFw) return;

      hasEx = true;
      let issue = "", exp = fmtHM(EXP_H), act = fmtHM(d.hours), diff = "\u2014";

      if (isAbs) { issue = "Absent"; act = "0h 00m"; diff = exp; }
      else if (isHD) { issue = "Short Working Hours"; diff = fmtHM(EXP_H - d.hours); }
      else if (hasW) { issue = `Warning (Level ${d.warnings})`; }
      else if (isLv) { issue = "Approved Leave"; exp = "\u2014"; act = "\u2014"; }
      else if (isFw) { issue = "Field Work / Client Visit"; act = fmtHM(8); }

      const row = ws4.getRow(wn);
      row.values = [
        fmtDate(d.date), u.name, u.email,
        (u.role || "STAFF").replace(/_/g, " "),
        issue, exp, act, diff,
        hasW ? `Warning ${d.warnings}` : "\u2014",
        "\u2014", "\u2014", u.whatsappPhone || "\u2014",
        isAbs ? "Open" : "\u2014", d.reason || "",
      ];

      const ic = row.getCell(5);
      if (isAbs) fillCell(ic, C.redBg, C.redText);
      else if (isHD) fillCell(ic, C.yellowBg, C.yellowText);
      else if (hasW) fillCell(ic, C.orangeBg, C.orangeText);
      else if (isLv) fillCell(ic, C.purpleBg, C.purpleText);

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).font = boldFont;
      row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      for (let c = 3; c <= 14; c++) {
        row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      }
      applyData(row, (wn - 4) % 2 === 1);
      row.getCell(2).font = boldFont;
      if (isAbs) fillCell(ic, C.redBg, C.redText);
      else if (isHD) fillCell(ic, C.yellowBg, C.yellowText);
      else if (hasW) fillCell(ic, C.orangeBg, C.orangeText);
      else if (isLv) fillCell(ic, C.purpleBg, C.purpleText);
      wn++;
    });
  });

  if (!hasEx) {
    ws4.mergeCells("A4:N4");
    const er = ws4.getRow(4);
    er.getCell(1).value = "No attendance exceptions were recorded for this period.";
    er.getCell(1).font = { name: "Calibri", size: 12, italic: true, color: { argb: C.greyText } };
    er.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    er.height = 40;
  }

  ws4.views = [{ state: "frozen", ySplit: 3, activeCell: "A4" }];
  if (hasEx) ws4.autoFilter = { from: "A3", to: `N${wn - 1}` };

  return await wb.xlsx.writeBuffer();
}
