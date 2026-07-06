export const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";

export function getManualRenewalSourceWhere() {
  return {
    OR: [
      { extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD },
      { sourceFile: { contains: "Renewal", mode: "insensitive" } },
      { sourceFile: { contains: "Non_Motor", mode: "insensitive" } },
      { pdfFileName: { contains: "Renewal", mode: "insensitive" } },
      { pdfFileName: { contains: "Non_Motor", mode: "insensitive" } },
      { reviewedData: { path: ["manualRenewalSource"], equals: true } },
      { data: { path: ["manualRenewalSource"], equals: true } },
    ],
  };
}

export function withoutManualRenewalSources(where = {}) {
  const existingNot = where.NOT ? (Array.isArray(where.NOT) ? where.NOT : [where.NOT]) : [];
  return {
    ...where,
    NOT: [...existingNot, getManualRenewalSourceWhere()],
  };
}

export const MANUAL_RENEWAL_SQL_EXCLUSION = `
  AND NOT (
    COALESCE(extraction_method, '') = '${MANUAL_RENEWAL_IMPORT_METHOD}'
    OR COALESCE(source_file, '') ILIKE '%Renewal%'
    OR COALESCE(source_file, '') ILIKE '%Non_Motor%'
    OR COALESCE(pdf_file_name, '') ILIKE '%Renewal%'
    OR COALESCE(pdf_file_name, '') ILIKE '%Non_Motor%'
    OR COALESCE(reviewed_data->>'manualRenewalSource', data->>'manualRenewalSource', '') = 'true'
  )
`;
