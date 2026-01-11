const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

/**
 * Middleware to verify JWT and attach user to request.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: {
        message: "No authentication token provided",
        code: "NO_TOKEN",
        status: 401,
      },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          message: "Invalid token payload",
          code: "INVALID_TOKEN_PAYLOAD",
          status: 401,
        },
      });
    }

    // Attach user (fetching from DB to ensure it exists and getting latest role)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: "User no longer exists",
          code: "INVALID_USER",
          status: 401,
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).json({
      error: {
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
        status: 401,
      },
    });
  }
};

module.exports = verifyToken;
