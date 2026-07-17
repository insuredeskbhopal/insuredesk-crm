import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
const cssRule = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("modal layout contract", () => {
  it("keeps fixed dialogs relative to the viewport", () => {
    const globals = read("src/app/globals.css");
    const pageIn = globals.slice(globals.indexOf("@keyframes page-in"), globals.indexOf("@media (prefers-reduced-motion"));

    expect(pageIn).not.toContain("transform:");
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

  it("keeps responsive form dialogs centered", () => {
    const userManagement = read("src/app/ui/dashboard/user-management.css");
    expect(userManagement).not.toMatch(/\.user-form-modal-backdrop\s*\{[^}]*align-items:\s*(?:end|start|flex-end|flex-start)/s);
  });
});
