const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting Verification for Tiers and Categories...');

  // 1. Create Categories
  console.log('1. Creating Categories...');
  const mainCat = await prisma.category.create({
    data: { name: 'Main Course', description: 'Primary meals' }
  });
  const subCat = await prisma.category.create({
    data: { name: 'North Indian', parentId: mainCat.id }
  });
  console.log('   Categories created:', mainCat.name, '>', subCat.name);

  // 2. Create MenuItem
  console.log('2. Creating MenuItem...');
  const item = await prisma.menuItem.create({
    data: {
      name: 'Paneer Butter Masala',
      categoryId: subCat.id,
      description: 'Rich creamy curry'
    }
  });
  console.log('   MenuItem created:', item.name);

  // 3. Create MealPackage (Premium)
  console.log('3. Creating MealPackage (PREMIUM)...');
  const pkg = await prisma.mealPackage.create({
    data: {
      name: 'Premium North Veg',
      dietType: 'Veg',
      cuisineType: 'North',
      tier: 'PREMIUM', // Testing Tier
      durationDays: 30,
      price: 5000,
      defaultContainer: 'CP_3',
    }
  });
  console.log('   MealPackage created:', pkg.name, 'Tier:', pkg.tier);

  // 4. Create WeeklyMenu
  console.log('4. Creating WeeklyMenu...');
  const mondayDate = new Date();
  // Set to next Monday to avoid conflict or just a future date
  mondayDate.setDate(mondayDate.getDate() + (1 + 7 - mondayDate.getDay()) % 7);
  mondayDate.setHours(0,0,0,0);

  const menu = await prisma.weeklyMenu.create({
    data: {
      dietType: 'Veg',
      cuisineType: 'North',
      tier: 'PREMIUM',
      weekStartDate: mondayDate,
      items: {
        create: [
          {
            itemType: 'Lunch_Curry',
            dayOfWeek: 1, // Monday
            itemName: item.name, // Fallback
            menuItemId: item.id
          }
        ]
      }
    },
    include: { items: true }
  });
  console.log('   WeeklyMenu created with', menu.items.length, 'items');

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
