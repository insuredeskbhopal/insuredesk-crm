export const CRM_ROUTE_PREFIXES = [
  "/dashboard",
  "/bulk-upload",
  "/operations",
  "/policy-records",
  "/customer-management",
  "/work-center",
  "/manual-policy-entry",
  "/analytics-reports",
  "/premium-reports",
  "/settings",
  "/upload-history",
  "/admin",
  "/crm",
  "/field-setup",
  "/claims",
];

/**
 * Checks if a pathname belongs to the CRM dashboard or administrative area.
 * @param {string | null | undefined} pathname
 * @returns {boolean}
 */
export function isCrmPath(pathname) {
  if (!pathname || typeof pathname !== "string") return false;
  return CRM_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
