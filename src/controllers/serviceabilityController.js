const prisma = require("../prisma");

// List of allowed pincodes (Replaces District-based check)
const ALLOWED_PINCODES = [
  "500072",
  "500049",
  "500018",
  "500016",
  "500038",
  "560027",
  "560030",
  "500081",
];

exports.checkServiceability = async (req, res) => {
  try {
    const { pincode } = req.query;

    if (!pincode) {
      return res.status(400).json({
        error: { message: "Pincode is required" },
      });
    }

    const code = pincode.toString().trim();
    const isServiceable = ALLOWED_PINCODES.includes(code);

    if (!isServiceable) {
      return res.status(400).json({
        data: {
          serviceable: false,
          pincode: code,
          message: `Service not available in ${code}. We only serve specific locations.`,
        },
      });
    }

    res.json({
      data: {
        serviceable: true,
        pincode: code,
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

  // Static Check (No DB Lookup required)
  const isServiceable = ALLOWED_PINCODES.includes(code);

  if (!isServiceable)
    return {
      valid: false,
      message: `Service not available in ${code}`,
    };

  return { valid: true };
};
