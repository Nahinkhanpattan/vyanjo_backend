const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: {
          message: "No token provided",
          code: "NO_TOKEN",
          status: 401,
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists and is admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({
        error: {
          message: "Access denied. Admins only.",
          code: "FORBIDDEN",
          status: 403,
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin Auth Error:", error);
    return res.status(401).json({
      error: {
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
        status: 401,
      },
    });
  }
};

module.exports = verifyAdmin;
