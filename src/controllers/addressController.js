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

    // Validate Common Point association if provided
    if (data.commonPointId) {
      const commonPoint = await prisma.commonPoint.findUnique({
        where: { id: data.commonPointId },
      });

      if (!commonPoint) {
        return res.status(404).json({
          error: {
            message: "Common Point not found",
            code: "COMMON_POINT_NOT_FOUND",
            status: 404,
          },
        });
      }

      // Check if common point is active
      if (!commonPoint.isActive) {
        return res.status(400).json({
          error: {
            message: "Selected Common Point is not active",
            code: "COMMON_POINT_INACTIVE",
            status: 400,
          },
        });
      }

      // Check access: Must be Global (userId=null) OR Owned by current user
      if (commonPoint.userId && commonPoint.userId !== userId) {
        return res.status(403).json({
          error: {
            message: "Unauthorized access to private Common Point",
            code: "FORBIDDEN",
            status: 403,
          },
        });
      }
    }

    // Validate Pincode Serviceability from Common Point if not explicitly provided (Optional enhancement?)
    // But data.pincode is required by validator... so we assume frontend sends it even if from CP.

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

    // Validate Common Point association if provided
    if (data.commonPointId) {
      const commonPoint = await prisma.commonPoint.findUnique({
        where: { id: data.commonPointId },
      });

      if (!commonPoint) {
        return res.status(404).json({
          error: {
            message: "Common Point not found",
            code: "NOT_FOUND",
            status: 404,
          },
        });
      }

      if (!commonPoint.isActive) {
        return res.status(400).json({
          error: {
            message: "Selected Common Point is inactive",
            code: "INACTIVE",
            status: 400,
          },
        });
      }

      // Check ownership
      if (commonPoint.userId && commonPoint.userId !== userId) {
        return res.status(403).json({
          error: {
            message: "Unauthorized access to private Common Point",
            code: "FORBIDDEN",
            status: 403,
          },
        });
      }
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

exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

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

    try {
      await prisma.address.delete({
        where: { id: addressId },
      });

      res.json({
        message: "Address deleted successfully",
      });
    } catch (dbError) {
      // P2003: Foreign key constraint failed
      if (dbError.code === "P2003") {
        return res.status(409).json({
          error: {
            message: "Cannot delete address as it is in use.",
            code: "CONSTRAINT_VIOLATION",
            status: 409,
          },
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Delete Address Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};
