import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const newPassword = 'insure_desk_2026_9009';
(async () => {
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email: 'admin@insure.com' },
    data: { password: hash },
  });
  console.log('Admin password updated');
  await prisma.$disconnect();
})();
