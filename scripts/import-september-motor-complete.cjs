require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pdf = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');
const { extractPolicyFromText } = require('../src/lib/policies/pdf/extractor.cjs');

const prisma = new PrismaClient();

const rawTable = `
1	01-09-2026	ANWARUL HAQUE	MP04CV4709	ANWARUL HAQUE	877 089 7697	PVT -PACKAGE	4385	3716	ICICI LOMBARD	RENEWAL			
2	01-09-2026	PARAS  SETHI	MP05MP5782	PIYUSH SIR	87933 34343	TW - PACKAGE	1380	1170	NEW INDIA 	RENEWAL			
3	02-09-2026	MR. SANJAY KUSHWAHA	MP04SU2912	NEELESH KHANDELWAL	70003 38920	TW - PACKAGE	871	739	TATA AIG	RENEWAL			
4	02-09-2026	MR. ASHESH TIWARI	MP04SU3033	Vishesh Tiwari	91740 01020	TW - PACKAGE	861	729	TATA AIG	RENEWAL			
5	02-09-2026	M/S D D ENTERPRISES	MP04YB0843	Raj DD Enterprises	98933 06770	COMMERCIAL - PACKAGE	5684	5312	NEW INDIA 	RENEWAL			
6	02-09-2026	D.D. ENTERPRISES 	MP04YR9317	Raj DD Enterprises	98933 06770	PVT- OD POLICY	12133	10283	IFFCO TOKIO	NEW			
7	02-09-2026	SURENDER GOLEY 	PB07BY9749	SURENDER GOLEY 	99970 78899	PVT - PACKAGE 	7993	6774	IFFCO TOKIO	RENEWAL			
8	02-09-2026	 AJIT KUMAR SETHI 	MP05CA5924	PIYUSH SIR	87933 34343	PVT - PACKAGE 	12077	10235	IFFCO TOKIO	RENEWAL			
9	03-09-2026	RAMDAS	MP07ZG7414	KULDEEP SIR (MISHRA WAREHOUSE)	8823882981	PVT - PACKAGE 	14545	12327	IFFCO TOKIO	RENEWAL			
10	03-09-2026	Mr POORAN LAL RATHORE	MP09CU1597	Jegendra Rathore	 95848 08923	PVT - PACKAGE 	5743	4867	TATA AIG	RENEWAL			
11	03-09-2026	RAKSHA PATEL	MP04ZN4413	Prateek Patel S R Ferro	9755666191	PVT - PACKAGE 	11528	9770	IFFCO TOKIO	RENEWAL			
12	04-09-2026	ABHA CHOUBEY	MP04ST9211	Vipul Chaturvedi 	9981125206	TW - TP	902	764	NEW INDIA 	RENEWAL			
13	04-09-2026	VIPUL  CHATURVEDI	MP04MW9567	Vipul Chaturvedi 	9981125206	TW - TP	2084	1766	NEW INDIA 	RENEWAL			
14	04-09-2026	M/s.SHUKLA AGRITECH FLOUR INDUSTRIES PRIVATE	MP17ZN7523	SHIVAM SHUKLA	97551 00441	COMMERCIAL - PACKAGE	54820	51332	ROYAL SUNDARAM	NEW			
15	05-09-2026	  SWAMESH RAI 	MH12KE2722	Rai Swamesh 	 94243 03611	PVT - PACKAGE 	11392.9	9655	IFFCO TOKIO	RENEWAL			
16	07-09-2026	KHANDELWAL INTERPRISES STEEL	MP04QF7290	Neelesh Khandelwal	70003 38920	TW - TP	902	764	NEW INDIA 	RENEWAL			
17	07-09-2026	MR. SUKALP SAGAR SARDAR	MP04SM4167	Sukalp Sardar Prime One	92292 15855	TW - PACKAGE	863	731	TATA AIG	RENEWAL			
18	07-09-2026	AVATAR   SINGH	MP04HC0190	Avatar Singh	81203 19918	PVT - TP	2913	2469	NEW INDIA 	RENEWAL			
19	07-09-2026	 DEEPAK LOKHANDE	MP04ZN5439	Deepak Khandelwal	94253 26210	TW- OD	682	578	IFFCO TOKIO	RENEWAL			
20	07-09-2026	MP BOARD AND PAPER MILLS PVT LTD	MP40	Hemanshu SIR 	94250 09875	COMMERCIAL - PACKAGE	20971	19541	NEW INDIA 	RENEWAL			
21	08-09-2026	VIVEK CHOURASIA	NEWYDT4H78312	VIVEK CHOURASIA	79996 85855	PRIVATE CAR - PACKAGE 	73795	62538	ICICI LOMBARD	NEW			
22	08-09-2026	MR TRILOCHAN SINGH  MAAN	MP04CV4634	 TRILOCHAN SINGH	9617996323	PRIVATE CAR - PACKAGE 	7854	6656	FUTURE	RENEWAL			
23	08-09-2026	MRS  SWETA	MP19ML5055	Vijay Kumar	8709576192	TW - PACKAGE 	945	801	NEW INDIA 	RENEWAL			
24	08-09-2026	MR OUJWAL GUPTA 	MP04EC0365	AJITESH SIR	99779 92250	PVT- PACKAGE 	42619	36118	HDFC ERGO	RENEWAL			
25	08-09-2026	SANJAY VINCHANKAR	MP04YB6081	AKASHAT VINCHANKAR	883 994 7799	TW - OD	717	608	ICICI LOMBARD	NEW			
26	09-09-2026	MALKHAN  SINGH	MP13ZZ1403	bairagiajay	7987589055	COMMERCIAL - PACKAGE	18612	17543	NEW INDIA 	NEW			
27	09-09-2026	SUDESH THE VILLAGE RESORT	MP04YS4461	Giovanni Boutique Furniture	97551 18823	COMMERCIAL - PACKAGE	35136	29776	NEW INDIA 	NEW			
28	09-09-2026	NEERAJ VIJAY	MP04CT3259	NEERAJ VIJAY	90096 81118	PVT - PACKAGE 	12398	10507	ICICI LOMBARD	RENEWAL			
29	09-09-2026	MANPREET KAUR GANDHI	MP04YB6002	Brajesh. Tvs Jupiter	96304 01846	PVT - OD	34618	29337	GO DIGIT 	RENEWAL			
30	09-09-2026	KAILASH CHANDRA GARG	MP41ZD2311	Kailash Garg Shri Natraj Wh Dewas	94250 00371	TW - OD	394	334	NEW INDIA 	NEW			
31	09-09-2026	Mr Vipin Kumar Tripathi	MP04CT2271	Mr Vipin Kumar Tripathi	70001 52510	PVT - PACKAGE	11629	9855	TATA AIG	NEW			
32	09-09-2026	KULDEEP SINGH	MP07ZS3346	Kuldeep Singh Dhakad Mishra Wh	88238 82981	TW - OD	894	758	ICICI LOMBARD	NEW			
33	10-09-2026	PRABHJOT KAUR	MP04YH6092	VEER JI	94244 11103	TW - OD	1075	911	NEW INDIA 	NEW			
34	10-09-2026	ARJINDER KOUR	MP04YH6016	VEER JI	94244 11103	TW - OD	1075	911	NEW INDIA 	NEW			
35	10-09-2026	HARVINDER KAUR OBEROI	MP04CP5137	VEER JI	94244 11103	PVT - PACKAGE 	5511	4670	LIBERTY	NEW			
36	10-09-2026	VIJAY KUMAR MISHRA CONST PVT LTD	MP17DA1282	SUDEEP SIR	96857 17917	COMMERCIAL - PACKAGE	9837	8337	NEW INDIA 	NEW			
37	10-09-2026	REENA PAL 	MP04YB8473	DINESH PAL	95751 68636	PVT - PACKAGE	8860	7509	IFFCO TOKIO	RENEWAL			
38	11-09-2026	SATHEESH BABU R N	MP04SG0469	SATHEESH BABU	9630966631	TW-TP	1314	1114	NEW INDIA 	RENEWAL			
39	11-09-2026	Mr. Atul Sharma	MP04SD1940	ATUL SHARMA	9893303152	TW-TP	842	714	TATA AIG	NEW			
40	11-09-2026	ARVIND KUMAR MISHRA	MP04GA3158	SUDEEP SIR	96857 17917	COMMERCIAL - PACKAGE	17029	16199	NEW INDIA 	NEW			
41	12-09-2026	M/S GANPATI TRADERS	MP04YS0136	Ganpati traders	70000 94454	TW - OD	760	644	NEW INDIA 	NEW			
`;

function normalizeVeh(v) {
  return String(v || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function parseDateToSeptember(rawDate) {
  if (!rawDate) return new Date('2026-09-01T12:00:00.000Z');
  const m = String(rawDate).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    const year = m[3];
    return new Date(`${year}-${month}-${day}T12:00:00.000Z`);
  }
  return new Date('2026-09-01T12:00:00.000Z');
}

function normalizeToIsoDate(d) {
  if (!d) return null;
  const str = String(d).trim();
  const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return str;
}

function cleanMoney(v) {
  if (v === undefined || v === null || v === '') return '';
  const num = Number(String(v).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(num)) return String(v);
  return String(num);
}

function normalizeCompanyName(c) {
  const s = String(c || '').toUpperCase();
  if (s.includes('ICICI')) return 'ICICI Lombard General Insurance Company Limited';
  if (s.includes('NEW INDIA')) return 'The New India Assurance Company Limited';
  if (s.includes('TATA')) return 'Tata AIG General Insurance Company Limited';
  if (s.includes('IFFCO')) return 'IFFCO Tokio General Insurance Company Limited';
  if (s.includes('ROYAL')) return 'Royal Sundaram General Insurance Co. Limited';
  if (s.includes('FUTURE')) return 'Future Generali India Insurance Company Limited';
  if (s.includes('HDFC')) return 'HDFC ERGO General Insurance Company Limited';
  if (s.includes('DIGIT')) return 'Go Digit General Insurance Limited';
  if (s.includes('LIBERTY')) return 'Liberty General Insurance Limited';
  return c;
}

function normalizeCoverType(polType) {
  const s = String(polType || '').toUpperCase();
  if (s.includes('OD') || s.includes('OWN DAMAGE')) return 'OD';
  if (s.includes('TP') || s.includes('THIRD PARTY') || s.includes('LIABILITY')) return 'TP';
  if (s.includes('PACKAGE') || s.includes('COMPREHENSIVE')) return 'Comprehensive';
  return polType || 'Comprehensive';
}

function calculateHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function parseTable() {
  const lines = rawTable.trim().split('\n').filter(l => l.trim());
  const items = lines.map(line => {
    const parts = line.split('\t').map(p => p.trim());
    return {
      sNo: parts[0],
      date: parts[1],
      insuredName: parts[2],
      vehicleNumber: parts[3],
      normVeh: normalizeVeh(parts[3]),
      contactName: parts[4],
      mobileNo: parts[5].replace(/\s+/g, ''),
      policyType: parts[6],
      grossPremium: parts[7],
      netPremium: parts[8],
      insuranceCompany: parts[9],
      lob: parts[10],
    };
  });

  // Entry 42: Santosh Kushwaha
  items.push({
    sNo: '42',
    date: '08-09-2026',
    insuredName: 'SANTOSH KUSHWAHA',
    vehicleNumber: 'MP04VC8797',
    normVeh: 'MP04VC8797',
    contactName: 'SANTOSH KUSHWAHA',
    mobileNo: '8818889660',
    policyType: 'TW - PACKAGE',
    grossPremium: '',
    netPremium: '',
    insuranceCompany: 'NEW INDIA',
    lob: 'RENEWAL',
  });

  return items;
}

async function main() {
  console.log('=== STARTING COMPLETE SEPTEMBER 2026 MOTOR POLICY IMPORT & VERIFICATION ===');
  const items = parseTable();
  console.log(`Processing ${items.length} policies from table and storage...`);

  const storageDir = 'c:\\Users\\abhis\\insuredesk-crm\\storage\\September 2026';
  const uploadDestDir = 'c:\\Users\\abhis\\insuredesk-crm\\storage\\uploads\\2026\\09';
  fs.mkdirSync(uploadDestDir, { recursive: true });

  const pdfFiles = fs.readdirSync(storageDir).filter(f => f.toLowerCase().endsWith('.pdf'));

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const logPrefix = `[${i + 1}/${items.length}] (S.No: ${item.sNo}) ${item.insuredName} [${item.vehicleNumber}]`;

    try {
      // 1. Match PDF
      let match = pdfFiles.find(f => {
        const normF = normalizeVeh(f);
        return normF.includes(item.normVeh) || (item.normVeh.length >= 6 && normF.includes(item.normVeh.slice(-6)));
      });

      if (!match && item.normVeh === 'MP40') {
        match = pdfFiles.find(f => f.includes('NSD4WXE0247'));
      }

      if (!match) {
        const nameParts = item.insuredName.toUpperCase().split(/\s+/).filter(w => w.length > 3);
        match = pdfFiles.find(f => {
          const upperF = f.toUpperCase();
          return nameParts.every(p => upperF.includes(p));
        });
      }

      if (!match) {
        throw new Error(`PDF not found in ${storageDir}`);
      }

      const pdfPath = path.join(storageDir, match);
      const pdfBuffer = fs.readFileSync(pdfPath);
      const fileHash = calculateHash(pdfBuffer);
      const fileSize = pdfBuffer.length;

      // Copy to storage/uploads/2026/09/
      const localDestPath = path.join(uploadDestDir, match);
      fs.writeFileSync(localDestPath, pdfBuffer);
      const localRelativeStoragePath = `2026/09/${match}`.replace(/\\/g, '/');

      // 2. Parse PDF Text and Extract Fields
      const parsedPdf = await pdf(pdfBuffer);
      const extracted = extractPolicyFromText(parsedPdf.text, match);

      // 3. Reconcile and Standardize Fields
      const targetDate = parseDateToSeptember(item.date);
      const standardVeh = normalizeVeh(extracted.registrationNumber || item.vehicleNumber);
      const standardCompany = normalizeCompanyName(extracted.insuranceCompany || item.insuranceCompany);
      const standardCoverType = normalizeCoverType(item.policyType || extracted.policyType);

      // Financials: Prefer extracted numbers, fallback to table numbers
      const netPrem = cleanMoney(extracted.netPremium || item.netPremium);
      const grossPrem = cleanMoney(extracted.totalPremium || item.grossPremium);
      const idvVal = cleanMoney(extracted.idv || '');

      const startIso = normalizeToIsoDate(extracted.startDate) || targetDate.toISOString().slice(0, 10);
      const expiryIso = normalizeToIsoDate(extracted.expiryDate) || null;

      // 4. Construct comprehensive payload
      const fullPayload = {
        ...(extracted || {}),
        insuredName: extracted.insuredName || item.insuredName,
        registrationNumber: standardVeh,
        vehicleNumber: standardVeh,
        policyNumber: extracted.policyNumber || '',
        policyType: item.policyType || extracted.policyType || '',
        policyCoverType: standardCoverType,
        coverType: standardCoverType,
        insuranceCompany: standardCompany,
        companyName: standardCompany,
        netPremium: netPrem,
        basicPremium: netPrem,
        totalPremium: grossPrem,
        grossPremium: grossPrem,
        idv: idvVal,
        sumInsured: idvVal,
        startDate: startIso,
        policyStartDate: startIso,
        expiryDate: expiryIso,
        policyEndDate: expiryIso,
        contactPerson: item.contactName,
        contactPersonName: item.contactName,
        contactNumber: item.mobileNo,
        customerMobile: item.mobileNo,
        newOrRenewal: item.lob || 'RENEWAL',
        lob: item.lob || 'RENEWAL',
        sourceFile: match,
        pdfFileName: match,
        documentCategory: 'Motor Insurance',
        policyCategory: 'Motor Insurance',
        status: 'saved',
        savedAt: targetDate.toISOString(),
        createdAt: targetDate.toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 5. Look for existing record in DB
      const existing = await prisma.policyRecord.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { pdfFileName: match },
            { sourceFile: match },
            ...(extracted.policyNumber ? [
              { data: { path: ['policyNumber'], equals: extracted.policyNumber } },
              { reviewedData: { path: ['policyNumber'], equals: extracted.policyNumber } }
            ] : []),
            ...(standardVeh && standardVeh !== 'MP40' ? [
              { data: { path: ['registrationNumber'], equals: standardVeh } },
              { reviewedData: { path: ['registrationNumber'], equals: standardVeh } },
              { data: { path: ['vehicleNumber'], equals: standardVeh } },
              { reviewedData: { path: ['vehicleNumber'], equals: standardVeh } }
            ] : [])
          ]
        },
        include: { uploadedFile: true }
      });

      // 6. Manage UploadedFile record
      let uploadedFileId = existing?.uploadedFileId || null;
      if (uploadedFileId) {
        await prisma.uploadedFile.update({
          where: { id: uploadedFileId },
          data: {
            sourceFile: match,
            storageProvider: 'local',
            storagePath: localRelativeStoragePath,
            fileSize,
            sizeBytes: fileSize,
            fileHash,
            mimeType: 'application/pdf',
            status: 'APPROVED',
            createdAt: targetDate,
            pdfBytes: pdfBuffer,
          }
        });
      } else {
        const newUpload = await prisma.uploadedFile.create({
          data: {
            id: crypto.randomUUID(),
            sourceFile: match,
            storageProvider: 'local',
            storagePath: localRelativeStoragePath,
            fileSize,
            sizeBytes: fileSize,
            fileHash,
            mimeType: 'application/pdf',
            status: 'APPROVED',
            createdAt: targetDate,
            pdfBytes: pdfBuffer,
          }
        });
        uploadedFileId = newUpload.id;
      }

      // 7. Create or Update PolicyRecord
      if (existing) {
        const mergedReviewedData = {
          ...(existing.reviewedData || {}),
          ...fullPayload,
        };
        const mergedData = {
          ...(existing.data || {}),
          ...fullPayload,
        };

        await prisma.policyRecord.update({
          where: { id: existing.id },
          data: {
            savedAt: targetDate,
            updatedAt: new Date(),
            contactPersonName: item.contactName,
            contactPersonMobile: item.mobileNo,
            renewalRecipientName: item.contactName,
            renewalRecipientMobile: item.mobileNo,
            uploadedFileId,
            pdfFileName: match,
            pdfBytes: pdfBuffer,
            sourceFile: match,
            detectedCompany: standardCompany,
            selectedCompany: standardCompany,
            detectedServiceCategory: 'Motor Insurance',
            selectedServiceCategory: 'Motor Insurance',
            detectedPolicyType: standardCoverType,
            selectedPolicyType: standardCoverType,
            reviewedData: mergedReviewedData,
            data: mergedData,
            isActivePolicy: true,
          }
        });
        updatedCount++;
        console.log(`✓ UPDATED: ${logPrefix} -> Policy No: ${extracted.policyNumber}, Veh: ${standardVeh}, Contact: ${item.contactName} (${item.mobileNo})`);
      } else {
        const newRec = await prisma.policyRecord.create({
          data: {
            id: crypto.randomUUID(),
            savedAt: targetDate,
            createdAt: targetDate,
            updatedAt: new Date(),
            contactPersonName: item.contactName,
            contactPersonMobile: item.mobileNo,
            renewalRecipientName: item.contactName,
            renewalRecipientMobile: item.mobileNo,
            uploadedFileId,
            pdfFileName: match,
            pdfBytes: pdfBuffer,
            sourceFile: match,
            detectedCompany: standardCompany,
            selectedCompany: standardCompany,
            detectedServiceCategory: 'Motor Insurance',
            selectedServiceCategory: 'Motor Insurance',
            detectedPolicyType: standardCoverType,
            selectedPolicyType: standardCoverType,
            reviewedData: fullPayload,
            data: fullPayload,
            isActivePolicy: true,
          }
        });
        createdCount++;
        console.log(`+ CREATED: ${logPrefix} -> Policy No: ${extracted.policyNumber}, Veh: ${standardVeh}, ID: ${newRec.id}, Contact: ${item.contactName} (${item.mobileNo})`);
      }

    } catch (err) {
      console.error(`✗ ERROR on ${logPrefix}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n=== EXECUTION SUMMARY ===');
  console.log(`Total Policies Processed: ${items.length}`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
