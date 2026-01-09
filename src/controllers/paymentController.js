const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { upload } = require("../utils/cloudinary");

// Get Payment Config (User side - public or auth)
exports.getPaymentConfig = async (req, res) => {
  try {
    const details = await prisma.adminPaymentDetails.findFirst({
      where: { isActive: true },
      select: {
        bankName: true,
        accountNumber: true,
        ifscCode: true,
        accountHolderName: true,
        upiId: true,
        qrCodeUrl: true,
      },
      orderBy: { createdAt: "desc" },
    }); // Users see only active details

    res.json({ data: { details } });
  } catch (error) {
    console.error("Get Payment Config Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};

// Submit Payment Proof
exports.submitPaymentProof = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subscriptionId,
      curryTokenPackageId,
      amount,
      transactionId,
      payerName,
      payerMobile,
    } = req.body;

    // Check if file uploaded
    if (!req.file) {
      return res
        .status(400)
        .json({ error: { message: "Screenshot is required" } });
    }

    const screenshotUrl = req.file.path; // Cloudinary URL

    // Validate Subscription or Curry Package
    if (!subscriptionId && !curryTokenPackageId) {
      return res.status(400).json({
        error: {
          message: "Must provide subscriptionId or curryTokenPackageId",
        },
      });
    }

    // Check for duplicate transaction ID?
    const existing = await prisma.paymentProof.findFirst({
      where: { transactionId: transactionId }, // Simple check
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: { message: "Transaction ID already submitted" } });
    }

    // Create Proof
    const proof = await prisma.paymentProof.create({
      data: {
        userId,
        subscriptionId,
        curryTokenPackageId,
        amount: parseFloat(amount),
        transactionId,
        screenshotUrl,
        payerName,
        payerMobile,
        status: "PENDING",
      },
    });

    // Update Subscription Status to 'payment_review' if subscriptionId
    if (subscriptionId) {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: "payment_review" },
      });
    }

    res.status(201).json({
      data: { proof },
      message: "Payment submitted successfully. Pending verification.",
    });
  } catch (error) {
    console.error("Submit Payment Proof Error:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
};
