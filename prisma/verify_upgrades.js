const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting Verification for Upgrades...');

  // 1. Setup Data: User, MealPackage(Regular), Subscription
  console.log('1. Setting up Base Data...');
  // Find or Create User (using dummy UUID or creating one)
  const user = await prisma.user.create({
    data: { phoneNumber: '+919999999999', role: 'USER' }
  });
  
  // Create CommonPoint & Address
  const cp = await prisma.commonPoint.create({ data: { name: 'CP Test' } });
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      tag: 'home',
      addressLine1: 'Test Addr',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      commonPointId: cp.id
    }
  });

  // Create Regular Package
  const regularPkg = await prisma.mealPackage.create({
    data: {
      name: 'Regular Veg',
      dietType: 'Veg',
      cuisineType: 'North',
      tier: 'REGULAR',
      durationDays: 30,
      price: 3000,
      defaultContainer: 'CP_3'
    }
  });

  // Create Subscription
  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      mealPackageId: regularPkg.id,
      addressId: address.id,
      containerType: 'plastic',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 29)),
      status: 'active'
    }
  });
  console.log('  Subscription Created:', sub.id);

  // 2. Create Upgrade Price (Regular Veg -> Premium Veg per Meal)
  console.log('2. Creating Upgrade Price...');
  await prisma.upgradePrice.create({
    data: {
      name: 'Upgrade to Premium Veg (Lunch)',
      fromTier: 'REGULAR',
      toTier: 'PREMIUM',
      fromDiet: 'Veg',
      toDiet: 'Veg',
      scope: 'MEAL',
      mealType: 'lunch', // Assuming lowercase or matched enum
      price: 50
    }
  });

  // 3. Simulate Upgrade Request
  console.log('3. Simulating Upgrade Request...');
  // Logic from controller: find price, create record.
  // We'll mimic the controller logic here by calling Prisma directly (Integration Test style)
  // or we could use `axios` if server was running using run_command. 
  // Let's use Prisma to verify constraints/foreign keys work.
  
  const upgradePrice = await prisma.upgradePrice.findFirst({
      where: {
          fromTier: 'REGULAR',
          toTier: 'PREMIUM',
          scope: 'MEAL',
          mealType: 'lunch'
      }
  });
  
  if (!upgradePrice) throw new Error('Upgrade Price not found!');

  const upgrade = await prisma.subscriptionUpgrade.create({
    data: {
      subscriptionId: sub.id,
      targetTier: 'PREMIUM',
      targetDiet: 'Veg',
      originalTier: 'REGULAR',
      originalDiet: 'Veg',
      scope: 'MEAL',
      mealType: 'lunch',
      startDate: new Date(),
      endDate: new Date(),
      price: upgradePrice.price
    }
  });
  
  console.log('  Upgrade Record Created:', upgrade.id, 'Price:', upgrade.price);
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
