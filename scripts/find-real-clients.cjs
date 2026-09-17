const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Finding Real Clients with Real Policies in Database ---');

  // Query ClientAccounts
  const clients = await prisma.clientAccount.findMany({
    where: {
      deletedAt: null,
      phone: { not: { contains: '999999' } }
    },
    take: 30
  });

  console.log(`Found ${clients.length} real ClientAccounts.`);

  for (const client of clients) {
    const cleanPhone = (client.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const clientName = (client.name || '').trim();

    const matchedPolicies = await prisma.$queryRaw`
      SELECT id, 
             COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') as policy_no,
             COALESCE(reviewed_data->>'insuranceCompany', data->>'insuranceCompany', selected_company) as company,
             COALESCE(reviewed_data->>'totalPremium', data->>'totalPremium', data->>'premium') as premium,
             COALESCE(reviewed_data->>'policyType', data->>'policyType', selected_policy_type) as policy_type
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND (
          LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId', '')) = LOWER(${client.id})
          OR (${cleanPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', '') LIKE ${'%' + cleanPhone + '%'})
          OR (${cleanPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', '') LIKE ${'%' + cleanPhone + '%'})
          OR (${cleanPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', '') LIKE ${'%' + cleanPhone + '%'})
          OR (${clientName} != '' AND LOWER(COALESCE(NULLIF(reviewed_data->>'insuredName', ''), data->>'insuredName', '')) = LOWER(${clientName}))
        )
    `;

    // Check if MPIN credential exists
    const cred = await prisma.task.findUnique({
      where: { sourceKey: `client-credential:${client.id}` }
    });

    if (matchedPolicies.length > 0) {
      console.log('\n========================================');
      console.log('CLIENT FOUND WITH REAL POLICIES:');
      console.log('Client ID   :', client.id);
      console.log('Name        :', client.name);
      console.log('Phone       :', client.phone);
      console.log('Email       :', client.email);
      console.log('Has MPIN?   :', !!cred);
      console.log('Policy Count:', matchedPolicies.length);
      console.log('Sample Policy:', matchedPolicies[0]);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
