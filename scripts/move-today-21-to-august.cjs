require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { downloadGoogleDriveFile } = require('../src/lib/storage/google-drive-storage.js');
const prisma = new PrismaClient();

const moves = [
  {
    todayId: '928097ca-103d-4be8-816c-296cde0848c3',
    oldId: '8eff0d31-50f5-4d6d-8805-4311fd2b4c0d',
    name: 'MR. JAGENDRA RATHORE',
    veh: 'MP04UC1162',
    date: '2026-08-10',
    contactName: 'Jegendra Rathore ',
    mobile: '95848 08923'
  },
  {
    todayId: 'a66f6926-34f2-4ecb-8ba3-9429647e91e6',
    oldId: '967ac29c-5d7c-4cf0-8ac7-db2f217dde4e',
    name: 'SHUBHAM KUSHWAHA',
    veh: 'MP04YA8427',
    date: '2026-08-14',
    contactName: 'SHUBHAM KUSHWAHA',
    mobile: '7415203531'
  },
  {
    todayId: 'ddbbdfb0-8510-429a-a28b-a64900815a7f',
    oldId: 'b705388f-6143-466d-9720-f63ba6aba03e',
    name: 'PARTHO CHAKRABORTY',
    veh: 'MP04CT2003',
    date: '2026-08-25',
    contactName: 'AJITESH SIR',
    mobile: '99779 92250'
  },
  {
    todayId: '5918f485-d6f0-409d-b508-dc8ca48c02f2',
    oldId: 'd1953343-6a40-479a-be00-c269b21b73e5',
    name: 'ANUBHAV GUPTA',
    veh: 'MP04ZA1437',
    date: '2026-08-06',
    contactName: 'ANAND SIR',
    mobile: '8818889660'
  },
  {
    todayId: '3bd3903e-f2de-41da-b856-22eb4650c051',
    oldId: '6e2d7268-03d5-4ba4-bb5b-0348a0fc233a',
    name: 'Mr Ankita Goswami',
    veh: 'MP09ZS9904',
    date: '2026-08-27',
    contactName: 'Ankita Goswami',
    mobile: '84619 87827'
  },
  {
    todayId: '00b629bb-8e6c-44a7-82ba-7813a727ff60',
    oldId: '7b096658-0376-409a-a92f-a2cf06771966',
    name: 'Lion Engineering Consultants Pvt L',
    veh: 'MP04EC5499',
    date: '2026-08-12',
    contactName: 'ARJUN SIR',
    mobile: '9111111692'
  },
  {
    todayId: '3baffc34-80ce-46b7-af35-b1f2711396e5',
    oldId: '392df333-3ed9-4c15-84f8-ca61c604480f',
    name: 'LION ENGINEERING CONSULTANTS PRIVATE LIMITED',
    veh: 'MP07ZC1277',
    date: '2026-08-13',
    contactName: 'ARJUN SIR',
    mobile: '9111111692'
  },
  {
    todayId: 'bae3d94a-c3f2-42d6-a4cf-fc486a0b651b',
    oldId: '30e53c2a-6588-484b-a496-1a27c5bec88d',
    name: 'LAXMI ENGINEERING',
    veh: 'MP04CL5420',
    date: '2026-08-10',
    contactName: 'Rachna EA LE',
    mobile: '9669495111'
  },
  {
    todayId: '1fde7c7e-f637-4025-9e9e-233d5e924334',
    oldId: '3a0dcb84-6a59-4af7-8eaa-5e13016b71e8',
    name: 'KAMAL SINGH',
    veh: 'MP09KD6564',
    date: '2026-08-24',
    contactName: 'DHARMENDRA RAI',
    mobile: '9893112093'
  },
  {
    todayId: 'f5dc364b-8c9a-4760-8061-9cb184e0c026',
    oldId: 'af012fab-3907-42d7-a648-9e187604ec4d',
    name: 'HEMENDRA LONARE',
    veh: 'MP04KG0802',
    date: '2026-08-10',
    contactName: 'HEMENDRA LONARE',
    mobile: '98266 63007'
  },
  {
    todayId: '6557093c-fee9-4c4b-bb74-8ea337ecac79',
    oldId: '1fbb3fb2-9c6f-4a2b-b6c4-bcd03e017117',
    name: 'HARMINDER SINGH',
    veh: 'MP04UG1132',
    date: '2026-08-12',
    contactName: 'VEER JI',
    mobile: '9424411103'
  },
  {
    todayId: '2aa5d166-3cea-4968-a7e4-aee71eeb8966',
    oldId: '5a6b1e78-202c-4273-8321-0989feec9009',
    name: 'DINESH KUMAR RAI',
    veh: 'MP04CN1498',
    date: '2026-08-17',
    contactName: 'D  K RAI',
    mobile: '94253 91732'
  },
  {
    todayId: 'f1420360-29aa-41ab-9ad5-7e7c3feba22b',
    oldId: '471b0e4d-0deb-46ea-9232-64bd5995e7a4',
    name: 'DINESH DUBEY',
    veh: 'MP04YB2059',
    date: '2026-08-20',
    contactName: 'DINESH DUBEY',
    mobile: '94250 27993'
  },
  {
    todayId: '83534676-1b3e-428c-ae40-dd386d2f005b',
    oldId: '87c7f632-b154-4cc6-a1f6-cc62e76aecd8',
    name: 'DILPREET SALUJA',
    veh: 'MP04SF1726',
    date: '2026-08-07',
    contactName: 'VEER JI',
    mobile: '9424411103'
  },
  {
    todayId: '53c3fc86-9aec-4e4a-b876-5bade0988b8d',
    oldId: '513dbe02-1472-4c03-8476-57c4064122c2',
    name: 'MR DILIP KHANDELWAL',
    veh: 'MP04BA4360',
    date: '2026-08-08',
    contactName: 'DILIP KHANDELWAL',
    mobile: '7000338920'
  },
  {
    todayId: 'c5baf1cb-ef17-4755-9353-97794fc48977',
    oldId: 'a82d580d-a190-47c9-9379-7687c42d31cb',
    name: 'DEEPAK KOTHARI',
    veh: 'MP04CX5642',
    date: '2026-08-19',
    contactName: 'Deepak Mehul Kothari',
    mobile: '94253 04007'
  },
  {
    todayId: 'b3ed53a9-63a6-48de-81bf-a20b382390df',
    oldId: '821cb8c3-48e3-4199-8af0-03638adcc9bd',
    name: 'ASHISH PAT',
    veh: 'MP04CP6963',
    date: '2026-08-13',
    contactName: 'ASHISH   PATIDAR',
    mobile: '88890 20020'
  },
  {
    todayId: '1bbd6c70-71fe-42d5-a138-6761f2bc5c09',
    oldId: '1f2ab8cf-50a3-48fd-be00-7e18babb4c97',
    name: 'AMRIT LAL PARWANI',
    veh: 'MP04CT2032',
    date: '2026-08-04',
    contactName: 'amrit lal parwani',
    mobile: '7024611060'
  },
  {
    todayId: 'ffc226df-2eb0-4415-9936-897c8f866c38',
    oldId: '0627aac1-2311-4e02-822e-00919238d064',
    name: 'AMARPREET KAUR',
    veh: 'MP04CJ2645',
    date: '2026-08-21',
    contactName: 'VEER JI',
    mobile: '9424411103'
  },
  {
    todayId: '736ac7a1-c862-4aa8-9176-9296ef67c2fb',
    oldId: 'f140f35f-95d9-45c5-b079-f7b245628a31',
    name: 'ABHISHEKH KUMAR MISHRA',
    veh: 'MP04EB7507',
    date: '2026-08-25',
    contactName: 'Abhishek Kumar Mishra',
    mobile: '79 7459 2426'
  },
  {
    todayId: '4029cc27-83e3-42cd-bab3-aaf21a5d77b0',
    oldId: '3ddf7f7a-4d7c-4f81-9f8a-9b71664e0d90',
    name: 'ABHISHEK PATIDAR',
    veh: 'MP04ZL6963',
    date: '2026-08-01',
    contactName: 'Ashish Patidar',
    mobile: '8889020020'
  }
];

async function main() {
  console.log(`=== MOVING 21 MOTOR POLICIES TO AUGUST 2026 ===\n`);

  for (let i = 0; i < moves.length; i++) {
    const item = moves[i];
    const targetDate = new Date(`${item.date}T12:00:00.000Z`);

    console.log(`[${i + 1}/21] Processing ${item.name} (${item.veh})...`);

    // Fetch the record uploaded today
    const rec = await prisma.policyRecord.findUnique({
      where: { id: item.todayId },
      include: { uploadedFile: true }
    });

    if (!rec) {
      console.warn(`  Record ${item.todayId} not found!`);
      continue;
    }

    // Ensure we have pdfBytes
    let pdfBytes = rec.pdfBytes;
    if (!pdfBytes && rec.uploadedFile?.storagePath && rec.uploadedFile?.storageProvider === 'google_drive') {
      try {
        pdfBytes = await downloadGoogleDriveFile(rec.uploadedFile.storagePath);
        console.log(`  Downloaded PDF from Drive: ${pdfBytes.length} bytes`);
      } catch (err) {
        console.warn(`  Warning downloading Drive PDF:`, err.message);
      }
    }

    // Merge data & reviewedData
    const updatedReviewedData = {
      ...(rec.reviewedData || {}),
      savedAt: targetDate.toISOString(),
      createdAt: targetDate.toISOString(),
      updatedAt: targetDate.toISOString(),
      policyStartDate: item.date,
      startDate: item.date,
      contactPerson: item.contactName,
      contactPersonName: item.contactName,
      contactNumber: item.mobile,
      customerMobile: item.mobile
    };

    const updatedData = {
      ...(rec.data || {}),
      savedAt: targetDate.toISOString(),
      createdAt: targetDate.toISOString(),
      updatedAt: targetDate.toISOString(),
      policyStartDate: item.date,
      startDate: item.date,
      contactPerson: item.contactName,
      contactPersonName: item.contactName,
      contactNumber: item.mobile,
      customerMobile: item.mobile
    };

    // Update today's record
    await prisma.policyRecord.update({
      where: { id: item.todayId },
      data: {
        savedAt: targetDate,
        createdAt: targetDate,
        updatedAt: targetDate,
        contactPersonName: item.contactName,
        contactPersonMobile: item.mobile,
        renewalRecipientName: item.contactName,
        renewalRecipientMobile: item.mobile,
        reviewedData: updatedReviewedData,
        data: updatedData,
        ...(pdfBytes ? { pdfBytes } : {})
      }
    });
    console.log(`  ✓ Updated ${item.todayId} to SavedAt: ${item.date}, Contact: ${item.contactName} (${item.mobile})`);

    // Soft delete the old duplicate version so user sees only 1 clean active entry in August
    if (item.oldId && item.oldId !== item.todayId) {
      await prisma.policyRecord.update({
        where: { id: item.oldId },
        data: {
          deletedAt: new Date(),
          isActivePolicy: false
        }
      });
      console.log(`  ✓ Soft-deleted old duplicate ${item.oldId}`);
    }
  }

  console.log(`\n=== ALL 21 RECORDS MOVED TO AUGUST 2026 SUCCESSFULLY ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
