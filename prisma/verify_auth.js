const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
  console.log('Starting Verification for Email/Pass Auth...');

  // 1. Cleanup
  await prisma.user.deleteMany({ where: { email : { endsWith: '@example.com' } } });

  // 2. Simulate Signup
  console.log('1. Creating User (Signup)...');
  const email = 'testuser@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Test User',
      role: 'USER'
    }
  });
  console.log('   User created:', user.email);

  // 3. Simulate Login (Check Password)
  console.log('2. Verifying Creds (Login)...');
  const foundUser = await prisma.user.findUnique({ where: { email } });
  
  if (!foundUser) throw new Error('User not found');
  
  const valid = await bcrypt.compare(password, foundUser.password);
  if (!valid) throw new Error('Password mismatch');
  
  console.log('   Login successful (Password match).');
  
  console.log('Verification Successful!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
