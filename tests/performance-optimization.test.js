// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("long-session performance safeguards", () => {
  it("server-paginates the legacy policy and customer entry routes", () => {
    const bulkPage = read("src/app/(dashboard)/bulk-upload/page.js");
    const manualPage = read("src/app/(dashboard)/manual-policy-entry/page.js");
    const customerPage = read("src/app/(dashboard)/customer-management/page.js");
    const customerDetail = read("src/app/(dashboard)/customer-management/[customerId]/page.js");

    expect(bulkPage).toContain("page, limit: 10");
    expect(manualPage).toContain("initialRecords={[]}");
    expect(manualPage).not.toContain("loadScopedPolicyRecords");
    expect(customerPage).toContain("loadScopedCustomerPolicyPage");
    expect(customerPage).toContain("serverPaginatedCustomers");
    expect(customerDetail).toContain("loadScopedCustomerPolicies");
  });

  it("keeps claim list payloads small and loads full details on demand", () => {
    const page = read("src/app/components/operations/ClaimsManagementPage.js");
    const route = read("src/app/api/claims/route.js");
    const utils = read("src/app/api/claims/utils.js");

    expect(page).toContain("const PAGE_SIZE = 25");
    expect(page).not.toContain("limit=500");
    expect(page).toContain("openClaimDetails(item)");
    expect(page).toContain("fetchClaimDetail(item.id)");
    expect(route).toContain("select: claimListSelect");
    expect(route).toContain("), 100)");
    expect(utils).toContain("_count: { select: { remarks: true, documents: true } }");
    expect(utils).not.toMatch(/claimListSelect[\s\S]*dataUrl:\s*true/);
  });

  it("uses one renewal-customer browser request and avoids recounting on page-only changes", () => {
    const page = read("src/app/(dashboard)/dashboard/renewals/customers/page.js");
    const apiCalls = page.match(/\/api\/renewals\/customers\?/g) || [];

    expect(apiCalls).toHaveLength(1);
    expect(page).toContain("categoryCountsKeyRef");
    expect(page).toContain("includeCategoryCounts=${includeCategoryCounts}");
    expect(page).toContain("customersRequestRef.current?.abort()");
  });

  it("debounces client searches and cancels stale requests", () => {
    const clientManagement = read("src/app/components/operations/ClientManagementPage.js");
    const previewField = read("src/app/components/shared/PreviewField.js");

    expect(clientManagement).toContain("window.setTimeout(fetchClients, searchQuery ? 300 : 0)");
    expect(clientManagement).toContain("clientsRequestRef.current?.abort()");
    expect(clientManagement).toContain("}, 300)");
    expect(previewField).toContain("scheduleNextCheck");
    expect(previewField).toContain("controller.abort()");
    expect(previewField).not.toContain("setInterval(checkRequest");
  });

  it("cleans up polling, event listeners, and bounded client caches", () => {
    const workCenter = read("src/app/components/operations/WorkCenterPage.js");
    const whatsapp = read("src/app/components/operations/WhatsAppSetupPage.js");
    const cache = read("src/app/lib/client-api.js");

    expect(workCenter).toContain("document.removeEventListener(\"visibilitychange\"");
    expect(workCenter).toContain("load({ force: true })");
    expect(whatsapp).toContain("queueRequestRef.current?.abort()");
    expect(whatsapp).toContain("fetchStatus(false, true)");
    expect(cache).toContain("const MAX_CACHE_ENTRIES = 25");
    expect(cache).toContain("export function clearClientApiCache()");
  });

  it("lazy loads WhatsApp-only customer components", () => {
    for (const file of [
      "src/app/(dashboard)/dashboard/renewals/customers/page.js",
      "src/app/(dashboard)/dashboard/renewals/customers/[id]/page.js",
    ]) {
      const source = read(file);
      expect(source).toContain("dynamic(() => import(\"@/app/components/whatsapp/WhatsAppRecipientPicker\"))");
      expect(source).not.toContain("import WhatsAppRecipientPicker from");
    }
  });

  it("loads renewal team and portfolio options only when an action needs them", () => {
    for (const file of [
      "src/app/(dashboard)/dashboard/renewals/customers/page.js",
      "src/app/(dashboard)/dashboard/renewals/customers/[id]/page.js",
    ]) {
      const source = read(file);
      expect(source).toContain("const loadTeamMembers = async () =>");
      expect(source).toContain("const loadPortfolioOptions = async () =>");
      expect(source).toContain("void loadTeamMembers()");
      expect(source).toContain("void loadPortfolioOptions()");
      expect(source.match(/\/api\/renewals\/team/g) || []).toHaveLength(1);
      expect(source.match(/\/api\/renewals\/portfolios/g) || []).toHaveLength(1);
    }
  });

  it("cancels stale renewal customer profile requests", () => {
    const source = read("src/app/(dashboard)/dashboard/renewals/customers/[id]/page.js");

    expect(source).toContain("const profileRequestRef = useRef(null)");
    expect(source).toContain("profileRequestRef.current?.abort()");
    expect(source).toContain("signal: controller.signal");
    expect(source).toContain("profileRequestRef.current === controller");
    expect(source).toContain("return () => profileRequestRef.current?.abort()");
  });

  it("defers client-portal tools and cancels its startup requests", () => {
    const portal = read("src/app/client/portal/page.js");

    expect(portal).toContain('dynamic(() =>\n  import("./ClientExperienceCenter")');
    expect(portal).not.toContain("import ClientExperienceCenter, {");
    expect(portal).toContain("const [policiesRes, claimsRes] = await Promise.all([");
    expect(portal).toContain("return () => controller.abort()");
    expect(portal).toContain("{selectedPolicy ? (");
  });
});
