// src/app.js - SIMPLIFIED VERSION
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

const InventoryMonitor = require('./utils/inventoryMonitor');

// Configure CORS properly
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
};

// Apply CORS middleware BEFORE other middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Other middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'products' directory
app.use('/products', express.static(path.join(__dirname, 'products')));

// Also serve uploads if needed
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MediQuick Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/conditions', require('./routes/conditions'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/shipping', require('./routes/shippingRoutes'));
app.use('/api/mpesa', require('./routes/mpesaRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminOrders'));


// Run inventory checks daily at 9 AM
const scheduleInventoryChecks = () => {
  // For testing, run every 5 minutes
  setInterval(async () => {
    try {
      await InventoryMonitor.runAllChecks();
    } catch (error) {
      console.error('Scheduled inventory check failed:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // For production, use cron schedule (9 AM daily):
  /*
  cron.schedule('0 9 * * *', async () => {
    try {
      await InventoryMonitor.runAllChecks();
    } catch (error) {
      console.error('Daily inventory check failed:', error);
    }
  });
  */
};

// Call this function when server starts
scheduleInventoryChecks();

// 404 handler - Simple version
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health`);
});