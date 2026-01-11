const prisma = require("../prisma");
const { validatePincodeInternal } = require("./serviceabilityController");

exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await prisma.address.findMany({
      where: { userId },
      include: { commonPoint: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    res.json({
      data: {
        addresses,
      },
    });
  } catch (error) {
    console.error("Get Addresses Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // Check if this is the first address for the user
    const addressCount = await prisma.address.count({ where: { userId } });
    if (addressCount === 0) {
      data.isPrimary = true;
    }

    if (data.isPrimary) {
      // Unset other primary addresses
      await prisma.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Validate Pincode Serviceability
    if (data.pincode) {
      const validation = await validatePincodeInternal(data.pincode);
      if (!validation.valid) {
        return res.status(400).json({
          error: {
            message: validation.message,
            code: "SERVICE_NOT_AVAILABLE",
            status: 400,
          },
        });
      }
    }

    const address = await prisma.address.create({
      data: {
        ...data,
        userId,
      },
    });

    res.status(201).json({
      data: {
        address,
      },
      message: "Address created successfully",
    });
  } catch (error) {
    console.error("Create Address Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const data = req.body;

    // Verify ownership
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress || existingAddress.userId !== userId) {
      return res.status(404).json({
        error: {
          message: "Address not found or unauthorized",
          code: "NOT_FOUND",
          status: 404,
        },
      });
    }

    if (data.isPrimary) {
      // Unset other primary addresses
      await prisma.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Validate Pincode Serviceability if changing
    if (data.pincode) {
      const validation = await validatePincodeInternal(data.pincode);
      if (!validation.valid) {
        return res.status(400).json({
          error: {
            message: validation.message,
            code: "SERVICE_NOT_AVAILABLE",
            status: 400,
          },
        });
      }
    }

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data,
    });

    res.json({
      data: {
        address: updatedAddress,
      },
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Update Address Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};
