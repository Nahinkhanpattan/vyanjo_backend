const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

// Check if environment variables are set
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  // In development/test we might want to allow this to pass or handle it gracefully
  // For now logging a warning if missing
  console.warn("Warning: Firebase environment variables are missing.");
  // We don't exit here to allow the app to start even if firebase isn't fully configured yet
} else {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

module.exports = admin;
