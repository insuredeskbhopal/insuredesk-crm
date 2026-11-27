/**
 * Read-only static styling, AI-design tell, and visual hierarchy scanner for Next.js UI sources.
 * Never edits files; inspects src/app and optional summary metrics for BHQ.
 */

import fs from "fs";
import path from "path";

const UI_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".scss"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "api"]);

function walkFiles(dirPath, predicate = () => true) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  function recurse(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) recurse(fullPath);
        continue;
      }
      if (predicate(fullPath, entry.name)) results.push(fullPath);
    }
  }

  recurse(dirPath);
  return results;
}

function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function extractLineMatches(lines, regex, maxSamples = 5) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    if (regex.test(lines[i])) {
      hits.push({ line: i + 1, snippet: lines[i].trim().slice(0, 140) });
      if (hits.length >= maxSamples) break;
    }
  }
  return hits;
}

export function analyzeSourcePatterns(repoRoot) {
  const srcAppDir = path.join(repoRoot, "src", "app");
  const files = walkFiles(srcAppDir, (fullPath) => {
    const ext = path.extname(fullPath);
    if (!UI_EXTENSIONS.has(ext)) return false;
    // Skip API route handlers so we only measure UI pages, components, and CSS.
    const rel = path.relative(srcAppDir, fullPath).replace(/\\/g, "/");
    return !rel.startsWith("api/");
  });

  const perFile = [];
  const totals = {
    filesScanned: files.length,
    cssFiles: 0,
    totalLines: 0,
    gradients: 0,
    backdropBlur: 0,
    lucideImports: 0,
    inlineStyles: 0,
    importantOverrides: 0,
    hardcodedHexLiterals: 0,
    emojiInUiText: 0,
    genericPlaceholders: 0,
    overusedFontDeclarations: 0,
    sideAccentBorders: 0,
    nestedModalOrCardIndicators: 0,
  };

  for (const absPath of files) {
    const relPath = path.relative(repoRoot, absPath).replace(/\\/g, "/");
    const ext = path.extname(absPath);
    const content = fs.readFileSync(absPath, "utf8");
    const lines = content.split(/\r?\n/);
    const isCss = ext === ".css" || ext === ".scss";
    if (isCss) totals.cssFiles++;
    totals.totalLines += lines.length;

    const gradients = countMatches(content, /(?:linear-gradient|radial-gradient|conic-gradient|bg-gradient-to-)/g);
    const backdropBlur = countMatches(content, /(?:backdrop-filter\s*:|backdrop-blur)/g);
    const lucideImports = countMatches(content, /from\s+["']lucide-react["']/g);
    const inlineStyles = isCss ? 0 : countMatches(content, /\bstyle=\{\{/g);
    const importantOverrides = isCss ? countMatches(content, /!important\b/g) : 0;
    const hardcodedHexLiterals = countMatches(content, /#[0-9a-fA-F]{3,8}\b/g);
    const overusedFonts = countMatches(content, /\b(?:Inter|Plus Jakarta Sans|Space Grotesk|Geist)\b/g);
    const sideAccentBorders = countMatches(content, /(?:border-left\s*:\s*[3-9]px|border-l-[248])/g);
    const genericPlaceholders = countMatches(
      content,
      /(?:Lorem ipsum|Coming soon|Revolutionize|Supercharge your|Enterprise-grade|Unlock the power)/gi,
    );
    const emojiHits = isCss ? 0 : countMatches(content, /[\u{1F300}-\u{1FAFF}]/gu);

    totals.gradients += gradients;
    totals.backdropBlur += backdropBlur;
    totals.lucideImports += lucideImports;
    totals.inlineStyles += inlineStyles;
    totals.importantOverrides += importantOverrides;
    totals.hardcodedHexLiterals += hardcodedHexLiterals;
    totals.overusedFontDeclarations += overusedFonts;
    totals.sideAccentBorders += sideAccentBorders;
    totals.genericPlaceholders += genericPlaceholders;
    totals.emojiInUiText += emojiHits;

    const weightScore =
      gradients * 3 +
      backdropBlur * 4 +
      importantOverrides * 1.5 +
      Math.floor(inlineStyles / 3) * 2 +
      sideAccentBorders * 3 +
      overusedFonts * 4 +
      genericPlaceholders * 5;

    if (
      gradients > 0 ||
      backdropBlur > 0 ||
      inlineStyles >= 5 ||
      importantOverrides >= 5 ||
      sideAccentBorders > 0 ||
      overusedFonts > 0 ||
      genericPlaceholders > 0 ||
      lines.length >= 900
    ) {
      perFile.push({
        file: relPath,
        lines: lines.length,
        gradients,
        backdropBlur,
        lucideImports,
        inlineStyles,
        importantOverrides,
        hardcodedHexLiterals,
        overusedFonts,
        sideAccentBorders,
        genericPlaceholders,
        emojiHits,
        weightScore,
        samples: {
          gradients: extractLineMatches(lines, /(?:linear-gradient|radial-gradient|conic-gradient|bg-gradient-to-)/g, 3),
          backdropBlur: extractLineMatches(lines, /(?:backdrop-filter\s*:|backdrop-blur)/g, 3),
          overusedFonts: extractLineMatches(lines, /\b(?:Inter|Plus Jakarta Sans|Space Grotesk|Geist)\b/g, 3),
          importantOverrides: isCss ? extractLineMatches(lines, /!important\b/g, 3) : [],
        },
      });
    }
  }

  perFile.sort((a, b) => b.weightScore - a.weightScore || b.lines - a.lines);

  // Check CSS cascade overlap across src/app styles.
  const cssArchitecture = perFile
    .filter((f) => f.file.endsWith(".css"))
    .map((f) => ({
      file: f.file,
      lines: f.lines,
      importantOverrides: f.importantOverrides,
      hardcodedHexLiterals: f.hardcodedHexLiterals,
      gradients: f.gradients,
      backdropBlur: f.backdropBlur,
    }));

  // Lightweight read-only summary for Flutter BHQ app if present.
  const bhqLibDir = path.join(repoRoot, "BHQ", "lib");
  let bhqSummary = null;
  if (fs.existsSync(bhqLibDir)) {
    const dartFiles = walkFiles(bhqLibDir, (p) => p.endsWith(".dart"));
    let dartGradients = 0;
    let dartHardcodedColors = 0;
    for (const df of dartFiles) {
      const txt = fs.readFileSync(df, "utf8");
      dartGradients += countMatches(txt, /\bLinearGradient\b|\bRadialGradient\b/g);
      dartHardcodedColors += countMatches(txt, /\bColor\(0x[0-9a-fA-F]{8}\)/g);
    }
    bhqSummary = {
      dartFiles: dartFiles.length,
      gradientCount: dartGradients,
      hardcodedColorLiterals: dartHardcodedColors,
    };
  }

  return {
    totals,
    topHotspots: perFile.slice(0, 25),
    cssArchitecture,
    bhqSummary,
  };
}
