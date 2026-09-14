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
      p.pdf_file_name,
      p.data->>'policyNumber' as pol_num,
      p.data->>'insuredName' as ins_name,
      p.data->>'contactPerson' as data_cp,
      p.data->>'contactNumber' as data_cn,
      p.data->>'phoneNumber' as data_phone,
      p.data->>'mobile' as data_mobile,
      p.data->>'communicationAddress' as comm_addr,
      p.data->>'mailingAddress' as mail_addr,
      p.reviewed_data->>'contactPerson' as rev_cp,
      p.reviewed_data->>'contactNumber' as rev_cn,
      p.reviewed_data->>'phoneNumber' as rev_phone,
      p.reviewed_data->>'mobile' as rev_mobile
    FROM pdf_records p
    WHERE p.deleted_at IS NULL
      AND (
        p.data::text ILIKE '%Pleasegothrough%'
        OR p.reviewed_data::text ILIKE '%Pleasegothrough%'
        OR p.contact_person_name ILIKE '%Pleasegothrough%'
      )
  `;

  console.log(`Found ${records.length} records containing 'Pleasegothrough':`);
  for (const r of records) {
    console.log(`\nID: ${r.id}`);
    console.log(`File: ${r.pdf_file_name}`);
    console.log(`Policy: ${r.pol_num}`);
    console.log(`Insured: ${r.ins_name}`);
    console.log(`DB contact_person_name: ${JSON.stringify(r.contact_person_name)}`);
    console.log(`DB contact_person_mobile: ${JSON.stringify(r.contact_person_mobile)}`);
    console.log(`data.contactPerson: ${JSON.stringify(r.data_cp ? r.data_cp.slice(0, 120) : null)}`);
    console.log(`data.contactNumber: ${JSON.stringify(r.data_cn)}`);
    console.log(`data.phoneNumber: ${JSON.stringify(r.data_phone)}`);
    console.log(`data.mobile: ${JSON.stringify(r.data_mobile)}`);
    console.log(`rev.contactPerson: ${JSON.stringify(r.rev_cp ? r.rev_cp.slice(0, 120) : null)}`);
    console.log(`rev.contactNumber: ${JSON.stringify(r.rev_cn)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
