require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.policyRecord.findUnique({
    where: { id: '12ae5ead-18dd-44b0-9a76-d898d6fb69d8' }
  });
  console.log('PDF File:', r.pdf_file_name);
  console.log('Format:', r.data?.documentFormat);
  console.log('Insurer:', r.data?.insuranceCompany);
  console.log('contactPerson in data:', JSON.stringify(r.data?.contactPerson));
  console.log('contactPerson in reviewed:', JSON.stringify(r.reviewed_data?.contactPerson));
  console.log('contactNumber in data:', JSON.stringify(r.data?.contactNumber));
  console.log('phoneNumber in data:', JSON.stringify(r.data?.phoneNumber));
  console.log('insuredName:', JSON.stringify(r.data?.insuredName));
  console.log('communicationAddress:', JSON.stringify(r.data?.communicationAddress));
  console.log('mailingAddress:', JSON.stringify(r.data?.mailingAddress));
}

main().finally(() => prisma.$disconnect());
