const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// DEBUG: Request Logger
app.use((req, res, next) => {
  console.log(`\n[REQUEST] ${req.method} ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log("[BODY]:", JSON.stringify(req.body, null, 2));
  }
  if (Object.keys(req.query).length > 0) {
    console.log("[QUERY]:", JSON.stringify(req.query, null, 2));
  }
  next();
});

// Basic health check
app.get("/", (req, res) => {
  res.json({ message: "Vyanjo Backend API is running" });
});

const authRoutes = require("./routes/authRoutes");
const addressRoutes = require("./routes/addressRoutes");
const commonPointRoutes = require("./routes/commonPointRoutes");
const mealPackageRoutes = require("./routes/mealPackageRoutes");
const menuRoutes = require("./routes/menuRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminRoutes = require("./routes/adminRoutes");
const issueRoutes = require("./routes/issueRoutes");
const curryRoutes = require("./routes/curryRoutes");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/common-points", commonPointRoutes);
app.use("/api/meal-packages", mealPackageRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/curry", curryRoutes);
app.use("/api/master-data", require("./routes/masterDataRoutes"));

// Centralized Error Handling
// Centralized Error Handling
app.use((err, req, res, next) => {
  console.error(`\n[ERROR] ${req.method} ${req.url}`);
  console.error("[STACK]:", err.stack);
  console.error("[MESSAGE]:", err.message);

  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      code: err.code || "INTERNAL_ERROR",
      status: err.status || 500,
      detail: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
