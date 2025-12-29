const express = require('express');
const { prisma } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/auth');
const { authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const NotificationService = require('../services/notificationService');

const router = express.Router();

// Register route - MAKE SURE IT'S ASYNC
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        cart: {
          create: {}
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    // Send welcome notification
    await NotificationService.sendWelcomeNotification(user.id, user);

    // If user is customer, notify admins
    if (user.role === 'CUSTOMER') {
      await NotificationService.sendNewUserAdmin(user);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});
 
// Login route - MAKE SURE IT'S ASYNC  
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        cart: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // ✅ Generate REAL JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      }, 
      process.env.JWT_SECRET || 'mediquick-secret-key-2024',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user route - MAKE SURE IT'S ASYNC
router.get('/me', authenticate, async (req, res) => {
  try {
    console.log('👤 /me endpoint called');
    console.log('👤 req.user:', req.user);
    console.log('👤 req.user.id:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.error('❌ No user in request');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (!user) {
        console.error('❌ User not found in database for ID:', req.user.id);
        // Return the user from the token if not in database
        user = {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          phone: req.user.phone,
          role: req.user.role,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      // Fallback to user from token
      user = req.user;
    }

    console.log('✅ Returning user:', user.id);
    
    res.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('❌ /me endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
      error: error.message
    });
  }
});

module.exports = router;