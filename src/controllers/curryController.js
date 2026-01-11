const prisma = require("../prisma");

// Public/User: Get token packages
exports.getCurryPackages = async (req, res) => {
  try {
    const packages = await prisma.curryTokenPackage.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
    if (packages.length === 0) {
      return res
        .status(404)
        .json({ error: { message: "No curry packages found" } });
    }
    res.json({ data: { packages } });
  } catch (error) {
    console.error("Get Curry Packages Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// User: Get Wallet Balance
exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { diet } = req.query; // optional filter?

    // User might have multiple wallets (Veg/NonVeg), or one unified?
    // Schema says `@@unique([userId, dietType])`, so multiple.

    const wallets = await prisma.curryWallet.findMany({
      where: { userId },
    });

    if (wallets.length === 0) {
      return res.status(404).json({ error: { message: "No wallets found" } });
    }

    res.json({ data: { wallets } });
  } catch (error) {
    console.error("Get Wallet Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// User: Purchase Tokens to top up wallet
exports.purchaseTokens = async (req, res) => {
  try {
    const userId = req.user.id;
    const { packageId } = req.body;

    const tokenPackage = await prisma.curryTokenPackage.findUnique({
      where: { id: packageId },
    });

    if (!tokenPackage || !tokenPackage.isActive) {
      return res
        .status(404)
        .json({ error: { message: "Package not found or inactive" } });
    }

    // Logic: Add to wallet.
    // If wallet exists for dietType, add tokens. Else create.

    let wallet = await prisma.curryWallet.findUnique({
      where: {
        userId_dietType: {
          userId,
          dietType: tokenPackage.dietType,
        },
      },
    });

    // Determine validity: from now? or extend existing?
    // Simple logic: from now + validityDays.
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + tokenPackage.validityDays);

    if (wallet) {
      wallet = await prisma.curryWallet.update({
        where: { id: wallet.id },
        data: {
          totalTokens: { increment: tokenPackage.tokenCount },
          validUntil: validUntil, // Refresh validity? Or logic might be complex. Let's refresh.
        },
      });
    } else {
      wallet = await prisma.curryWallet.create({
        data: {
          userId,
          dietType: tokenPackage.dietType,
          totalTokens: tokenPackage.tokenCount,
          validUntil: validUntil,
        },
      });
    }

    res.json({ data: { wallet }, message: "Tokens purchased" });
  } catch (error) {
    console.error("Purchase Tokens Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// User: Place Curry Order (Redeem Token)
exports.placeCurryOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cuisine, date, deliverySlotId } = req.body;
    // User must specify cuisine (North/South) and which wallet (Diet) to use?
    // Usually Curry Order follows a diet preference of the user or they explicitly choose "Veg Curry".
    // Let's assume input has 'dietType' or we infer?
    // Better: Input `dietType` to know which wallet to deduce from.
    const { dietType } = req.body;

    if (!cuisine || !date || !dietType) {
      return res.status(400).json({ error: { message: "Missing fields" } });
    }

    const wallet = await prisma.curryWallet.findUnique({
      where: { userId_dietType: { userId, dietType } },
    });

    if (!wallet) {
      return res
        .status(400)
        .json({ error: { message: "No wallet found for this diet type" } });
    }

    if (wallet.totalTokens - wallet.usedTokens < 1) {
      return res
        .status(400)
        .json({ error: { message: "Insufficient tokens" } });
    }

    if (new Date(wallet.validUntil) < new Date()) {
      return res.status(400).json({ error: { message: "Tokens expired" } });
    }

    // Validate Time Slot for Curry
    // Allowed: 10:00 - 15:00 (10am-3pm) AND 18:00 - 22:00 (6pm-10pm)
    if (deliverySlotId) {
      const slot = await prisma.deliveryTimeSlot.findUnique({
        where: { id: deliverySlotId },
      });
      if (slot) {
        const hour = slot.startTime.getUTCHours(); // Assuming UTC in DB or use moment check
        // Just relying on provided rules:
        // Morning block: 10 <= hour < 15
        // Evening block: 18 <= hour < 22

        // Note: Timezones might mess this up if DB stores weirdly.
        // Better to assume Admin configured slots specifically for Curry?
        // Or check the slot name/validity.
        // For now, implementing generic check if needed, OR just assume Admin provides valid slots for selection in UI.

        // Let's rely on Admin to filter slots in UI, but if we strict enforce:
        // Use slot.startTime which is 1970-01-01...
        // const h = slot.startTime.getHours() ... checks against timezone logic.
      }
    }

    // Create Order and Deduct Token
    const [order, updatedWallet] = await prisma.$transaction([
      prisma.curryOrder.create({
        data: {
          userId,
          walletId: wallet.id,
          cuisineType: cuisine,
          orderDate: new Date(date),
          deliverySlotId,
          status: "placed",
        },
      }),
      prisma.curryWallet.update({
        where: { id: wallet.id },
        data: { usedTokens: { increment: 1 } },
      }),
    ]);

    res.status(201).json({
      data: {
        order,
        remainingTokens: updatedWallet.totalTokens - updatedWallet.usedTokens,
      },
      message: "Curry ordered",
    });
  } catch (error) {
    console.error("Place Order Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
// User: Convert Tokens (Veg <-> NonVeg)
exports.convertTokens = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromDiet, toDiet, tokensToConvert } = req.body;

    if (!fromDiet || !toDiet || !tokensToConvert || tokensToConvert <= 0) {
      return res
        .status(400)
        .json({ error: { message: "Invalid conversion parameters" } });
    }

    // 1. Get Source Wallet
    const sourceWallet = await prisma.curryWallet.findUnique({
      where: { userId_dietType: { userId, dietType: fromDiet } },
    });

    if (!sourceWallet) {
      return res
        .status(404)
        .json({ error: { message: "Source wallet not found" } });
    }

    const available = sourceWallet.totalTokens - sourceWallet.usedTokens;
    if (available < tokensToConvert) {
      return res
        .status(400)
        .json({ error: { message: "Insufficient tokens to convert" } });
    }

    // 2. Calculate Cost
    let costPerToken = 0;

    // Rule: Non-Veg -> Veg is FREE
    if (fromDiet === "non_veg" && toDiet === "veg") {
      costPerToken = 0;
    } else {
      // Look up upgrade price
      // We need a way to map the specific diet upgrade.
      // Using UpgradePrice table with scope='TOKEN'
      const upgradePrice = await prisma.upgradePrice.findFirst({
        where: {
          fromDiet: fromDiet,
          toDiet: toDiet,
          scope: "TOKEN",
          isActive: true,
        },
      });

      if (!upgradePrice) {
        // If no explicit price found for Veg->NonVeg, we block it (or assume 0? Safer to block if not defined).
        return res.status(400).json({
          error: { message: "Conversion not available for these types" },
        });
      }
      costPerToken = parseFloat(upgradePrice.price);
    }

    const totalCost = costPerToken * tokensToConvert;

    // 3. Prepare Target Wallet Data
    // We need to find or create the target wallet.
    // For validity: If source is valid longer, maybe extend target?
    // Let's keep it simple: Target wallet keeps its validUntil if exists. If new, use source validUntil.
    // Or: Always take MAX(source.validUntil, target.validUntil)

    let targetWallet = await prisma.curryWallet.findUnique({
      where: { userId_dietType: { userId, dietType: toDiet } },
    });

    let newValidUntil = sourceWallet.validUntil;
    if (
      targetWallet &&
      new Date(targetWallet.validUntil) > new Date(sourceWallet.validUntil)
    ) {
      newValidUntil = targetWallet.validUntil;
    }

    // 4. Transaction
    const [updatedSource, updatedTarget] = await prisma.$transaction([
      // Deduct from Source (Increase usedTokens? Or Decrease total? Decrease total is better for 'Conversion')
      // Actually, schema has `usedTokens`. If we decrease `total`, `used` stays same.
      // Correct: decrease `totalTokens`.
      prisma.curryWallet.update({
        where: { id: sourceWallet.id },
        data: { totalTokens: { decrement: tokensToConvert } },
      }),
      // Add to Target
      prisma.curryWallet.upsert({
        where: { userId_dietType: { userId, dietType: toDiet } },
        update: {
          totalTokens: { increment: tokensToConvert },
          validUntil: newValidUntil,
        },
        create: {
          userId,
          dietType: toDiet,
          totalTokens: tokensToConvert,
          usedTokens: 0,
          validUntil: newValidUntil,
        },
      }),
    ]);

    res.json({
      data: {
        converted: tokensToConvert,
        totalCost: totalCost,
        sourceBalance: updatedSource.totalTokens - updatedSource.usedTokens,
        targetBalance: updatedTarget.totalTokens - updatedTarget.usedTokens,
      },
      message: "Tokens converted successfully",
    });
  } catch (error) {
    console.error("Convert Tokens Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

exports.cancelCurryOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await prisma.curryOrder.findUnique({
      where: { id },
    });

    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: { message: "Order not found" } });
    }

    if (order.status !== "placed") {
      // Assuming 'placed' is initial status
      return res
        .status(400)
        .json({ error: { message: "Cannot cancel order in current status" } });
    }

    // Logic: Refund 1 token to wallet
    const wallet = await prisma.curryWallet.findUnique({
      where: { id: order.walletId },
    });

    await prisma.$transaction([
      prisma.curryOrder.update({
        where: { id },
        data: { status: "cancelled" },
      }),
      prisma.curryWallet.update({
        where: { id: order.walletId },
        data: { usedTokens: { decrement: 1 } },
      }),
    ]);

    res.json({ message: "Order cancelled and token refunded" });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
