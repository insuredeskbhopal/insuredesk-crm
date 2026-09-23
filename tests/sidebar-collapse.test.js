// @vitest-environment node

import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) => fs.readFileSync(path, "utf8");

describe("dashboard sidebar collapse", () => {
  it("persists the desktop collapse preference", () => {
    const layout = read("src/app/(dashboard)/layout.js");

    expect(layout).toContain('window.localStorage.getItem("dashboard-sidebar-collapsed")');
    expect(layout).toContain('window.localStorage.setItem("dashboard-sidebar-collapsed", String(next))');
    expect(layout).toContain('className={isSidebarCollapsed ? "sidebar-collapsed" : ""}');
  });

  it("provides an accessible collapse control and compact labels", () => {
    const sideNav = read("src/app/components/layout/SideNav.tsx");

    expect(sideNav).toContain('className="side-nav-collapse-button"');
    expect(sideNav).toContain('aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}');
    expect(sideNav).toContain('className="side-nav-label"');
    expect(sideNav).toContain('title={item.label}');
  });

  it("resizes dashboard chrome and preserves the mobile drawer", () => {
    const styles = read("src/app/ui/dashboard/shell-and-upload.css");

    expect(styles).toContain('.app-shell.sidebar-collapsed .side-nav');
    expect(styles).toContain('.app-shell.sidebar-collapsed .content-canvas');
    expect(styles).toContain('.app-shell.sidebar-collapsed .top-bar');
    expect(styles).toContain('@media (max-width: 767px)');
    expect(styles).toContain('.side-nav .side-nav-collapse-button');
    expect(styles).toContain('display: none !important;');
  });

  it("locks the sidebar to the viewport with position fixed and bottom 0", () => {
    const styles = read("src/app/ui/dashboard/shell-and-upload.css");
    expect(styles).toContain("position: fixed;");
    expect(styles).toContain("bottom: 0;");
  });

  it("identifies all CRM routes so that page transitions and smooth scrolling bypass the dashboard", async () => {
    const { isCrmPath } = await import("../src/app/lib/route-utils.js");

    // All dashboard routes must be recognized
    expect(isCrmPath("/bulk-upload")).toBe(true);
    expect(isCrmPath("/policy-records")).toBe(true);
    expect(isCrmPath("/customer-management")).toBe(true);
    expect(isCrmPath("/dashboard")).toBe(true);
    expect(isCrmPath("/operations")).toBe(true);
    expect(isCrmPath("/work-center")).toBe(true);
    expect(isCrmPath("/settings")).toBe(true);
    expect(isCrmPath("/upload-history")).toBe(true);

    // Public routes must NOT be flagged as CRM routes
    expect(isCrmPath("/")).toBe(false);
    expect(isCrmPath("/about")).toBe(false);
    expect(isCrmPath("/services")).toBe(false);
    expect(isCrmPath("/contact")).toBe(false);
  });
});
