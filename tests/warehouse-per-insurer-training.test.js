/* @vitest-environment node */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const {
  deriveTrainingScope,
  selectScopedTraining,
} = require("../src/lib/policies/pdf/training/registry.cjs");

const iciciWarehouseTrainer = require("../src/lib/policies/pdf/training/icici-lombard/warehouse.cjs");
const iffcoWarehouseTrainer = require("../src/lib/policies/pdf/training/iffco-tokio/warehouse.cjs");
const bajajWarehouseTrainer = require("../src/lib/policies/pdf/training/bajaj-allianz/warehouse.cjs");
const tataWarehouseTrainer = require("../src/lib/policies/pdf/training/tata-aig/warehouse.cjs");
const unitedWarehouseTrainer = require("../src/lib/policies/pdf/training/united-india/warehouse.cjs");

const WAREHOUSE_DIR = "storage/BimaHeadquarter Uploads/Warehouse";

describe("Per-Insurer Warehouse Training Isolation & Corpus Verification", () => {
  it("routes each insurer's warehouse documents strictly to its own warehouse module", () => {
    const cases = [
      {
        trainer: iciciWarehouseTrainer,
        scope: { insurer: "icici-lombard", category: "warehouse" },
        result: { insuranceCompany: "ICICI Lombard General Insurance Company Limited", documentCategory: "Fire Insurance" },
        text: "ICICI Lombard General Insurance MSME Suraksha Kavach Package Policy 1030/451873903/00/000 EXAMPLE WAREHOUSE A/C MPWLC",
      },
      {
        trainer: iffcoWarehouseTrainer,
        scope: { insurer: "iffco-tokio", category: "warehouse" },
        result: { insuranceCompany: "IFFCO Tokio General Insurance Company Limited", documentCategory: "Warehouse Insurance" },
        text: "IFFCO-TOKIO GENERAL INSURANCE CO. LTD FLEXI PROPERTY PROTECTOR EXAMPLE WAREHOUSE A/C MPWLC",
      },
      {
        trainer: bajajWarehouseTrainer,
        scope: { insurer: "bajaj-allianz", category: "warehouse" },
        result: { insuranceCompany: "Bajaj Allianz General Insurance Company Limited", documentCategory: "Warehouse Insurance" },
        text: "Bajaj General Insurance Limited FIDELITYGUARANTEEINSURANCEPOLICY GURU KRIPA WAREHOUSE A/C MPWLC",
      },
      {
        trainer: tataWarehouseTrainer,
        scope: { insurer: "tata-aig", category: "warehouse" },
        result: { insuranceCompany: "Tata AIG General Insurance Company Limited", documentCategory: "Warehouse Insurance" },
        text: "TATA AIG Business Guard Laghu Package Policy KAMALGURU WAREHOUSE",
      },
      {
        trainer: unitedWarehouseTrainer,
        scope: { insurer: "united-india", category: "warehouse" },
        result: { insuranceCompany: "United India Insurance Company Limited", documentCategory: "Warehouse Insurance" },
        text: "UNITED INDIA INSURANCE COMPANY LIMITED UNITED VALUE UDYAM SURAKSHA POLICY",
      },
    ];

    for (const tc of cases) {
      expect(deriveTrainingScope(tc.result, { text: tc.text })).toEqual(tc.scope);
      const selected = selectScopedTraining(tc.result, { text: tc.text });
      expect(selected).toContain(tc.trainer);
      expect(selected).toHaveLength(1);
    }
  });

  it("never selects warehouse trainers for motor, health, or non-warehouse fire/CPM policies", () => {
    const nonWarehouseSamples = [
      {
        desc: "ICICI Motor",
        res: { insuranceCompany: "ICICI Lombard General Insurance Company Limited", documentCategory: "Motor Insurance" },
        text: "ICICI Lombard Private Car Package Policy Registration No MP04AB1234 Total IDV 500000",
      },
      {
        desc: "IFFCO Non-Warehouse Dal Mill Fire",
        res: { insuranceCompany: "IFFCO Tokio General Insurance Company Limited", documentCategory: "Fire Insurance" },
        text: "IFFCO-TOKIO FLEXI PROPERTY PROTECTOR SHRI RAM DAL MILL",
      },
      {
        desc: "IFFCO CPM",
        res: { insuranceCompany: "IFFCO Tokio General Insurance Company Limited", documentCategory: "Contractors Plant & Machinery" },
        text: "IFFCO-TOKIO Contractors Plant and Machinery Policy VIJAY KUMAR MISHRA",
      },
      {
        desc: "Bajaj Shop Fire (non-warehouse)",
        res: { insuranceCompany: "Bajaj Allianz General Insurance Company Limited", documentCategory: "Fire Insurance" },
        text: "BAJAJ ALLIANZ SHOP NON HAZARDOUS OG-26-2301-4056-00001234",
      },
      {
        desc: "Tata AIG Motor",
        res: { insuranceCompany: "Tata AIG General Insurance Company Limited", documentCategory: "Motor Insurance" },
        text: "TATA AIG Auto Secure Private Car Chassis No ABC123",
      },
    ];

    const warehouseTrainers = [
      iciciWarehouseTrainer,
      iffcoWarehouseTrainer,
      bajajWarehouseTrainer,
      tataWarehouseTrainer,
      unitedWarehouseTrainer,
    ];

    for (const sample of nonWarehouseSamples) {
      const selected = selectScopedTraining(sample.res, { text: sample.text });
      for (const wt of warehouseTrainers) {
        expect(selected, `${sample.desc} must not select ${wt.scope.insurer}/warehouse`).not.toContain(wt);
      }
    }
  });

  it("fixes key edge cases discovered across the 324 warehouse PDF corpus", async () => {
    const checkPdf = async (relPath, assertions) => {
      const fullPath = path.join(WAREHOUSE_DIR, relPath);
      if (!fs.existsSync(fullPath)) return;
      const parsed = await pdf(fs.readFileSync(fullPath));
      const res = extractPolicyFromText(parsed.text || "", fullPath);
      assertions(res);
    };

    // 1. ICICI short-address policy must not bleed Dispatch Advice letter into insuredName
    await checkPdf("ICICI Lombard/MSME Suraksha Kavach/BHARATMATA 107 STOCK_26-27.pdf", (res) => {
      expect(res.insuredName).toBe("BHARATMATA107 INDUSTRIES PRIVATE LIMITED");
      expect(res.policyNumber).toBe("1030/409257954/01/000");
      expect(res.extractionTrainingVersion).toMatch(/^ICICI_LOMBARD_WAREHOUSE/);
    });

    // 2. ICICI pincode fallback when Premises omits pincode
    await checkPdf("ICICI Lombard/MSME Suraksha Kavach/MS SHANTI WAREHOUSE POLICY.pdf", (res) => {
      expect(res.pincode).toBe("475335");
      expect(res.district).toBe("DATIA");
    });

    // 3. IFFCO Burglary missing district ("Narsimhapur" without "DISTRICT" prefix) + pincode
    await checkPdf("IFFCO Tokio/Burglary/MS RATHI WAREHOUSE AC MPWLC BURGALRY.pdf", (res) => {
      expect(res.district).toBe("NARSIMHAPUR");
      expect(res.pincode).toBe("487551");
      expect(res.extractionTrainingVersion).toBe("IFFCO_TOKIO_WAREHOUSE_TRAINING_V1");
    });

    // 4. IFFCO Burglary Endorsement Policy Inception/Expiry Dates + pincode
    await checkPdf("IFFCO Tokio/Burglary/SHRI MOOLCHAND JI WAREHOUSE AC MPWLC - BURGLARY  ENDORSEMENT (1).pdf", (res) => {
      expect(res.startDate).toBe("08/06/2026");
      expect(res.expiryDate).toBe("07/06/2027");
      expect(res.pincode).toBe("466331");
      expect(res.extractionTrainingVersion).toBe("IFFCO_TOKIO_WAREHOUSE_TRAINING_V1");
    });

    // 5. IFFCO Fidelity Guarantee warehouse training
    await checkPdf("IFFCO Tokio/Fidelity Guarantee/AMALTAAS AND COMPANY FIDELITY.pdf", (res) => {
      expect(res.policyNumber).toBe("41118058");
      expect(res.pincode).toBe("487770");
      expect(res.extractionTrainingVersion).toBe("IFFCO_TOKIO_WAREHOUSE_TRAINING_V1");
    });

    // 6. IFFCO Quote Summary fallback quotationNumber & pincode
    await checkPdf("IFFCO Tokio/Flexi Property Protector/PROPOSAL STOCK AMALTAAS AND COMPANY WAREHOUSE.pdf", (res) => {
      expect(res.quotationNumber).toBe("Q-PFP-20260714-238");
      expect(res.pincode).toBe("487770");
      expect(res.extractionTrainingVersion).toBe("IFFCO_TOKIO_WAREHOUSE_TRAINING_V1");
    });

    // 7. Bajaj Fidelity Guarantee warehouse training
    await checkPdf("Bajaj Allianz/Fidelity Guarantee/GURUKRIPAWAREHOUSEACMPWLC -FIDELITY.pdf", (res) => {
      expect(res.extractionTrainingVersion).toBe("BAJAJ_ALLIANZ_WAREHOUSE_TRAINING_V1");
      expect(res.policyNumber).toMatch(/^OG-\d{2}-\d{4}-3310-\d{8}$/);
      expect(res.pincode).toBeTruthy();
    });

    // 8. Bajaj Burglary must keep 4010 policy number and route to bajaj-allianz/warehouse
    await checkPdf("Bajaj Allianz/Burglary/GURU KRIPA WAREHOUSEACMPWLC - BURGLARY.pdf", (res) => {
      expect(res.extractionTrainingVersion).toBe("BAJAJ_ALLIANZ_WAREHOUSE_TRAINING_V1");
      expect(res.policyNumber).toMatch(/^OG-\d{2}-\d{4}-4010-\d{8}$/);
      expect(res.firePolicyReference).toMatch(/^OG-\d{2}-\d{4}-4056-\d{8}$/);
    });

    // 9. Tata AIG Schedule containing word "ENDORSEMENT" in wording must still run Schedule trainer
    await checkPdf("Tata AIG/Business Guard Laghu/KACHWAH WAREHOUSING STOCK POLICY.pdf", (res) => {
      expect(res.extractionTrainingVersion).toBe("TATA_AIG_WAREHOUSE_SCHEDULE_V1");
      expect(res.pincode).toBe("486446");
      expect(res.state).toBe("MADHYA PRADESH");
    });

    // 10. Tata AIG Sookshma Endorsements missing Policy PeriodFrom/To must extract dates & pincode
    await checkPdf("Tata AIG/Business Guard Sookshma/AGRAWAL WAREHOUSE AC MPWLC_ ENDO.pdf", (res) => {
      expect(res.extractionTrainingVersion).toBe("TATA_AIG_WAREHOUSE_ENDORSEMENT_V1");
      expect(res.startDate).toBe("24/04/2026");
      expect(res.expiryDate).toBe("23/04/2027");
      expect(res.endorsementEffectiveDate).toBe("04/06/2026");
      expect(res.pincode).toBe("454449");
    });

    // 11. United India Value Udyam Suraksha pincode fallback
    await checkPdf("United India/Value Udyam Suraksha/fire_DAMOH POLICY-26-27.pdf", (res) => {
      expect(res.extractionTrainingVersion).toBe("UNITED_INDIA_WAREHOUSE_TRAINING_V2");
      expect(res.pincode).toBeTruthy();
    });
  }, 30000);
});

