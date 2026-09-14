require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'd0309f15-cf1f-4738-a809-4f2acfc569fa',
    '28e9e938-9aed-4f06-af46-bac85d117628',
    'c1ca783e-a41a-4a2e-aa73-0cdf3c15ec2a'
  ];

  for (const id of ids) {
    const recs = await prisma.$queryRaw`SELECT id, pdf_file_name, reviewed_data FROM pdf_records WHERE id = ${id}::uuid`;
    const r = recs[0];
    console.log('ID:', r.id);
    console.log('PDF:', r.pdf_file_name);
    console.log('Category:', r.reviewed_data?.documentCategory);
    console.log('Reg:', r.reviewed_data?.registrationNumber);
    console.log('Veh:', r.reviewed_data?.vehicleNumber);
    console.log('Chassis:', r.reviewed_data?.chassisNumber);
    console.log('Policy Type:', r.reviewed_data?.policyType);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
