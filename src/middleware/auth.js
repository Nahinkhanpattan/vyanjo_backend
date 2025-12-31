const admin = require('../config/firebase');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to verify Firebase ID token and attach user to request.
 * Creates a new user if one with the phone number doesn't exist.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'No authentication token provided',
        code: 'NO_TOKEN',
        status: 401,
      },
    });
  }

  try {
    // If admin app is not initialized (e.g. missing env vars), this will fail
    if (!admin.apps.length) {
       return res.status(500).json({
        error: {
          message: 'Firebase not configured',
          code: 'FIREBASE_ERROR',
          status: 500,
        },
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(401).json({
        error: {
          message: 'Token does not contain a phone number',
          code: 'INVALID_TOKEN_PAYLOAD',
          status: 401,
        },
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phoneNumber },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        status: 401,
      },
    });
  }
};

module.exports = verifyToken;
