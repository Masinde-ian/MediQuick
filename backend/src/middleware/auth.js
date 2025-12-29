// middleware/auth.js - COMPLETE UPDATED VERSION
const jwt = require('jsonwebtoken');

// Try to import Prisma, but provide fallback for mock mode
let prisma;
try {
  // Try to import from your local setup
  prisma = require('../lib/prisma').prisma;
} catch (error) {
  // If that fails, try direct import
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  } catch (prismaError) {
    console.warn('Prisma not available, using auth without database');
    prisma = null;
  }
}

// ==================== AUTHENTICATION MIDDLEWARE ====================

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Check if req.headers exists
    if (!req || !req.headers) {
      console.error('Invalid request object in authenticate middleware');
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request' 
      });
    }
    
    // Get token from header
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth - Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 Auth - No Bearer token found');
      return res.status(401).json({ 
        success: false,
        error: 'Access denied. No token provided.' 
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('🔐 Auth - Empty token after Bearer');
      return res.status(401).json({ 
        success: false,
        error: 'Access denied. Invalid token format.' 
      });
    }
    
    console.log('🔐 Auth - Token received, length:', token.length);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    console.log('🔐 Auth - Decoded JWT:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    });
    
    // If prisma is available, find user in database
    if (prisma) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true
        }
      });

      if (!user) {
        console.log('🔐 Auth - User not found in database:', decoded.userId);
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token. User not found.' 
        });
      }

      // Attach user to request - ensure consistent structure
      req.user = {
        id: user.id,          // Always include id
        userId: user.id,      // Also include userId for compatibility
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role
      };
      
      console.log('✅ Auth - User attached to request:', {
        id: req.user.id,
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role
      });
    } else {
      // Mock user for development
      req.user = {
        id: decoded.userId || 'mock-user-id',
        userId: decoded.userId || 'mock-user-id',
        email: decoded.email || 'user@example.com',
        name: decoded.name || 'Test User',
        phone: decoded.phone || '0712345678',
        role: decoded.role || 'CUSTOMER'
      };
      
      console.log('✅ Auth - Mock user attached to request:', req.user);
    }
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Authentication failed.',
      details: error.message 
    });
  }
};

// Authorization middleware (for role-based access)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('🔐 Auth - authorize: No user found in request');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required.' 
      });
    }

    console.log('🔐 Auth - authorize: Checking roles:', {
      required: roles,
      userRole: req.user.role
    });

    if (!roles.includes(req.user.role)) {
      console.log('🔐 Auth - authorize: Access denied');
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    console.log('✅ Auth - authorize: Access granted');
    next();
  };
};

// ==================== MPESA VALIDATION MIDDLEWARE ====================

// Validate MPESA Payment Request
const validateMpesaPayment = (req, res, next) => {
  try {
    const { phoneNumber, amount, orderId } = req.body;
    
    console.log('🔐 MPESA Validation - Request data:', {
      phoneNumber,
      amount,
      orderId
    });
    
    // Check required fields
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number is required' 
      });
    }
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required and must be greater than 0' 
      });
    }
    
    if (!orderId || !orderId.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Order ID is required' 
      });
    }
    
    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Kenyan phone number format. Please use format: 07XXXXXXXX or 2547XXXXXXXX' 
      });
    }
    
    // Validate amount range (MPESA limits: min 1, max 150000 KES)
    const amountNum = parseFloat(amount);
    if (amountNum < 1 || amountNum > 150000) {
      return res.status(400).json({ 
        success: false,
        error: 'Amount must be between KSh 1 and KSh 150,000' 
      });
    }
    
    // Attach formatted data to request
    req.mpesaData = {
      formattedPhone,
      amount: amountNum,
      orderId: orderId.trim(),
      accountReference: req.body.accountReference || `ORDER_${orderId.trim()}`,
      transactionDesc: req.body.transactionDesc || 'MediQuick Payment'
    };
    
    console.log('✅ MPESA Validation - Success:', req.mpesaData);
    next();
  } catch (error) {
    console.error('❌ MPESA validation error:', error);
    res.status(400).json({ 
      success: false,
      error: 'Invalid payment request',
      details: error.message 
    });
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Format Phone Number for MPESA
const formatPhoneNumber = (phoneNumber) => {
  let formatted = phoneNumber.toString().trim();
  
  // Remove any non-digit characters except leading +
  formatted = formatted.replace(/[^\d+]/g, '');
  
  // Format to 2547XXXXXXXX
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  } else if (formatted.startsWith('+254')) {
    formatted = formatted.substring(1);
  } else if (formatted.startsWith('7') && formatted.length === 9) {
    formatted = '254' + formatted;
  }
  // If already starts with 254, leave as is
  
  return formatted;
};

// Validate Phone Number
const validatePhoneNumber = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);
  const regex = /^2547[0-9]{8}$/;
  return regex.test(formatted);
};

// Generate JWT token
const generateToken = (userData) => {
  const payload = {
    userId: userData.id,
    email: userData.email,
    role: userData.role,
    name: userData.name || '',
    phone: userData.phone || ''
  };
  
  console.log('🔐 Generating JWT for:', payload);
  
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
  
  console.log('🔐 JWT generated, length:', token.length);
  return token;
};

// Verify JWT token (for manual verification)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return null;
  }
};

// Simple requireRole middleware (if you need it)
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('🔐 requireRole: No user found');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    console.log('🔐 requireRole: Checking', {
      required: role,
      userRole: req.user.role
    });
    
    if (req.user.role !== role) {
      console.log('🔐 requireRole: Access denied');
      return res.status(403).json({ 
        success: false,
        error: `Access denied. ${role} role required.` 
      });
    }
    
    console.log('✅ requireRole: Access granted');
    next();
  };
};

// Check if user is authenticated (non-blocking)
const isAuthenticated = (req) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    return {
      isAuthenticated: true,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    return { isAuthenticated: false };
  }
};

// ==================== EXPORTS ====================

module.exports = {
  // Authentication Middleware
  authenticate,
  authorize,
  requireRole,
  isAuthenticated,
  
  // Role-specific middleware shortcuts
  adminOnly: requireRole('ADMIN'),
  customerOnly: requireRole('CUSTOMER'),
  pharmacistOnly: requireRole('PHARMACIST'),
  
  // JWT Functions
  generateToken,
  verifyToken,
  
  // MPESA Functions
  validateMpesaPayment,
  formatPhoneNumber,
  validatePhoneNumber
};