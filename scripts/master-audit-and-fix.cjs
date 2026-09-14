require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function masterAuditAndFix() {
  console.log('=== STARTING MASTER AUDIT & AUTO-FIX ===\n');

  // Fetch all active policy records
  const allRecords = await prisma.policyRecord.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      pdfFileName: true,
      pdfBytes: true,
      uploadedFileId: true,
      selectedServiceCategory: true,
      detectedServiceCategory: true,
      contactPersonName: true,
      contactPersonMobile: true,
      data: true,
      reviewedData: true,
      savedAt: true
    }
  });

  console.log(`Total active records in DB: ${allRecords.length}`);

  let financialFixCount = 0;
  let ncbFixCount = 0;
  let contactFixCount = 0;
  let companyFixCount = 0;

  for (const r of allRecords) {
    const d = { ...(r.data || {}) };
    const rev = { ...(r.reviewedData || {}) };
    let needsUpdate = false;

    // 1. Check Gross vs Net Premium
    const netRaw = d.netPremium || d.basicPremium || rev.netPremium || rev.basicPremium;
    const grossRaw = d.totalPremium || d.grossPremium || d.premium || rev.totalPremium || rev.grossPremium || rev.premium;

    if (netRaw && grossRaw) {
      const netVal = Number(String(netRaw).replace(/[^0-9.-]/g, ''));
      const grossVal = Number(String(grossRaw).replace(/[^0-9.-]/g, ''));

      // If gross is huge concatenated number (e.g. > 10,000,000 for motor) or less than net
      if (Number.isFinite(netVal) && Number.isFinite(grossVal)) {
        if (grossVal > 100000000) {
          console.log(`[FIX] Corrupted gross premium on record ${r.id} (${grossVal})`);
          // Check if it's Vijay Kumar Mishra
          if (d.vehicleNumber === 'MP17DA1282' || d.insuredName?.includes('MISHRA CONST')) {
            d.totalPremium = '9838';
            d.grossPremium = '9838';
            rev.totalPremium = '9838';
            rev.grossPremium = '9838';
            needsUpdate = true;
            financialFixCount++;
          }
        } else if (grossVal < netVal && grossVal > 0) {
          console.log(`[WARN] Inverted financial on record ${r.id}: net=${netVal}, gross=${grossVal}`);
          // If gross is smaller than net, check Manpreet
          if (d.vehicleNumber === 'MP04YB6002' || d.insuredName?.includes('MANPREET')) {
            d.grossPremium = '34618';
            d.totalPremium = '34618';
            rev.grossPremium = '34618';
            rev.totalPremium = '34618';
            needsUpdate = true;
            financialFixCount++;
          }
        }
      }
    }

    // 2. Check NCB
    const ncbRaw = d.ncb || d.ncbPercentage || rev.ncb || rev.ncbPercentage;
    if (ncbRaw) {
      const ncbStr = String(ncbRaw).trim();
      const match = ncbStr.match(/^(\d{1,2})\s*%?$/);
      if (!match || Number(match[1]) > 65) {
        console.log(`[FIX] Invalid NCB string on record ${r.id}: "${ncbStr}"`);
        d.ncb = '0%';
        d.ncbPercentage = '0%';
        rev.ncb = '0%';
        rev.ncbPercentage = '0%';
        needsUpdate = true;
        ncbFixCount++;
      }
    }

    // 3. Check Contact Person for OCR Address Junk
    const cp = r.contactPersonName || rev.contactPerson || d.contactPerson || '';
    if (cp && (cp.length > 50 || /please\s*go\s*through|hamidia|bhopal|462001|road|behind|street|plot/i.test(cp))) {
      console.log(`[FIX] Junk contact person on record ${r.id}: "${cp.slice(0, 40)}..."`);
      delete d.contactPerson;
      delete rev.contactPerson;
      await prisma.policyRecord.update({
        where: { id: r.id },
        data: { contactPersonName: null }
      });
      needsUpdate = true;
      contactFixCount++;
    }

    // 4. Check Deepak Lokhande Company attribution
    if (d.policyNumber === 'N8586996' || d.vehicleNumber === 'MP04ZN5439') {
      if (d.insuranceCompany?.includes('ICICI') || rev.insuranceCompany?.includes('ICICI')) {
        console.log(`[FIX] Correcting Deepak Lokhande insurer to IFFCO Tokio`);
        d.insuranceCompany = 'IFFCO Tokio General Insurance Company Limited';
        d.companyName = 'IFFCO Tokio General Insurance Company Limited';
        rev.insuranceCompany = 'IFFCO Tokio General Insurance Company Limited';
        rev.companyName = 'IFFCO Tokio General Insurance Company Limited';
        needsUpdate = true;
        companyFixCount++;
      }
    }

    // 5. Check Vijay Kumar Mishra Company attribution
    if (d.policyNumber === '45140031260100005565' || d.vehicleNumber === 'MP17DA1282') {
      if (d.insuranceCompany?.includes('IFFCO') || rev.insuranceCompany?.includes('IFFCO')) {
        console.log(`[FIX] Correcting Vijay Kumar Mishra insurer to New India`);
        d.insuranceCompany = 'The New India Assurance Company Limited';
        d.companyName = 'The New India Assurance Company Limited';
        rev.insuranceCompany = 'The New India Assurance Company Limited';
        rev.companyName = 'The New India Assurance Company Limited';
        needsUpdate = true;
        companyFixCount++;
      }
    }

    // 6. Check Anwarul Haque IDV
    if (d.vehicleNumber === 'MP04CV4709' && (d.idv === '1989' || rev.idv === '1989')) {
      console.log(`[FIX] Correcting Anwarul Haque IDV to 198900`);
      d.idv = '198900';
      d.sumInsured = '198900';
      rev.idv = '198900';
      rev.sumInsured = '198900';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.policyRecord.update({
        where: { id: r.id },
        data: {
          data: d,
          reviewedData: rev
        }
      });
    }
  }

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Financial Fixes Applied: ${financialFixCount}`);
  console.log(`NCB Fixes Applied:       ${ncbFixCount}`);
  console.log(`Contact Fixes Applied:   ${contactFixCount}`);
  console.log(`Company Fixes Applied:   ${companyFixCount}`);
  console.log('=== MASTER AUDIT & AUTO-FIX COMPLETED ===');
}

masterAuditAndFix().finally(() => prisma.$disconnect());
