const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting legacy users...');
  // Delete users where email is null (which is all mobile users)
  // Since we haven't updated the DB schema yet, we can't filter by email if it didn't exist or we can?
  // Use deleteMany({}) to clear all users if that's acceptable.
  // "completely remove firebase auth" -> existing users are invalid anyway.
  

  const usersToDelete = await prisma.user.findMany({
    where: { email: null },
    select: { id: true }
  });

  const userIds = usersToDelete.map(u => u.id);
  console.log(`Found ${userIds.length} legacy users.`);

  if (userIds.length > 0) {
    // Delete related data manually to satisfy constraints
    await prisma.subscriptionUpgrade.deleteMany({ where: { subscription: { userId: { in: userIds } } } });
    await prisma.mealPause.deleteMany({ where: { subscription: { userId: { in: userIds } } } });
    await prisma.subscriptionMeal.deleteMany({ where: { subscription: { userId: { in: userIds } } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    
    await prisma.curryOrder.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.curryWallet.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.issue.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.deliveryGroup.deleteMany({ where: { userId: { in: userIds } } });

    const deleted = await prisma.user.deleteMany({
      where: {
        id: { in: userIds }
      }
    });
    console.log(`Deleted ${deleted.count} users.`);
  }

  console.log(`Deleted ${deleted.count} users.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
