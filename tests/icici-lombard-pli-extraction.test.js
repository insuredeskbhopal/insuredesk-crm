/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse/lib/pdf-parse.js');
const { extractPolicyFromText } = require('../src/lib/policies/pdf/extractor.cjs');

describe('ICICI Lombard Public Liability Extraction (Non-Motor Isolated)', () => {
  const dir = path.join(process.cwd(), 'storage', 'aug policy (2)', 'aug policy');

  it('extracts Andhra Pradesh PLI PDF as Public Liability (not Motor, not Health, not Warehouse)', async () => {
    const filePath = path.join(dir, 'Andhra Pradesh_PLI_LION.pdf');
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const res = extractPolicyFromText(parsed.text, 'Andhra Pradesh_PLI_LION.pdf');

    expect(res.insuranceCompany).toMatch(/ICICI Lombard/i);
    expect(res.documentCategory).toBe('Public Liability');
    expect(res.documentCategory).not.toBe('Motor Insurance');
    expect(res.documentCategory).not.toBe('Health Insurance');
    expect(res.documentCategory).not.toBe('Warehouse Insurance');
    expect(res.policyNumber).toBe('100086939400');
    expect(res.insuredName).toMatch(/LION ENGINEERING/i);
    expect(res.netPremium).toBe('999.00');
    expect(res.totalPremium).toBe('1,179.00');
  });

  it('extracts Bhusawal PLI PDF correctly', async () => {
    const filePath = path.join(dir, 'Bhusawal_PLI_LION.pdf');
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const res = extractPolicyFromText(parsed.text, 'Bhusawal_PLI_LION.pdf');

    expect(res.insuranceCompany).toMatch(/ICICI Lombard/i);
    expect(res.documentCategory).toBe('Public Liability');
    expect(res.policyNumber).toBe('100086946800');
    expect(res.insuredName).toMatch(/LION ENGINEERING/i);
    expect(res.netPremium).toBe('5,000.02');
    expect(res.totalPremium).toBe('5,901.00');
  });

  it('extracts Nagpur PLI PDF correctly', async () => {
    const filePath = path.join(dir, 'NAGPUR_PLI_LION.pdf');
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const res = extractPolicyFromText(parsed.text, 'NAGPUR_PLI_LION.pdf');

    expect(res.insuranceCompany).toMatch(/ICICI Lombard/i);
    expect(res.documentCategory).toBe('Public Liability');
    expect(res.policyNumber).toBe('100084449900');
    expect(res.insuredName).toMatch(/LION ENGINEERING/i);
    expect(res.netPremium).toBe('999.00');
    expect(res.totalPremium).toBe('1,179.00');
  });

  it('extracts Tamil Nadu PLI PDF correctly', async () => {
    const filePath = path.join(dir, 'TAMIL NADU_PLI_LION.pdf');
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const res = extractPolicyFromText(parsed.text, 'TAMIL NADU_PLI_LION.pdf');

    expect(res.insuranceCompany).toMatch(/ICICI Lombard/i);
    expect(res.documentCategory).toBe('Public Liability');
    expect(res.policyNumber).toBe('100086953800');
    expect(res.insuredName).toMatch(/LION ENGINEERING/i);
    expect(res.netPremium).toBe('5,000.02');
    expect(res.totalPremium).toBe('5,901.00');
  });

  it('extracts Yamuna South Bank PLI PDF correctly', async () => {
    const filePath = path.join(dir, 'Yamuna South Bank_PLI_LION.pdf');
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const res = extractPolicyFromText(parsed.text, 'Yamuna South Bank_PLI_LION.pdf');

    expect(res.insuranceCompany).toMatch(/ICICI Lombard/i);
    expect(res.documentCategory).toBe('Public Liability');
    expect(res.policyNumber).toBe('100087660400');
    expect(res.insuredName).toMatch(/LION ENGINEERING/i);
    expect(res.netPremium).toBe('3,999.98');
    expect(res.totalPremium).toBe('4,720.00');
  });

  it('extracts Vidisha Gyaraspur PLI PDF correctly with start/end dates and tax breakdown', async () => {
    const filePath = path.join(process.cwd(), 'storage', 'Vidisha Gyaraspur_pli_lion.pdf');
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const res = extractPolicyFromText(parsed.text, 'Vidisha Gyaraspur_pli_lion.pdf');

    expect(res.insuranceCompany).toBe('ICICI Lombard General Insurance Company Limited');
    expect(res.documentCategory).toBe('Public Liability');
    expect(res.policyNumber).toBe('100094056400');
    expect(res.insuredName).toBe('LION ENGINEERING CONSULTANTS PRIVATE LIMITED');
    expect(res.policyStartDate).toBe('17-Sep-2026');
    expect(res.policyEndDate).toBe('16-Sep-2027');
    expect(res.netPremium).toBe('999.98');
    expect(res.cgst).toBe('90.00');
    expect(res.sgst).toBe('90.00');
    expect(res.igst).toBe('0.00');
    expect(res.gstAmount).toBe('180.00');
    expect(res.totalPremium).toBe('1,180.00');
    expect(res.sumInsured).toBe('10,00,000.00');
  });

  it('extracts UJJAIN PLI PDF correctly with start/end dates and tax breakdown', async () => {
    const filePath = path.join(process.cwd(), 'storage', 'UJJAIN PLI_LION.pdf');
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const res = extractPolicyFromText(parsed.text, 'UJJAIN PLI_LION.pdf');

    expect(res.insuranceCompany).toBe('ICICI Lombard General Insurance Company Limited');
    expect(res.documentCategory).toBe('Public Liability');
    expect(res.policyNumber).toBe('100094073800');
    expect(res.insuredName).toBe('Lion Engineering Consultants Private Limited in JV with Isan Corporation');
    expect(res.policyStartDate).toBe('17-Sep-2026');
    expect(res.policyEndDate).toBe('16-Sep-2027');
    expect(res.netPremium).toBe('999.00');
    expect(res.cgst).toBe('89.91');
    expect(res.sgst).toBe('89.91');
    expect(res.igst).toBe('0.00');
    expect(res.gstAmount).toBe('179.82');
    expect(res.totalPremium).toBe('1,179.00');
    expect(res.sumInsured).toBe('10,00,000.00');
  });
});
