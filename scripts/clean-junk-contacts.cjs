require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanJunkContacts() {
  const ids = [
    '12ae5ead-18dd-44b0-9a76-d898d6fb69d8',
    'f9070176-7ae0-4bb0-8d18-3eb833e1fa9e',
    'adc0eb73-f643-4cb9-a20d-5245281e3975',
    '34c0c631-ab42-4c4e-8ff6-919328831336',
    '3f081f6b-a5e4-42ed-8b4c-b5cd90f0547f'
  ];
  for (const id of ids) {
    const r = await prisma.policyRecord.findUnique({ where: { id } });
    if (!r) continue;
    const d = { ...(r.data || {}) };
    const rev = { ...(r.reviewedData || {}) };
    delete d.contactPerson;
    delete rev.contactPerson;
    await prisma.policyRecord.update({
      where: { id },
      data: {
        contactPersonName: null,
        data: d,
        reviewedData: rev
      }
    });
    console.log('Cleaned junk contact for', id, r.pdfFileName);
  }
}

cleanJunkContacts()
  .then(() => console.log('Successfully cleaned junk contact strings.'))
  .finally(() => prisma.$disconnect());
