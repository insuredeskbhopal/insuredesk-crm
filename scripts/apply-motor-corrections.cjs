require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CORRECTIONS = [
  {
    match: { vehicleNumber: 'MP17DA1282' },
    updates: {
      insuranceCompany: 'The New India Assurance Company Limited',
      companyName: 'The New India Assurance Company Limited',
      policyNumber: '45140031260100005565',
      netPremium: '8337',
      basicPremium: '8337',
      grossPremium: '9838',
      totalPremium: '9838',
      premium: '9838',
      idv: '1320000',
      sumInsured: '1320000',
      ncb: '45%',
      ncbPercentage: '45%',
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'Comprehensive',
      policyType: 'COMMERCIAL - PACKAGE'
    }
  },
  {
    match: { policyNumber: '3001/454452964/00/000' }, // Vivek Chourasia
    updates: {
      ncb: '0%',
      ncbPercentage: '0%',
      vehicleNumber: 'NEW',
      registrationNumber: 'NEW',
      newOrRenewal: 'NEW'
    }
  },
  {
    match: { vehicleNumber: 'MP04YB6002' }, // Manpreet Kaur Gandhi
    updates: {
      netPremium: '29337',
      basicPremium: '29337',
      grossPremium: '34618',
      totalPremium: '34618',
      premium: '34618',
      ncb: '0%',
      ncbPercentage: '0%',
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'OD'
    }
  },
  {
    match: { vehicleNumber: 'MP04CV4709' }, // Anwarul Haque
    updates: {
      idv: '198900',
      sumInsured: '198900',
      ncb: '25%',
      ncbPercentage: '25%',
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04ZN5439' }, // Deepak Lokhande
    updates: {
      insuranceCompany: 'IFFCO Tokio General Insurance Company Limited',
      companyName: 'IFFCO Tokio General Insurance Company Limited',
      policyNumber: 'N8586996',
      netPremium: '353',
      basicPremium: '353',
      grossPremium: '682.04',
      totalPremium: '682.04',
      premium: '682.04',
      idv: '54000',
      sumInsured: '54000',
      ncb: '35%',
      ncbPercentage: '35%',
      policyCoverType: 'OD',
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04YB8473' }, // Reena Pal
    updates: {
      policyCoverType: 'OD',
      coverType: 'OD',
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04GA3158' }, // Arvind Kumar Mishra
    updates: {
      policyCoverType: 'TP',
      coverType: 'TP',
      idv: '',
      sumInsured: '',
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04SD1940' }, // Atul Sharma
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'TP',
      coverType: 'TP',
      idv: '',
      sumInsured: ''
    }
  },
  {
    match: { vehicleNumber: 'MP04SG0469' }, // Satheesh Babu
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'TP',
      coverType: 'TP',
      idv: '',
      sumInsured: ''
    }
  },
  {
    match: { vehicleNumber: 'MP04QF7290' }, // Khandelwal Enterprises
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'TP',
      coverType: 'TP',
      idv: '',
      sumInsured: ''
    }
  },
  {
    match: { vehicleNumber: 'MP04HC0190' }, // Avatar Singh
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'TP',
      coverType: 'TP',
      idv: '',
      sumInsured: ''
    }
  },
  {
    match: { vehicleNumber: 'MP04MW9567' }, // Vipul Chaturvedi
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'TP',
      coverType: 'TP',
      idv: '',
      sumInsured: ''
    }
  },
  {
    match: { vehicleNumber: 'MP04ST9211' }, // Abha Choubey
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'TP',
      coverType: 'TP',
      idv: '',
      sumInsured: ''
    }
  },
  {
    match: { vehicleNumber: 'MP13ZZ1403' }, // Malkhan Singh
    updates: {
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP07ZS3346' }, // Kuldeep Singh
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'OD'
    }
  },
  {
    match: { vehicleNumber: 'MP41ZD2311' }, // Kailash Chandra Garg
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'OD'
    }
  },
  {
    match: { vehicleNumber: 'MP04CT2271' }, // Vipin Kumar Tripathi
    updates: {
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04YB6081' }, // Sanjay Vinchankar
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'OD'
    }
  },
  {
    match: { vehicleNumber: 'MP17ZN7523' }, // Shukla Agritech
    updates: {
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04YH6092' }, // Prabhjot Kaur
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'OD'
    }
  },
  {
    match: { vehicleNumber: 'MP04YH6016' }, // Arjinder Kour
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'OD'
    }
  },
  {
    match: { vehicleNumber: 'MP04CP5137' }, // Harvinder Kaur Oberoi
    updates: {
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04YS4461' }, // Sudesh The Village Resort
    updates: {
      newOrRenewal: 'RENEWAL'
    }
  },
  {
    match: { vehicleNumber: 'MP04YS0136' }, // M/S Ganpati Traders
    updates: {
      newOrRenewal: 'RENEWAL',
      policyCoverType: 'OD'
    }
  },
  {
    match: { vehicleNumber: 'MP04VC8797' }, // Santosh Kushwaha
    updates: {
      newOrRenewal: 'RENEWAL',
      ncb: '0%',
      ncbPercentage: '0%'
    }
  }
];

async function applyCorrections() {
  console.log(`Starting to apply ${CORRECTIONS.length} corrections...`);

  for (const item of CORRECTIONS) {
    let whereClause = { deletedAt: null };
    if (item.match.vehicleNumber) {
      whereClause = {
        deletedAt: null,
        OR: [
          { data: { path: ['vehicleNumber'], equals: item.match.vehicleNumber } },
          { data: { path: ['registrationNumber'], equals: item.match.vehicleNumber } },
          { reviewedData: { path: ['vehicleNumber'], equals: item.match.vehicleNumber } },
          { reviewedData: { path: ['registrationNumber'], equals: item.match.vehicleNumber } }
        ]
      };
    } else if (item.match.policyNumber) {
      whereClause = {
        deletedAt: null,
        OR: [
          { data: { path: ['policyNumber'], equals: item.match.policyNumber } },
          { reviewedData: { path: ['policyNumber'], equals: item.match.policyNumber } }
        ]
      };
    }

    const record = await prisma.policyRecord.findFirst({ where: whereClause });
    if (!record) {
      console.warn('Record not found for match:', item.match);
      continue;
    }

    const updatedData = { ...(record.data || {}), ...item.updates };
    const updatedReviewedData = { ...(record.reviewedData || {}), ...item.updates };

    await prisma.policyRecord.update({
      where: { id: record.id },
      data: {
        data: updatedData,
        reviewedData: updatedReviewedData
      }
    });

    console.log(`Updated record ${record.id} for match:`, item.match);
  }

  console.log('All corrections successfully applied.');
}

applyCorrections().finally(() => prisma.$disconnect());
