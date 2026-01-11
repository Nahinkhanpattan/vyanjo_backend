const prisma = require("../prisma");

// List of allowed districts
const ALLOWED_DISTRICTS = ["Guntur", "Hyderabad"];

exports.checkServiceability = async (req, res) => {
  try {
    const { pincode } = req.query;

    if (!pincode) {
      return res.status(400).json({
        error: { message: "Pincode is required" },
      });
    }

    // Find pincode in DB
    const pincodeRecord = await prisma.pincode.findUnique({
      where: { code: pincode },
      include: {
        district: true,
      },
    });

    if (!pincodeRecord) {
      return res.status(404).json({
        error: {
          message: "Pincode not found",
          code: "PINCODE_NOT_FOUND",
          status: 404,
        },
      });
    }

    // Check if district is allowed
    // Using case-insensitive check just in case, though DB has exact names
    const districtName = pincodeRecord.district.name;
    const isServiceable = ALLOWED_DISTRICTS.some(
      (d) => d.toLowerCase() === districtName.toLowerCase()
    );

    if (!isServiceable) {
      return res.status(400).json({
        data: {
          serviceable: false,
          pincode: pincode,
          city: districtName,
          message: `Service not available in ${districtName}. We only serve Guntur and Hyderabad.`,
        },
      });
    }

    res.json({
      data: {
        serviceable: true,
        pincode: pincode,
        city: districtName,
        message: "Service available",
      },
    });
  } catch (error) {
    console.error("Check Serviceability Error:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
        status: 500,
      },
    });
  }
};

exports.validatePincodeInternal = async (pincode_str) => {
  if (!pincode_str) return { valid: false, message: "Pincode required" };

  // Normalize string
  const code = pincode_str.toString().trim();

  const pincodeRecord = await prisma.pincode.findUnique({
    where: { code },
    include: { district: true },
  });

  if (!pincodeRecord)
    return {
      valid: false,
      message: "Invalid Pincode: Not found in our database",
    };

  const districtName = pincodeRecord.district.name;
  const isServiceable = ALLOWED_DISTRICTS.some(
    (d) => d.toLowerCase() === districtName.toLowerCase()
  );

  if (!isServiceable)
    return {
      valid: false,
      message: `Service not available in ${districtName}`,
    };

  return { valid: true };
};
