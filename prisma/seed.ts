import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@arrivealarm.com';
  const plainPassword = 'AdminPassword123!';
  const name = 'System Administrator';

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
    },
    create: {
      email,
      name,
      passwordHash,
      timezone: 'Asia/Kolkata',
      settings: {
        create: {},
      },
    },
  });

  console.log(`✅ Admin account created/updated successfully:`);
  console.log(`   Email:    ${user.email}`);
  console.log(`   Password: ${plainPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
