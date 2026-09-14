require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.policyRecord.findUnique({
    where: { id: '12ae5ead-18dd-44b0-9a76-d898d6fb69d8' }
  });
  console.log('extracted_data keys:', Object.keys(r.extractedData || {}));
  console.log('extracted_data.contactPerson:', JSON.stringify(r.extractedData?.contactPerson));
  console.log('data.contactPerson:', JSON.stringify(r.data?.contactPerson));
  console.log('data.insuredName:', JSON.stringify(r.data?.insuredName));
  console.log('data.customerName:', JSON.stringify(r.data?.customerName));
  console.log('data.communicationAddress:', JSON.stringify(r.data?.communicationAddress));
  
  // Let's check how contactPerson is formed or where the match happened in rawText
  if (r.rawText) {
    const text = r.rawText;
    console.log('rawText length:', text.length);
    const propMatch =
      text.match(/PROP(?:RIETOR)?\.?\s+([A-Za-z\s]+?)(?:,|\s+JASALPUR|\s+TEH|\s+DIST|\s+MADHYA|\n)/i) ||
      text.match(/Contact\s+Person\s*[:\s]*([^\n]+)/i);
    console.log('propMatch:', propMatch ? propMatch[0] : null);

    const custMatch = text.match(/Name\s+of\s+the\s+Customer\s*[:\s]*\n?\s*([^\n]+)/i);
    console.log('custMatch:', custMatch ? custMatch[0] : null);

    const dateNameMatch = text.match(/Date\s*:\s*[^\n]+\n\s*([A-Za-z0-9\s.,&/-]+?)(?=\s*PLOT|\s*185,|\s*SHOP|\s*WARD|\s*NEAR|\s*VILLAGE|\s*HOUSE|\s*KHASRA|\s*MAILING|\s*Policy\s+No|\n\n)/i);
    console.log('dateNameMatch:', dateNameMatch ? dateNameMatch[0] : null);
  }
}

main().finally(() => prisma.$disconnect());
