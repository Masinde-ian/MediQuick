// routes/cart.js - UPDATED VERSION
const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart,
  checkCartPrescriptionStatus
} = require('../controllers/cartController');

// Import auth middleware
const { authenticate } = require('../middleware/auth');

// Apply authenticate middleware to all routes
router.use(authenticate);

// Debug middleware to check authentication
router.use((req, res, next) => {
  console.log('🛒 Cart route - User authenticated:', req.user ? 'Yes' : 'No');
  console.log('🛒 Cart route - User ID:', req.user?.id || req.user?.userId);
  next();
});

// Routes
router.get('/', (req, res) => {
  console.log('🛒 GET /cart route hit');
  getCart(req, res);
});

router.post('/add', (req, res) => {
  console.log('🛒 POST /cart/add route hit');
  addToCart(req, res);
});

router.put('/item/:itemId', (req, res) => {
  console.log('🛒 PUT /cart/item/:itemId route hit');
  updateCartItem(req, res);
});

router.delete('/item/:itemId', (req, res) => {
  console.log('🛒 DELETE /cart/item/:itemId route hit');
  removeFromCart(req, res);
});

router.delete('/clear', (req, res) => {
  console.log('🛒 DELETE /cart/clear route hit');
  clearCart(req, res);
});

// New route for checking prescription status
router.get('/check-prescription', (req, res) => {
  console.log('🛒 GET /cart/check-prescription route hit');
  checkCartPrescriptionStatus(req, res);
});

module.exports = router;