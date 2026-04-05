require('dotenv').config();

const { PrismaClient, RecordType, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development seed script must not be used in production.');
  }

  if (!process.env.DATABASE_URL || /__REPLACE_ME/i.test(process.env.DATABASE_URL)) {
    throw new Error('DATABASE_URL must be configured before running the seed script.');
  }

  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 10);
  const passwordHash = await bcrypt.hash('Password123!', bcryptRounds);

  const seededUsers = [
    {
      email: 'admin@finance.local',
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'analyst@finance.local',
      name: 'Analyst User',
      role: UserRole.ANALYST,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'viewer@finance.local',
      name: 'Viewer User',
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'inactive@finance.local',
      name: 'Inactive User',
      role: UserRole.VIEWER,
      status: UserStatus.INACTIVE,
    },
  ];

  for (const user of seededUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        status: user.status,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@finance.local' },
  });

  if (!admin) {
    throw new Error('Seed admin user could not be loaded.');
  }

  const existingRecordCount = await prisma.financialRecord.count();

  if (existingRecordCount === 0) {
    await prisma.financialRecord.createMany({
      data: [
        {
          amountInCents: 450000,
          type: RecordType.INCOME,
          category: 'salary',
          recordDate: daysAgo(28),
          notes: 'Monthly salary',
          createdByUserId: admin.id,
        },
        {
          amountInCents: 72000,
          type: RecordType.EXPENSE,
          category: 'rent',
          recordDate: daysAgo(24),
          notes: 'Apartment rent',
          createdByUserId: admin.id,
        },
        {
          amountInCents: 18000,
          type: RecordType.EXPENSE,
          category: 'groceries',
          recordDate: daysAgo(18),
          notes: 'Groceries and essentials',
          createdByUserId: admin.id,
        },
        {
          amountInCents: 40000,
          type: RecordType.INCOME,
          category: 'freelance',
          recordDate: daysAgo(10),
          notes: 'Freelance payment',
          createdByUserId: admin.id,
        },
        {
          amountInCents: 9500,
          type: RecordType.EXPENSE,
          category: 'transport',
          recordDate: daysAgo(4),
          notes: 'Local commute',
          createdByUserId: admin.id,
        },
      ],
    });
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
