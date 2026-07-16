/* @vitest-environment node */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  trainers,
  deriveTrainingScope,
  selectScopedTraining,
  applyScopedTraining,
} = require("../src/lib/policies/pdf/training/registry.cjs");

const originalTrainerCount = trainers.length;
const endorsementText = "TATA AIG Business Guard Warehouse ENDORSEMENT change in sum insured";

afterEach(() => trainers.splice(originalTrainerCount));

describe("PDF extraction training isolation", () => {
  it.each([
    ["ICICI Lombard General Insurance Company Limited", "Motor Insurance", "icici-lombard", "motor"],
    ["ICICI Lombard General Insurance Company Limited", "Fire Insurance", "icici-lombard", "fire"],
    ["Tata AIG General Insurance Company Limited", "Warehouse Insurance", "tata-aig", "warehouse"],
    ["IFFCO Tokio General Insurance Company Limited", "Workmen Compensation Insurance", "iffco-tokio", "workmen-compensation"],
  ])("derives the exact insurer/category scope", (insuranceCompany, documentCategory, insurer, category) => {
    expect(deriveTrainingScope({ insuranceCompany, documentCategory })).toEqual({ insurer, category });
  });

  it("selects training only for the exact insurer and category", () => {
    const tataWarehouse = {
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      documentCategory: "Warehouse Insurance",
    };
    const tataMotor = { ...tataWarehouse, documentCategory: "Motor Insurance" };
    const iciciWarehouse = {
      ...tataWarehouse,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
    };

    expect(selectScopedTraining(tataWarehouse, { text: endorsementText })).toHaveLength(1);
    expect(selectScopedTraining(tataMotor, { text: endorsementText })).toHaveLength(0);
    expect(selectScopedTraining(iciciWarehouse, { text: endorsementText })).toHaveLength(0);
  });

  it("leaves another category of the same insurer and another insurer unchanged", () => {
    const tataMotor = {
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      companyName: "Tata AIG General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "TATA_AIG_MOTOR_V1",
      policyNumber: "MOTOR-1",
    };
    const iciciWarehouse = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Warehouse Insurance",
      documentFormat: "ICICI_WAREHOUSE_V1",
      policyNumber: "FIRE-1",
    };

    expect(applyScopedTraining(tataMotor, { text: endorsementText })).toEqual(tataMotor);
    expect(applyScopedTraining(iciciWarehouse, { text: endorsementText })).toEqual(iciciWarehouse);
  });

  it("prevents a trainer from changing its insurer or category identity", () => {
    trainers.push({
      scope: { insurer: "icici-lombard", category: "fire" },
      train: () => ({
        insuranceCompany: "Tata AIG General Insurance Company Limited",
        documentCategory: "Motor Insurance",
        documentFormat: "TATA_AIG_MOTOR_V1",
        trainedField: "allowed",
      }),
    });
    const original = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Fire Insurance",
      documentFormat: "ICICI_FIRE_V1",
      sourceDocumentType: "ICICI_FIRE_V1",
    };

    expect(applyScopedTraining(original)).toMatchObject({
      ...original,
      trainedField: "allowed",
    });
  });

  it("falls back to the unchanged extraction when a scoped trainer crashes", () => {
    trainers.push({
      scope: { insurer: "icici-lombard", category: "marine" },
      train: () => {
        throw new Error("broken training");
      },
    });
    const original = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Marine Insurance",
      policyNumber: "MARINE-1",
    };
    const result = applyScopedTraining(original);

    expect(result).toMatchObject(original);
    expect(result.extractionTrainingWarnings).toEqual([
      "icici-lombard/marine: broken training",
    ]);
  });

  it("ignores a broken scope matcher without crashing extraction", () => {
    trainers.push({
      scope: { insurer: "icici-lombard", category: "health" },
      matches: () => {
        throw new Error("broken matcher");
      },
      train: () => ({ shouldNotExist: true }),
    });
    const original = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Health Insurance",
      policyNumber: "HEALTH-1",
    };

    expect(applyScopedTraining(original)).toEqual(original);
  });

  it("keeps every training module in its own folder and free of cross-scope imports", () => {
    const root = path.resolve("src/lib/policies/pdf/training");
    const files = fs
      .readdirSync(root, { recursive: true })
      .filter((entry) => entry.endsWith(".cjs") && entry !== "registry.cjs")
      .map((entry) => path.join(root, entry));
    const seenScopes = new Set();

    for (const file of files) {
      const relative = path.relative(root, file).replace(/\\/g, "/");
      const [insurer, categoryFile] = relative.split("/");
      const category = categoryFile.replace(/\.cjs$/, "");
      const trainingModule = require(file);
      const source = fs.readFileSync(file, "utf8");
      const scopeKey = `${trainingModule.scope.insurer}/${trainingModule.scope.category}`;

      expect(trainingModule.scope).toEqual({ insurer, category });
      expect(seenScopes.has(scopeKey)).toBe(false);
      expect(source).not.toMatch(/require\([^)]*(?:parsers|schemas|utils\/motor|training\/)/i);
      seenScopes.add(scopeKey);
    }

    expect(files).not.toHaveLength(0);
  });
});
