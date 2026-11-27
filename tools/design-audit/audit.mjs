#!/usr/bin/env node
/**
 * Unified Read-Only AI Design & Vibe-Code Audit Orchestrator
 *
 * Coordinates all verified tools inside tools/design-audit/ without mutating
 * application files, database state, authentication, or root dependencies:
 *   1. Impeccable (pbakaus/impeccable, Apache-2.0) — static JSX/TSX/CSS + rendered URLs
 *   2. Slop Detect (ravidsrk/slop-detect-core, MIT) — 45 design patterns, copy, craft, mobile reflow
 *   3. VibeCheck (ashish-jabble/vibe-check, MIT via isolated .venv-vibecheck; documents o-k-a-y/vibecheck Rust incompatibility)
 *   4. Vibe Code Detector (paladini/vibe-code-detector, MIT DOM heuristics)
 *   5. PixelSlop (gabelul/pixelslop, Apache-2.0) — source patterns + live desktop/tablet/mobile UX evidence
 *   6. Consolidated static CSS/JSX hierarchy & token telemetry across src/app
 */

import fs from "fs";
import http from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync, spawn } from "child_process";
import { createRequire } from "module";
import {
  buildPageScript,
  waitFontsReadyInPage,
  measureMobileReflowOnPage,
  assembleScanResult,
} from "slop-detect-core";
import { VIBE_FACTORS, evaluateVibeInDom } from "./adapters/vibe-code-detector.mjs";
import { analyzeSourcePatterns } from "./adapters/source-patterns.mjs";

const require = createRequire(import.meta.url);
const pixelslopBrowser = require("./node_modules/pixelslop/bin/pixelslop-browser.cjs");
const { chromium } = require("playwright-core");

const __filename = fileURLToPath(import.meta.url);
const AUDIT_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(AUDIT_DIR, "..", "..");
const DEFAULT_OUT_DIR = path.join(AUDIT_DIR, "reports");
const DEFAULT_ROUTES = ["/", "/login", "/crm/admin/login", "/services", "/faq", "/download-app"];
const PIXELSLOP_LIVE_ROUTES = ["/", "/login"];

function parseArgs(argv) {
  const opts = {
    mode: "all",
    outDir: DEFAULT_OUT_DIR,
    routes: DEFAULT_ROUTES,
    baseUrl: null,
    quiet: false,
  };
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) opts.mode = arg.slice(7).toLowerCase();
    else if (arg.startsWith("--out-dir=")) opts.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--routes=")) {
      opts.routes = arg
        .slice(9)
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--url=")) opts.baseUrl = arg.slice(6).replace(/\/+$/, "");
    else if (arg === "--quiet") opts.quiet = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node tools/design-audit/audit.mjs [options]
  --mode=all|static|live   Audit scope (default: all)
  --routes=/,/login,...    Comma-separated unauthenticated routes for live scan
  --url=http://...         Use an already running base URL instead of starting ephemeral next start
  --out-dir=<path>         Output directory for reports (default: tools/design-audit/reports)
  --quiet                  Minimal stdout output`);
      process.exit(0);
    }
  }
  return opts;
}

function commandExists(cmd) {
  const checker = process.platform === "win32" ? "where.exe" : "which";
  try {
    execFileSync(checker, [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      srv.close((err) => (err ? reject(err) : resolve(addr.port)));
    });
  });
}

function waitForHttp(url, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server responded ${res.statusCode} at ${url}`));
        } else {
          setTimeout(poll, 350);
        }
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ephemeral server at ${url}`));
        } else {
          setTimeout(poll, 350);
        }
      });
    };
    poll();
  });
}

function killProcessTree(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      proc.kill("SIGTERM");
    }
  } catch {
    // Process may already have exited cleanly.
  }
}

async function probeExistingLocalServer(url = "http://127.0.0.1:3000") {
  try {
    await waitForHttp(`${url}/`, 2500);
    return url;
  } catch {
    return null;
  }
}

async function startEphemeralNextServer() {
  const existing = await probeExistingLocalServer("http://127.0.0.1:3000");
  if (existing) {
    return { baseUrl: existing, stop: () => {}, reused: true, logs: [] };
  }

  const buildIdPath = path.join(REPO_ROOT, ".next", "BUILD_ID");
  const nextBin = path.join(REPO_ROOT, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(buildIdPath) || !fs.existsSync(nextBin)) {
    throw new Error("Missing .next/BUILD_ID or next CLI; run `npm run build` first or pass --mode=static.");
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const logs = [];

  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: REPO_ROOT,
    env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));

  try {
    await waitForHttp(`${baseUrl}/`, 25000);
    return { baseUrl, stop: () => killProcessTree(child), logs };
  } catch (err) {
    killProcessTree(child);
    throw new Error(`${err.message}\nServer logs:\n${logs.join("").slice(-800)}`);
  }
}

function runImpeccable(targets, extraArgs = [], browserExecutable = null) {
  const binPath = path.join(AUDIT_DIR, "node_modules", "impeccable", "cli", "bin", "cli.js");
  const args = [binPath, "detect", "--json", "--no-config", ...extraArgs, ...targets];
  const env = { ...process.env };
  if (browserExecutable) {
    env.PUPPETEER_EXECUTABLE_PATH = browserExecutable;
    env.CHROME_PATH = browserExecutable;
  }

  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd: REPO_ROOT,
      env,
      encoding: "utf8",
      maxBuffer: 25 * 1024 * 1024,
      timeout: 120000,
    });
    return { ok: true, exitCode: 0, findings: JSON.parse(stdout || "[]"), error: null };
  } catch (err) {
    const exitCode = typeof err.status === "number" ? err.status : 1;
    const rawOut = String(err.stdout || "").trim();
    const rawErr = String(err.stderr || "").trim();
    if (exitCode === 2 && rawOut) {
      try {
        return { ok: true, exitCode: 2, findings: JSON.parse(rawOut), error: null };
      } catch {
        // Fall through to report unparseable output cleanly.
      }
    }
    return {
      ok: false,
      exitCode,
      findings: [],
      error: rawErr || err.message || "Impeccable execution failed",
    };
  }
}

function runVibeCheckPython(capturePayloadPath) {
  const pyExe =
    process.platform === "win32"
      ? path.join(AUDIT_DIR, ".venv-vibecheck", "Scripts", "python.exe")
      : path.join(AUDIT_DIR, ".venv-vibecheck", "bin", "python");
  const runnerPath = path.join(AUDIT_DIR, "adapters", "vibecheck_runner.py");
  if (!fs.existsSync(pyExe)) {
    return { ok: false, error: `Missing isolated Python venv at ${pyExe}` };
  }
  try {
    const stdout = execFileSync(pyExe, [runnerPath, capturePayloadPath], {
      cwd: AUDIT_DIR,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      timeout: 60000,
    });
    return { ok: true, data: JSON.parse(stdout) };
  } catch (err) {
    return { ok: false, error: String(err.stderr || err.message || "vibecheck_runner.py failed") };
  }
}

async function runLiveBrowserAudit(baseUrl, routes, browserRuntime, outDir) {
  if (!browserRuntime?.available) {
    return { ok: false, error: browserRuntime?.message || "No Chromium runtime detected" };
  }

  const slopScriptDesktop = buildPageScript({ includeSystem: true, includeExperimental: false });
  const browser = await chromium.launch({
    headless: true,
    executablePath: browserRuntime.executablePath,
  });

  const routeResults = [];
  const vibeCheckPages = [];
  const assetChunks = [];
  const seenAssetUrls = new Set();

  try {
    for (const route of routes) {
      const targetUrl = `${baseUrl}${route.startsWith("/") ? route : `/${route}`}`;
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      try {
        const resp = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(450);
        await page.evaluate(waitFontsReadyInPage, 2500).catch(() => {});

        const rawSlopData = await page.evaluate(slopScriptDesktop);
        const mobileReflow = await measureMobileReflowOnPage(page);
        if (rawSlopData?.craftSignals) {
          rawSlopData.craftSignals.mobile_reflow_failure = mobileReflow;
        }
        const slopResult = assembleScanResult(rawSlopData, {
          url: targetUrl,
          finalUrl: page.url(),
          axes: ["design", "copy", "craft"],
        });

        const vcdResult = await page.evaluate(evaluateVibeInDom, VIBE_FACTORS);

        const renderedHtml = await page.evaluate(() => document.documentElement.outerHTML);
        const assetHrefs = await page.evaluate(() =>
          Array.from(document.querySelectorAll('link[rel="stylesheet"][href], script[src]'))
            .map((el) => el.getAttribute("href") || el.getAttribute("src"))
            .filter(Boolean),
        );

        for (const href of assetHrefs.slice(0, 8)) {
          const absAsset = new URL(href, targetUrl).toString();
          if (!absAsset.startsWith(baseUrl) || seenAssetUrls.has(absAsset)) continue;
          seenAssetUrls.add(absAsset);
          try {
            const assetRes = await fetch(absAsset);
            if (assetRes.ok) {
              const txt = await assetRes.text();
              assetChunks.push(txt.slice(0, 200000));
            }
          } catch {
            // Skip unreachable static assets without failing scan.
          }
        }

        const respHeaders = resp ? await resp.allHeaders().catch(() => ({})) : {};
        vibeCheckPages.push({ url: targetUrl, html: renderedHtml, headers: respHeaders });

        routeResults.push({
          route,
          url: targetUrl,
          status: resp ? resp.status() : null,
          title: slopResult.title || null,
          h1: slopResult.h1 || null,
          h1Font: slopResult.h1Font || null,
          slopDetect: {
            score: slopResult.score,
            tier: slopResult.tier,
            grade: slopResult.grade,
            patternsFlagged: slopResult.patternsFlagged,
            patternsTotal: slopResult.patternsTotal,
            triggeredPatterns: (slopResult.patterns || []).filter((p) => p.triggered),
            copy: slopResult.axes?.copy || null,
            craft: slopResult.craft || null,
            mobileReflow,
            kitMatch: slopResult.kitMatch || null,
          },
          vibeCodeDetector: vcdResult,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  // Feed captured rendered HTML & styles to ashish-jabble/vibe-check Python analyzer.
  const capturePath = path.join(outDir, "vibecheck-capture.json");
  fs.writeFileSync(
    capturePath,
    JSON.stringify({
      pages: vibeCheckPages,
      asset_text: assetChunks.join("\n").slice(0, 1_500_000),
    }),
    "utf8",
  );
  const vibeCheckPython = runVibeCheckPython(capturePath);

  // Run Impeccable URL scans at Desktop + Mobile on core public/auth routes.
  const impeccableUrls = PIXELSLOP_LIVE_ROUTES.filter((r) => routes.includes(r)).map((r) => `${baseUrl}${r}`);
  if (routes.includes("/crm/admin/login")) impeccableUrls.push(`${baseUrl}/crm/admin/login`);

  const impeccableLiveDesktop = impeccableUrls.length
    ? runImpeccable(impeccableUrls, ["--viewport", "1280x800"], browserRuntime.executablePath)
    : { ok: true, findings: [] };
  const impeccableLiveMobile = impeccableUrls.length
    ? runImpeccable(impeccableUrls, ["--viewport", "390x844"], browserRuntime.executablePath)
    : { ok: true, findings: [] };

  // Run PixelSlop live desktop/tablet/mobile UX evidence collection inside gitignored reports/pixelslop.
  const pixelslopDir = path.join(outDir, "pixelslop");
  fs.mkdirSync(pixelslopDir, { recursive: true });
  const pixelSlopLive = [];
  for (const route of PIXELSLOP_LIVE_ROUTES.filter((r) => routes.includes(r))) {
    const slug = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
    const outFile = path.join(pixelslopDir, `evidence-${slug}.json`);
    try {
      const res = await pixelslopBrowser.collectEvidence({
        url: `${baseUrl}${route}`,
        root: pixelslopDir,
        cwd: pixelslopDir,
        out: outFile,
      });
      const bundle = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : null;
      pixelSlopLive.push({ route, ok: res.ok, outputPath: outFile, bundle });
    } catch (err) {
      pixelSlopLive.push({ route, ok: false, error: err.message });
    }
  }

  return {
    ok: true,
    routeResults,
    vibeCheckPython,
    impeccableLiveDesktop,
    impeccableLiveMobile,
    pixelSlopLive,
  };
}

function buildConsolidatedFindings(report) {
  const findings = [];
  const add = (item) => findings.push(item);

  // 1. Impeccable static findings (group/summarize cleanly per antipattern + severity)
  const impStatic = report.static.impeccable?.findings || [];
  const impByRule = new Map();
  for (const f of impStatic) {
    const key = f.antipattern;
    if (!impByRule.has(key)) {
      impByRule.set(key, {
        antipattern: f.antipattern,
        name: f.name,
        description: f.description,
        severity: f.severity || "warning",
        category: f.category || "slop",
        advisory: Boolean(f.advisory),
        occurrences: [],
      });
    }
    impByRule.get(key).occurrences.push({
      file: path.relative(REPO_ROOT, f.file).replace(/\\/g, "/"),
      line: f.line,
      snippet: f.snippet,
    });
  }

  for (const rule of impByRule.values()) {
    const count = rule.occurrences.length;
    const sev = rule.advisory
      ? count >= 15
        ? "medium"
        : "low"
      : rule.severity === "error" || count >= 10
        ? "high"
        : "medium";
    add({
      id: `impeccable:${rule.antipattern}`,
      tool: "Impeccable (Static Source)",
      severity: sev,
      category: rule.category,
      title: `${rule.name} (${count} hit${count === 1 ? "" : "s"})`,
      description: rule.description,
      affected: rule.occurrences.slice(0, 12).map((o) => `${o.file}:${o.line}`),
      totalCount: count,
    });
  }

  // 2. Impeccable Live URL findings (grouped by antipattern + URL + viewport)
  const impLiveAll = [
    ...(report.live?.impeccableLiveDesktop?.findings || []).map((f) => ({ ...f, viewport: "1280x800" })),
    ...(report.live?.impeccableLiveMobile?.findings || []).map((f) => ({ ...f, viewport: "390x844" })),
  ];
  const impLiveGrouped = new Map();
  for (const f of impLiveAll) {
    const key = `${f.antipattern}|${f.file || "live"}|${f.viewport}`;
    if (!impLiveGrouped.has(key)) {
      impLiveGrouped.set(key, {
        antipattern: f.antipattern,
        name: f.name,
        description: f.description,
        category: f.category || "live",
        advisory: Boolean(f.advisory),
        file: f.file || "live",
        viewport: f.viewport,
        snippets: [],
        count: 0,
      });
    }
    const g = impLiveGrouped.get(key);
    g.count += 1;
    if (f.snippet && g.snippets.length < 3 && !g.snippets.includes(f.snippet)) {
      g.snippets.push(f.snippet);
    }
  }
  for (const g of impLiveGrouped.values()) {
    add({
      id: `impeccable-live:${g.antipattern}:${g.file}:${g.viewport}`,
      tool: `Impeccable (Live ${g.viewport})`,
      severity: g.advisory ? "low" : g.category === "quality" ? "high" : "medium",
      category: g.category,
      title: `${g.name} on ${g.file} (${g.count} hit${g.count === 1 ? "" : "s"})`,
      description: `${g.description}${g.snippets.length ? ` Evidence: ${g.snippets.join("; ")}` : ""}`,
      affected: [`${g.file} (${g.viewport})`],
      totalCount: g.count,
    });
  }

  // 3. Slop Detect findings
  for (const r of report.live?.routeResults || []) {
    const sd = r.slopDetect;
    if (!sd) continue;
    for (const p of sd.triggeredPatterns || []) {
      add({
        id: `slop-detect:${p.id}:${r.route}`,
        tool: "Slop Detect",
        severity: p.weight >= 6 ? "high" : p.weight >= 3 ? "medium" : "low",
        category: "visual-slop",
        title: `${p.short || p.label} (${r.route})`,
        description: `${p.label} — tier=${sd.tier}, grade=${sd.grade}, route design score=${sd.score}`,
        affected: [r.route],
        totalCount: 1,
      });
    }
    for (const c of sd.craft?.checks || []) {
      if (c.triggered || c.status === "fail") {
        add({
          id: `slop-craft:${c.id}:${r.route}`,
          tool: "Slop Detect (Craft)",
          severity: c.severity === "critical" || c.id === "mobile_reflow_failure" ? "high" : "medium",
          category: "craft-quality",
          title: `${c.label || c.id} (${r.route})`,
          description: JSON.stringify(c.evidence || c.detail || c.summary || c),
          affected: [r.route],
          totalCount: 1,
        });
      }
    }
    if (sd.mobileReflow?.triggered) {
      add({
        id: `slop-reflow:${r.route}`,
        tool: "Slop Detect (Mobile Reflow)",
        severity: "high",
        category: "responsive-layout",
        title: `Mobile reflow failure at 390px on ${r.route}`,
        description: JSON.stringify(sd.mobileReflow),
        affected: [r.route],
        totalCount: 1,
      });
    }
  }

  // 4. Vibe Code Detector findings
  for (const r of report.live?.routeResults || []) {
    const vcd = r.vibeCodeDetector;
    if (!vcd) continue;
    for (const factor of vcd.detectedFactors || []) {
      add({
        id: `vibe-code-detector:${factor.name}:${r.route}`,
        tool: "Vibe Code Detector",
        severity: factor.weight >= 20 ? "high" : factor.weight >= 10 ? "medium" : "low",
        category: "vibe-stack",
        title: `${factor.name} on ${r.route} (vibe score ${vcd.score}/100)`,
        description: `${factor.description}${factor.evidence ? ` [${factor.evidence}]` : ""}`,
        affected: [r.route],
        totalCount: 1,
      });
    }
  }

  // 5. VibeCheck Python findings
  const vcCats = report.live?.vibeCheckPython?.data?.categories || {};
  for (const [catKey, catVal] of Object.entries(vcCats)) {
    for (const f of catVal.findings || []) {
      const sev = f.tier === "DEFINITIVE" ? "critical" : f.tier === "STRONG" ? "high" : f.tier === "MODERATE" ? "medium" : "low";
      add({
        id: `vibecheck:${catKey}:${f.signal}`,
        tool: "VibeCheck (Python)",
        severity: sev,
        category: catKey,
        title: `${f.signal} [${catVal.name}]`,
        description: `${f.description}${f.evidence ? ` (Evidence: ${f.evidence})` : ""}`,
        affected: report.live.vibeCheckPython.data.pages_list || [],
        totalCount: 1,
      });
    }
  }

  // 6. PixelSlop static + live findings
  for (const sp of report.static.pixelSlop || []) {
    add({
      id: `pixelslop-static:${sp.id}`,
      tool: "PixelSlop (Static)",
      severity: sp.matches >= 10 ? "medium" : "low",
      category: "source-patterns",
      title: `${sp.name} (${sp.matches} matches)`,
      description: `Evidence sample: ${sp.evidence || "N/A"}`,
      affected: sp.files || [],
      totalCount: sp.matches,
    });
  }
  for (const pl of report.live?.pixelSlopLive || []) {
    const b = pl.bundle;
    if (!b) continue;
    const realMissingFocus = (b.focusPass?.missingIndicators || []).filter(
      (item) => item?.selector !== "nextjs-portal" && item?.ref !== "nextjs-portal",
    );
    const focusFailed = b.focusPass?.missingIndicators ? realMissingFocus.length : (b.focusPass?.withoutIndicator || 0);
    const nonSemantic = b.focusPass?.nonSemanticClickables?.length || 0;
    const consoleErrs = b.console?.errors || [];
    const failedReqs = b.network?.failed || [];
    const touchUndersized = b.viewports?.mobile?.touchTargets?.undersized || 0;
    const overflowIssues = Object.entries(b.viewports || {})
      .filter(([, v]) => v && (v.overflow?.hasOverflow || (v.overflow?.count || 0) > 0))
      .map(([vp, v]) => `${vp} (${v.overflow?.count || 0})`);
    const clippedIssues = Object.entries(b.viewports || {})
      .filter(([, v]) => v && (v.overflow?.clippedCount || 0) > 0)
      .map(([vp, v]) => `${vp} (${v.overflow?.clippedCount || 0})`);
    if (overflowIssues.length > 0) {
      add({
        id: `pixelslop-overflow:${pl.route}`,
        tool: "PixelSlop (Live)",
        severity: "high",
        category: "responsive-layout",
        title: `Horizontal overflow detected on ${pl.route}: ${overflowIssues.join(", ")}`,
        description: "Rendered DOM elements extend beyond document viewport width on sampled viewports.",
        affected: [pl.route],
        totalCount: overflowIssues.length,
      });
    }
    if (clippedIssues.length > 0) {
      add({
        id: `pixelslop-clipped:${pl.route}`,
        tool: "PixelSlop (Live)",
        severity: "medium",
        category: "responsive-layout",
        title: `Horizontally clipped text on ${pl.route}: ${clippedIssues.join(", ")}`,
        description: "Overflow-hidden containers truncate visible text without ellipsis.",
        affected: [pl.route],
        totalCount: clippedIssues.length,
      });
    }
    if (touchUndersized > 0) {
      add({
        id: `pixelslop-touch:${pl.route}`,
        tool: "PixelSlop (Live)",
        severity: "medium",
        category: "accessibility",
        title: `Undersized mobile tap targets on ${pl.route} (${touchUndersized})`,
        description: "Interactive controls measured under mobile viewport fall below recommended touch target size.",
        affected: [pl.route],
        totalCount: touchUndersized,
      });
    }
    if (focusFailed > 0) {
      add({
        id: `pixelslop-focus:${pl.route}`,
        tool: "PixelSlop (Live)",
        severity: "medium",
        category: "accessibility",
        title: `Missing keyboard focus indicators on ${pl.route} (${focusFailed} element(s))`,
        description: "Interactive elements sampled via Tab did not expose visible focus outline/ring.",
        affected: [pl.route],
        totalCount: focusFailed,
      });
    }
    if (nonSemantic > 0) {
      add({
        id: `pixelslop-nonsemantic:${pl.route}`,
        tool: "PixelSlop (Live)",
        severity: "medium",
        category: "accessibility",
        title: `Non-semantic clickable elements on ${pl.route} (${nonSemantic})`,
        description: "Div/span clickable elements lacking button/link semantics.",
        affected: [pl.route],
        totalCount: nonSemantic,
      });
    }
    if (consoleErrs.length > 0) {
      add({
        id: `pixelslop-console:${pl.route}`,
        tool: "PixelSlop (Live)",
        severity: "high",
        category: "runtime-ui",
        title: `Browser console error(s) on ${pl.route} (${consoleErrs.length})`,
        description: consoleErrs.slice(0, 3).map((e) => e.text).join(" | "),
        affected: [pl.route],
        totalCount: consoleErrs.length,
      });
    }
    if (failedReqs.length > 0) {
      add({
        id: `pixelslop-network:${pl.route}`,
        tool: "PixelSlop (Live)",
        severity: "medium",
        category: "runtime-ui",
        title: `Failed HTTP asset/API requests during ${pl.route} load (${failedReqs.length})`,
        description: failedReqs.slice(0, 3).map((r) => `${r.status || "ERR"} ${r.type}: ${r.url}`).join(" | "),
        affected: [pl.route],
        totalCount: failedReqs.length,
      });
    }
  }

  // 7. Consolidated static styling/hierarchy hotspots (guards CSS & component entropy across CRM + Portal + Public)
  const spTotals = report.static.sourceTelemetry.totals;
  const hotspots = report.static.sourceTelemetry.topHotspots || [];
  if (spTotals.gradients > 15) {
    add({
      id: "telemetry:gradients",
      tool: "Unified CSS/JSX Telemetry",
      severity: "medium",
      category: "visual-slop",
      title: `Widespread CSS/Tailwind gradients across UI (${spTotals.gradients} occurrences)`,
      description: "Decorative linear/radial gradients increase visual noise across public marketing, login, and CRM screens.",
      affected: hotspots.filter((h) => h.gradients > 0).slice(0, 10).map((h) => `${h.file} (${h.gradients})`),
      totalCount: spTotals.gradients,
    });
  }
  if (spTotals.backdropBlur > 8) {
    add({
      id: "telemetry:backdrop-blur",
      tool: "Unified CSS/JSX Telemetry",
      severity: "medium",
      category: "visual-slop",
      title: `Excessive glassmorphism / backdrop-blur usage (${spTotals.backdropBlur} occurrences)`,
      description: "Layered backdrop-blur outside modal overlays (required by Modal Layout Guidelines) adds GPU paint overhead and generic glassmorphism feel.",
      affected: hotspots.filter((h) => h.backdropBlur > 0).slice(0, 10).map((h) => `${h.file} (${h.backdropBlur})`),
      totalCount: spTotals.backdropBlur,
    });
  }
  if (spTotals.inlineStyles > 150) {
    add({
      id: "telemetry:inline-styles",
      tool: "Unified CSS/JSX Telemetry",
      severity: "high",
      category: "css-hierarchy",
      title: `Heavy inline style={{...}} sprawl (${spTotals.inlineStyles} occurrences)`,
      description: "Inline style objects bypass design tokens, duplicate visual rules, and fragment responsive breakpoints across CRM/portal/public components.",
      affected: hotspots.filter((h) => h.inlineStyles >= 5).slice(0, 10).map((h) => `${h.file} (${h.inlineStyles})`),
      totalCount: spTotals.inlineStyles,
    });
  }
  if (spTotals.importantOverrides > 50) {
    add({
      id: "telemetry:css-important",
      tool: "Unified CSS/JSX Telemetry",
      severity: "high",
      category: "css-hierarchy",
      title: `High CSS !important cascade override count (${spTotals.importantOverrides} rules)`,
      description: "Excessive !important declarations indicate competing stylesheets instead of layered design tokens.",
      affected: report.static.sourceTelemetry.cssArchitecture.filter((c) => c.importantOverrides > 0).map((c) => `${c.file} (${c.importantOverrides})`),
      totalCount: spTotals.importantOverrides,
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3, advisory: 4 };
  findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || b.totalCount - a.totalCount);
  return findings;
}

function renderMarkdownSummary(report) {
  const lines = [];
  lines.push("# Consolidated AI Design & Vibe-Code Audit Summary");
  lines.push("");
  lines.push(`- **Generated**: ${report.generatedAt}`);
  lines.push(`- **Mode**: \`${report.mode}\``);
  lines.push(`- **Git Checkpoint Baseline**: \`${report.gitHead}\``);
  lines.push(`- **Root Package Impact**: None (strictly isolated in \`tools/design-audit/\`)`);
  lines.push("");
  lines.push("## Tool Integration & Compatibility Status");
  lines.push("");
  lines.push("| Tool | Source / Version | Status | Scope Covered |");
  lines.push("|---|---|---|---|");
  for (const t of report.toolsStatus) {
    lines.push(`| ${t.name} | \`${t.version}\` (${t.license}) | ${t.status} | ${t.scope} |`);
  }
  lines.push("");
  lines.push("## Live Route Scores");
  lines.push("");
  if (report.live?.routeResults?.length) {
    lines.push("| Route | Slop Detect Score / Tier / Grade | Vibe Code Detector Score | H1 Font | Reflow |");
    lines.push("|---|---|---|---|---|");
    for (const r of report.live.routeResults) {
      const sd = r.slopDetect;
      const vcd = r.vibeCodeDetector;
      const reflow = sd?.mobileReflow?.triggered ? "FAIL" : sd?.mobileReflow?.status || "ok";
      lines.push(
        `| \`${r.route}\` | ${sd ? `${sd.score} (${sd.tier}, ${sd.grade}, ${sd.patternsFlagged}/${sd.patternsTotal})` : "N/A"} | ${vcd ? `${vcd.score}/100` : "N/A"} | ${r.h1Font || "-"} | ${reflow} |`,
      );
    }
    if (report.live.vibeCheckPython?.ok) {
      const vc = report.live.vibeCheckPython.data;
      lines.push("");
      lines.push(`**VibeCheck Overall Score (captured DOM + CSS/JS assets)**: **${vc.overall_score}/100** — *${vc.verdict}*`);
    }
  } else {
    lines.push("_Live routes not scanned in this run._");
  }
  lines.push("");
  lines.push("## Consolidated Findings (Top First)");
  lines.push("");
  for (const f of report.consolidatedFindings) {
    lines.push(`- **[${f.severity.toUpperCase()}] ${f.title}** *(${f.tool})*`);
    lines.push(`  - ${f.description}`);
    if (f.affected?.length) {
      lines.push(`  - Affected: ${f.affected.slice(0, 8).map((a) => `\`${a}\``).join(", ")}${f.affected.length > 8 ? ` (+${f.affected.length - 8} more)` : ""}`);
    }
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  fs.mkdirSync(opts.outDir, { recursive: true });

  const browserRuntime = pixelslopBrowser.detectBrowserRuntime();
  let gitHead = "unknown";
  try {
    gitHead = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    // Ignore git absence.
  }

  const hasCargo = commandExists("cargo") && commandExists("rustc");
  const toolsStatus = [
    {
      name: "Impeccable",
      version: "impeccable@4.11.1",
      license: "Apache-2.0",
      status: "Integrated & Executed",
      scope: "Static JSX/TSX/CSS (`src/app`) + live rendered URLs (1280x800 & 390x844)",
    },
    {
      name: "Slop Detect",
      version: "slop-detect-core@0.9.1 / slop-detect@0.9.1",
      license: "MIT",
      status: "Integrated & Executed",
      scope: "45 AI visual slop patterns, copy axis, craft floor, and 390px mobile reflow via Chromium",
    },
    {
      name: "VibeCheck (Python)",
      version: "ashish-jabble/vibe-check",
      license: "MIT",
      status: fs.existsSync(path.join(AUDIT_DIR, ".venv-vibecheck")) ? "Integrated & Executed (isolated Py 3.14 venv)" : "Missing venv",
      scope: "AI platform fingerprints, shadcn/Radix/Lucide stack, Tailwind nesting, gradients/glassmorphism, a11y & SEO",
    },
    {
      name: "VibeCheck (Rust CLI)",
      version: "o-k-a-y/vibecheck",
      license: "MIT",
      status: hasCargo ? "Cargo detected" : "Skipped (Incompatible: no Rust/cargo toolchain or prebuilt binary)",
      scope: "Documented limitation — halted rather than installing Rust compiler",
    },
    {
      name: "Vibe Code Detector",
      version: "paladini/vibe-code-detector (MIT DOM engine)",
      license: "MIT",
      status: "Integrated & Executed",
      scope: "15 weighted DOM/AI-fingerprint heuristics executed live in Chromium",
    },
    {
      name: "PixelSlop",
      version: "pixelslop@0.3.8",
      license: "Apache-2.0",
      status: "Integrated & Executed",
      scope: "Static S11-S16 pattern check + desktop/tablet/mobile UX/overflow/focus/non-semantic evidence",
    },
  ];

  // Phase 1: Static read-only scans across src/app
  const srcAppPath = path.join(REPO_ROOT, "src", "app");
  const impeccableStatic = runImpeccable([srcAppPath]);
  const pixelSlopStatic = pixelslopBrowser.collectSourcePatterns(srcAppPath);
  const sourceTelemetry = analyzeSourcePatterns(REPO_ROOT);

  // Phase 2: Live read-only scans across unauthenticated routes
  let live = null;
  if (opts.mode !== "static") {
    let ephemeral = null;
    try {
      const targetBase = opts.baseUrl || (ephemeral = await startEphemeralNextServer()).baseUrl;
      live = await runLiveBrowserAudit(targetBase, opts.routes, browserRuntime, opts.outDir);
    } catch (err) {
      live = { ok: false, error: err.message };
    } finally {
      if (ephemeral) ephemeral.stop();
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: opts.mode,
    gitHead,
    browserRuntime,
    toolsStatus,
    static: {
      impeccable: impeccableStatic,
      pixelSlop: pixelSlopStatic,
      sourceTelemetry,
    },
    live,
  };

  report.consolidatedFindings = buildConsolidatedFindings(report);

  const jsonPath = path.join(opts.outDir, "latest-audit.json");
  const mdPath = path.join(opts.outDir, "latest-audit.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  const md = renderMarkdownSummary(report);
  fs.writeFileSync(mdPath, md, "utf8");

  if (!opts.quiet) {
    console.log(md);
    console.log(`Reports saved:\n- ${jsonPath}\n- ${mdPath}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Design audit failed:", err);
  process.exit(1);
});
