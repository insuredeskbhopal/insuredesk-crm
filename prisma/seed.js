import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@insure.com';
  const adminPassword = 'insure_desk_2026_9009';

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log('Admin user already exists.');
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashed,
      role: 'SUPER_ADMIN',
      // Assuming organization is optional; you can assign a default org if needed.
    },
  });

  console.log('Admin user created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
