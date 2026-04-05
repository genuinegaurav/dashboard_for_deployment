require('dotenv').config();

const { PrismaClient, UserRole, UserStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,128}$/;

function getFlagValue(name) {
  const prefixed = `--${name}=`;
  const matched = process.argv.find((argument) => argument.startsWith(prefixed));

  if (matched) {
    return matched.slice(prefixed.length).trim();
  }

  const index = process.argv.findIndex((argument) => argument === `--${name}`);

  if (index >= 0) {
    return process.argv[index + 1]?.trim();
  }

  return undefined;
}

function assertRequired(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function main() {
  const email = normalizeEmail(assertRequired(getFlagValue('email'), 'email'));
  const name = assertRequired(getFlagValue('name'), 'name').trim();
  const password = assertRequired(getFlagValue('password'), 'password');
  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);

  if (!STRONG_PASSWORD_REGEX.test(password)) {
    throw new Error(
      'password must be 12-128 characters and include uppercase, lowercase, number, and special character',
    );
  }

  if (!process.env.DATABASE_URL || /__REPLACE_ME/i.test(process.env.DATABASE_URL)) {
    throw new Error('DATABASE_URL must be configured before bootstrapping an admin user');
  }

  const existingAdminCount = await prisma.user.count({
    where: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  if (existingAdminCount > 0) {
    throw new Error(
      'An active admin already exists. Use the authenticated user-management APIs for subsequent admin provisioning.',
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  console.log('Bootstrap admin created successfully.');
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
