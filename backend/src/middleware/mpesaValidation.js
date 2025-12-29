const { body, validationResult } = require('express-validator');

const validateMpesaPayment = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(07|7|254|\+254)\d{8,9}$/)
    .withMessage('Invalid Kenyan phone number format (e.g., 0712345678, 712345678, 254712345678)'),
  
  body('amount')
    .isFloat({ min: 1, max: 70000 })
    .withMessage('Amount must be between KES 1 and KES 70,000'),
  
  body('accountReference')
    .optional()
    .isString()
    .withMessage('Account reference must be a string')
    .isLength({ max: 12 })
    .withMessage('Account reference must be 12 characters or less'),
  
  body('transactionDesc')
    .optional()
    .isString()
    .withMessage('Transaction description must be a string')
    .isLength({ max: 13 })
    .withMessage('Transaction description must be 13 characters or less'),
  
  body('orderId')
    .optional()
    .isString()
    .withMessage('Order ID must be a string'),
  
  body('orderData')
    .optional()
    .isObject()
    .withMessage('Order data must be an object'),
  
  body('orderData.items')
    .if(body('orderData').exists())
    .isArray()
    .withMessage('Order items must be an array')
    .notEmpty()
    .withMessage('Order items cannot be empty'),
  
  body('orderData.subtotal')
    .if(body('orderData').exists())
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a positive number'),
  
  body('orderData.shippingCost')
    .if(body('orderData').exists())
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be a positive number'),
  
  body('orderData.addressId')
    .if(body('orderData').exists())
    .optional()
    .isString()
    .withMessage('Address ID must be a string'),
  
  body('orderData.deliveryInstructions')
    .if(body('orderData').exists())
    .optional()
    .isString()
    .withMessage('Delivery instructions must be a string'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

const validateQueryStatus = [
  body('checkoutRequestID')
    .notEmpty()
    .withMessage('Checkout Request ID is required')
    .isString()
    .withMessage('Checkout Request ID must be a string'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateMpesaPayment,
  validateQueryStatus
};