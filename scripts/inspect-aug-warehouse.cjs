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
      p.data->>'phoneNumber' as data_phone,
      p.data->>'mobile' as data_mobile,
      p.reviewed_data->>'contactPerson' as rev_cp,
      p.reviewed_data->>'contactNumber' as rev_cn,
      p.reviewed_data->>'phoneNumber' as rev_phone,
      p.reviewed_data->>'mobile' as rev_mobile
    FROM pdf_records p
    WHERE p.deleted_at IS NULL
      AND p.saved_at >= '2026-08-01'::timestamptz 
      AND p.saved_at <= '2026-08-31 23:59:59.999'::timestamptz
      AND (
        p.data->>'documentCategory' ILIKE '%warehouse%' 
        OR p.data->>'documentCategory' ILIKE '%fire%'
        OR p.data->>'policyCategory' ILIKE '%warehouse%'
        OR p.data->>'policyCategory' ILIKE '%fire%'
        OR p.data->>'policyType' ILIKE '%warehouse%'
        OR p.data->>'policyType' ILIKE '%fire%'
      )
    ORDER BY p.saved_at DESC
  `;

  console.log(`Found ${records.length} August warehouse records.`);
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    console.log(`[${i + 1}] ID: ${r.id} | Insured: ${r.insured_name} | Pol: ${r.policy_number}`);
    console.log(`    DB contact_person_name: ${JSON.stringify(r.contact_person_name)}`);
    console.log(`    DB contact_person_mobile: ${JSON.stringify(r.contact_person_mobile)}`);
    console.log(`    data.cp: ${JSON.stringify(r.data_cp ? r.data_cp.slice(0, 80) : null)}`);
    console.log(`    data.cn: ${JSON.stringify(r.data_cn)}`);
    console.log(`    data.phone: ${JSON.stringify(r.data_phone)}`);
    console.log(`    data.mobile: ${JSON.stringify(r.data_mobile)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
