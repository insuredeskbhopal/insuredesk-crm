require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.$queryRaw`
    SELECT 
      p.id,
      p.saved_at,
      p.contact_person_name,
      p.contact_person_mobile,
      p.data->>'policyNumber' as policy_number,
      p.data->>'insuredName' as insured_name,
      p.data->>'documentCategory' as doc_category,
      p.data->>'policyCategory' as policy_category,
      p.data->>'contactPerson' as data_cp,
      p.data->>'contactNumber' as data_cn,
      p.data->>'mobile' as data_mobile,
      p.data->>'phoneNumber' as data_phone,
      p.reviewed_data->>'contactPerson' as rev_cp,
      p.reviewed_data->>'contactNumber' as rev_cn,
      p.reviewed_data->>'phoneNumber' as rev_phone,
      p.reviewed_data->>'mobile' as rev_mobile
    FROM pdf_records p
    WHERE p.deleted_at IS NULL
      AND (
        p.data->>'documentCategory' ILIKE '%warehouse%' 
        OR p.data->>'documentCategory' ILIKE '%fire%'
        OR p.data->>'policyCategory' ILIKE '%warehouse%'
        OR p.data->>'policyCategory' ILIKE '%fire%'
      )
    ORDER BY p.saved_at DESC
  `;

  console.log(`Found ${records.length} warehouse/fire records.`);
  for (let i = 0; i < Math.min(records.length, 10); i++) {
    const r = records[i];
    console.log(`\n--- Record ${i + 1} (${r.id}) ---`);
    console.log(`Insured: ${r.insured_name}`);
    console.log(`Policy: ${r.policy_number}`);
    console.log(`DB contact_person_name: ${JSON.stringify(r.contact_person_name)}`);
    console.log(`DB contact_person_mobile: ${JSON.stringify(r.contact_person_mobile)}`);
    console.log(`data.contactPerson: ${JSON.stringify(r.data_cp ? r.data_cp.slice(0, 100) : null)}`);
    console.log(`data.phoneNumber: ${JSON.stringify(r.data_phone ? r.data_phone.slice(0, 100) : null)}`);
    console.log(`data.contactNumber: ${JSON.stringify(r.data_cn ? r.data_cn.slice(0, 100) : null)}`);
    console.log(`data.mobile: ${JSON.stringify(r.data_mobile ? r.data_mobile.slice(0, 100) : null)}`);
    console.log(`rev.contactPerson: ${JSON.stringify(r.rev_cp ? r.rev_cp.slice(0, 100) : null)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
