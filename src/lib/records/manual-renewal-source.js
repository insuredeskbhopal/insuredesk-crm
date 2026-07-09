export const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
export const MANUAL_RENEWAL_SOURCE_FILE = "Non_Motor_July_2026_Renewal_Data (1).xlsx";
export const MANUAL_RENEWAL_SOURCE_FILES = [MANUAL_RENEWAL_SOURCE_FILE, "generic_renewal_template.xlsx"];

const MANUAL_RENEWAL_SOURCE_SQL_LIST = MANUAL_RENEWAL_SOURCE_FILES.map((file) => `'${file.replace(/'/g, "''")}'`).join(", ");

export function getManualRenewalSourceWhere() {
  return {
    OR: [
      { extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD },
      { sourceFile: { in: MANUAL_RENEWAL_SOURCE_FILES } },
      { pdfFileName: { in: MANUAL_RENEWAL_SOURCE_FILES } },
      { reviewedData: { path: ["manualRenewalSource"], equals: true } },
      { data: { path: ["manualRenewalSource"], equals: true } },
    ],
  };
}

export function withoutManualRenewalSources(where = {}) {
  const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
  return {
    ...where,
    AND: [
      ...existingAnd,
      { OR: [{ extractionMethod: { not: MANUAL_RENEWAL_IMPORT_METHOD } }, { extractionMethod: null }] },
      { OR: [{ sourceFile: { notIn: MANUAL_RENEWAL_SOURCE_FILES } }, { sourceFile: null }] },
      { OR: [{ pdfFileName: { notIn: MANUAL_RENEWAL_SOURCE_FILES } }, { pdfFileName: null }] },
      { NOT: { reviewedData: { path: ["manualRenewalSource"], equals: true } } },
      { NOT: { data: { path: ["manualRenewalSource"], equals: true } } },
    ],
  };
}

export const MANUAL_RENEWAL_SQL_EXCLUSION = `
  AND NOT (
    COALESCE(extraction_method, '') = '${MANUAL_RENEWAL_IMPORT_METHOD}'
    OR COALESCE(source_file, '') IN (${MANUAL_RENEWAL_SOURCE_SQL_LIST})
    OR COALESCE(pdf_file_name, '') IN (${MANUAL_RENEWAL_SOURCE_SQL_LIST})
    OR COALESCE(reviewed_data->>'manualRenewalSource', data->>'manualRenewalSource', '') = 'true'
  )
`;
