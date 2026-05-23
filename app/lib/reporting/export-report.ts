export function exportReportAsJson(report) {
  // Existing report exports download the matching records array only.
  const records = Array.isArray(report) ? report : report?.records || [];
  return JSON.stringify(records, null, 2);
}

