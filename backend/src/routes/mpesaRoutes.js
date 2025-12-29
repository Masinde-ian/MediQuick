const express = require('express');
const router = express.Router();
const mpesaController = require('../controllers/mpesaController');
const { authenticate } = require('../middleware/auth');
const { validateMpesaPayment, validateQueryStatus } = require('../middleware/mpesaValidation');

// Helper functions
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  } else if (cleaned.startsWith('254') && cleaned.length === 12) {
    // Already in 254 format
  } else if (cleaned.startsWith('+254') && cleaned.length === 13) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
};

const generateCheckoutRequestID = () => {
  return 'ws_CO_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
};

// Export helpers for use in controller
module.exports.formatPhoneNumber = formatPhoneNumber;
module.exports.generateCheckoutRequestID = generateCheckoutRequestID;

// ==================== ROUTES ====================

// 🔐 AUTH REQUIRED ROUTES
router.use(authenticate);

// ✅ NEW: Initiate payment flow (creates temporary order)
router.post('/initiate-payment', validateMpesaPayment, mpesaController.initiatePaymentFlow);

// ✅ Query payment status by checkout ID
router.get('/payment-status/:checkoutRequestID', mpesaController.checkPaymentStatus);

// ✅ Complete order after successful payment
router.post('/complete-order/:orderId', mpesaController.completeOrder);

// ✅ Query payment status (legacy endpoint)
router.post('/query-status', validateQueryStatus, mpesaController.queryPaymentStatus);

// ✅ Get user's transactions
router.get('/transactions', mpesaController.getUserTransactions);

// ✅ Get specific transaction
router.get('/transaction/:id', mpesaController.getTransaction);

// ✅ Health check
router.get('/health', mpesaController.checkHealth);

// 🎯 M-Pesa callback (NO AUTH - called by Safaricom)
router.post('/callback', mpesaController.handleCallback);

// ==================== LEGACY ROUTES (for backward compatibility) ====================

// ✅ Legacy: Initiate STK Push payment (will be deprecated)
router.post('/stkpush', validateMpesaPayment, mpesaController.initiateSTKPush);

module.exports = router;