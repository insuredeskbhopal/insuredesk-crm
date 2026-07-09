export const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
export const MANUAL_RENEWAL_SOURCE_FILE = "Non_Motor_July_2026_Renewal_Data (1).xlsx";

export function getManualRenewalSourceWhere() {
  return {
    OR: [
      { extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD },
      { sourceFile: MANUAL_RENEWAL_SOURCE_FILE },
      { pdfFileName: MANUAL_RENEWAL_SOURCE_FILE },
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
      { OR: [{ sourceFile: { not: MANUAL_RENEWAL_SOURCE_FILE } }, { sourceFile: null }] },
      { OR: [{ pdfFileName: { not: MANUAL_RENEWAL_SOURCE_FILE } }, { pdfFileName: null }] },
    ],
  };
}

export const MANUAL_RENEWAL_SQL_EXCLUSION = `
  AND NOT (
    COALESCE(extraction_method, '') = '${MANUAL_RENEWAL_IMPORT_METHOD}'
    OR COALESCE(source_file, '') = '${MANUAL_RENEWAL_SOURCE_FILE}'
    OR COALESCE(pdf_file_name, '') = '${MANUAL_RENEWAL_SOURCE_FILE}'
    OR COALESCE(reviewed_data->>'manualRenewalSource', data->>'manualRenewalSource', '') = 'true'
  )
`;
