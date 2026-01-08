// src/app.js - FINAL STABLE VERSION (Node 22 + Uploads + CSP + CORS)

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

const app = express();


const uploadsPath = path.join(process.cwd(), 'uploads');

// ================= INVENTORY =================
const InventoryMonitor = require('./utils/inventoryMonitor');

// ================= CORS =================
// NOTE: cors() already handles preflight OPTIONS — no app.options('*') needed
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
};

app.use(cors(corsOptions));

// ================= SECURITY (HELMET + CSP) =================
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'http://localhost:5000',
          'https://via.placeholder.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com'
        ],
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'http://localhost:5000',
          'http://localhost:5173'
        ]
      }
    }
  })
);

// ================= MIDDLEWARE =================
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC FILES =================
const staticOptions = {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (/\.(jpg|jpeg|png|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
};

// ✅ CRITICAL: uploads folder (product images)
app.use('/uploads', express.static(uploadsPath, staticOptions));

// Optional legacy/static products
app.use('/products', express.static(path.join(__dirname, 'products'), staticOptions));

// ================= HEALTH =================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MediQuick Backend is running',
    timestamp: new Date().toISOString()
  });
});

// ================= IMAGE TEST =================
app.get('/api/test-image', (req, res) => {
  const imgPath = path.join(
    __dirname,
    'uploads',
    'products'
  );

  if (!fs.existsSync(imgPath)) {
    return res.json({
      success: false,
      message: 'uploads/products directory does not exist',
      fix: 'Create backend/uploads/products/'
    });
  }

  const files = fs.readdirSync(imgPath).filter(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );

  res.json({
    success: true,
    imageCount: files.length,
    sample:
      files.length > 0
        ? `http://localhost:5000/uploads/products/${files[0]}`
        : null
  });
});

// ================= ROUTES =================
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

// ================= INVENTORY CHECKS =================
setInterval(async () => {
  try {
    await InventoryMonitor.runAllChecks();
  } catch (err) {
    console.error('Inventory check failed:', err.message);
  }
}, 5 * 60 * 1000);

// ================= 404 =================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message
  });
});

// ================= START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 Server running on http://localhost:${PORT}
🖼️ Images: http://localhost:${PORT}/uploads/products/
🧪 Test:   http://localhost:${PORT}/api/test-image
  `);

  const uploadDir = path.join(__dirname, 'uploads', 'products');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads/products/');
  }
});
