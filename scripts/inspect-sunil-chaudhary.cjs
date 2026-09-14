require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rec = await prisma.$queryRaw`
    SELECT id, pdf_file_name, reviewed_data, data
    FROM pdf_records
    WHERE id = 'd56b846f-eba8-4039-9d63-9db8c22d3e3d'::uuid
  `;

  const r = rec[0];
  console.log('ID:', r.id);
  console.log('File:', r.pdf_file_name);
  console.log('Reviewed reg:', r.reviewed_data?.registrationNumber);
  console.log('Reviewed veh:', r.reviewed_data?.vehicleNumber);
  console.log('Data reg:', r.data?.registrationNumber);
  console.log('Data veh:', r.data?.vehicleNumber);
}

main().catch(console.error).finally(() => prisma.$disconnect());
