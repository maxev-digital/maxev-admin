import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('MaxEV2026!', 12);
  await prisma.adminUser.update({
    where: { email: 'admin@maxevdigital.com' },
    data: { passwordHash: hash },
  });
  console.log('Password reset to: MaxEV2026!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
