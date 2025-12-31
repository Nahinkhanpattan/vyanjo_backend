const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
  res.json({ message: 'Vyanjo Backend API is running' });
});

const authRoutes = require('./routes/authRoutes');
const addressRoutes = require('./routes/addressRoutes');
const commonPointRoutes = require('./routes/commonPointRoutes');
const mealPackageRoutes = require('./routes/mealPackageRoutes');
const menuRoutes = require('./routes/menuRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminRoutes = require('./routes/adminRoutes');
const issueRoutes = require('./routes/issueRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/common-points', commonPointRoutes);
app.use('/api/meal-packages', mealPackageRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Centralized Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
      status: err.status || 500,
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
