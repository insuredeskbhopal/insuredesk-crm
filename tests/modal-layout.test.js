import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
const cssRule = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("modal layout contract", () => {
  it("keeps dashboard content from creating a fixed-position containing block", () => {
    const globals = read("src/app/globals.css");
    const shell = read("src/app/ui/dashboard/shell-and-upload.css");
    const pageIn = globals.slice(globals.indexOf("@keyframes page-in"), globals.indexOf("@media (prefers-reduced-motion"));
    const contentCanvas = cssRule(shell, ".content-canvas");

    expect(pageIn).not.toContain("transform:");
    expect(contentCanvas).not.toMatch(/(?:animation|transform|filter|contain|will-change)\s*:/);
  });

  it("provides one document-body portal for focus-taking floating cards", () => {
    const portal = read("src/app/components/shared/ModalPortal.js");
    expect(portal).toContain('import { createPortal } from "react-dom"');
    expect(portal).toContain("createPortal(children, document.body)");
  });

  it("centers and blurs shared dashboard modal backdrops above the chrome", () => {
    const chrome = read("src/app/ui/dashboard/chrome-and-responsive.css");
    const backdrop = cssRule(chrome, ".tb-modal-backdrop");

    expect(backdrop).toMatch(/position:\s*fixed/);
    expect(backdrop).toMatch(/inset:\s*0/);
    expect(backdrop).toMatch(/justify-content:\s*center/);
    expect(backdrop).toMatch(/align-items:\s*center/);
    expect(backdrop).toMatch(/backdrop-filter:\s*blur/);
    expect(backdrop).toMatch(/z-index:\s*9999/);
  });

  it("keeps direct dialog overlays centered, blurred, and above dashboard navigation", () => {
    const directModalFiles = [
      "src/app/components/operations/BirthdayManagementPage.js",
      "src/app/components/operations/WhatsAppSetupPage.js",
      "src/app/components/operations/WorkCenterPage.js",
      "src/app/client/portal/ClientExperienceCenter.js",
    ];

    for (const file of directModalFiles) {
      const modalLines = read(file).split("\n").filter((line) => line.includes("fixed inset-0"));
      expect(modalLines.length, file).toBeGreaterThan(0);
      for (const line of modalLines) {
        expect(line, file).toContain("z-[10050]");
        expect(line, file).toContain("items-center");
        expect(line, file).toContain("justify-center");
        expect(line, file).toContain("backdrop-blur-md");
      }
    }
  });

  it("portals every modal-bearing surface above its layout ancestors", () => {
    const modalFiles = [
      "src/app/ui/dashboard.js",
      "src/app/components/layout/SideNav.tsx",
      "src/app/components/layout/TopBar.tsx",
      "src/app/components/operations/BirthdayManagementPage.js",
      "src/app/components/operations/ClaimsManagementPage.js",
      "src/app/components/operations/ClientManagementPage.js",
      "src/app/components/operations/WhatsAppSetupPage.js",
      "src/app/components/operations/WorkCenterPage.js",
      "src/app/components/operations/claims/modals.js",
      "src/app/components/shared/PolicyDetailCard.js",
      "src/app/components/users/UserManagement.js",
      "src/app/client/portal/ClientExperienceCenter.js",
      "src/app/(dashboard)/dashboard/manual-entry/customer-profiling/page.js",
      "src/app/(dashboard)/dashboard/manual-entry/customer-profiling/[id]/page.js",
      "src/app/(dashboard)/dashboard/renewals/customers/page.js",
      "src/app/(dashboard)/dashboard/renewals/customers/[id]/page.js",
      "src/app/(dashboard)/dashboard/renewals/daily-work/page.js",
      "src/app/(dashboard)/dashboard/renewals/follow-ups/page.js",
      "src/app/(dashboard)/dashboard/renewals/layout.js",
    ];

    for (const file of modalFiles) {
      const source = read(file);
      const usesPortal = source.includes("<ModalPortal>") || (source.includes("createPortal(") && source.includes("document.body"));
      expect(usesPortal, `${file} must render modals under document.body`).toBe(true);
    }
  });

  it("centers every Client ID Management dialog in one full-viewport shell", () => {
    const component = read("src/app/components/operations/ClientManagementPage.js");
    const chrome = read("src/app/ui/dashboard/chrome-and-responsive.css");
    const shell = cssRule(chrome, ".client-management-modal-shell");

    expect(component.match(/<ModalPortal>/g)).toHaveLength(4);
    expect(component.match(/className="client-management-modal-shell"/g)).toHaveLength(4);
    expect(component.match(/client-management-modal-card/g)).toHaveLength(4);
    expect(shell).toMatch(/position:\s*fixed/);
    expect(shell).toMatch(/inset:\s*0/);
    expect(shell).toMatch(/display:\s*grid/);
    expect(shell).toMatch(/place-items:\s*center/);
    expect(shell).toMatch(/backdrop-filter:\s*blur/);
    expect(shell).toMatch(/z-index:\s*20000/);
  });

  it("keeps responsive form dialogs centered", () => {
    const userManagement = read("src/app/ui/dashboard/user-management.css");
    expect(userManagement).not.toMatch(/\.user-form-modal-backdrop\s*\{[^}]*align-items:\s*(?:end|start|flex-end|flex-start)/s);
  });
});
