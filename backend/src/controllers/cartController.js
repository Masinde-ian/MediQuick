// backend/src/controllers/cartController.js - COMPLETE UPDATED VERSION
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to check prescription drugs in cart
const checkCartForPrescriptionDrugs = async (cart) => {
  const items = cart?.items || [];
  const prescriptionItems = [];
  let hasPrescriptionDrugs = false;
  let canCheckout = true;
  let prescriptionMessage = '';

  for (const item of items) {
    if (item.product && item.product.prescriptionRequired) {
      hasPrescriptionDrugs = true;
      prescriptionItems.push({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        requiresPrescription: true
      });
    }
  }

  if (hasPrescriptionDrugs) {
    // Check if user has any approved prescription
    const user = await prisma.user.findUnique({
      where: { id: cart.userId },
      include: {
        prescriptions: {
          where: {
            status: 'APPROVED'
          }
        }
      }
    });

    if (user && user.prescriptions.length > 0) {
      canCheckout = true;
      prescriptionMessage = 'Your prescription has been approved. You can proceed with checkout.';
    } else {
      canCheckout = false;
      prescriptionMessage = 'Your cart contains prescription drugs. Please upload and get your prescription approved before checkout.';
    }
  }

  return {
    hasPrescriptionDrugs,
    prescriptionItems,
    canCheckout,
    prescriptionMessage,
    requiresPrescriptionApproval: hasPrescriptionDrugs && !canCheckout
  };
};

// Get user's cart
const getCart = async (req, res) => {
  try {
    // Get userId from request
    const userId = req.user?.userId || req.user?.id;
    
    console.log('🛒 Getting cart for user ID:', userId);
    console.log('👤 User object:', req.user);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in request'
      });
    }

    // Find cart with items and products
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: true,
                category: true
              }
            }
          }
        }
      }
    });

    console.log('📦 Cart found:', cart ? 'Yes' : 'No');
    
    // If no cart exists, return empty cart
    if (!cart) {
      console.log('📦 No cart found for user, returning empty cart');
      return res.json({
        success: true,
        data: {
          cart: null,
          total: 0,
          itemsCount: 0,
          items: [],
          hasPrescriptionDrugs: false,
          canCheckout: true
        }
      });
    }

    // Make sure items array exists (it might be undefined)
    const items = cart.items || [];
    console.log(`📦 Cart has ${items.length} items`);

    // Check for prescription drugs
    const prescriptionCheck = await checkCartForPrescriptionDrugs(cart);

    // Calculate totals safely
    let total = 0;
    let itemsCount = 0;
    const itemsWithTotals = [];

    for (const item of items) {
      if (item && item.product) {
        const price = item.product.salePrice || item.product.price || 0;
        const quantity = item.quantity || 0;
        const itemTotal = price * quantity;
        
        total += itemTotal;
        itemsCount += quantity;
        
        itemsWithTotals.push({
          ...item,
          itemTotal: parseFloat(itemTotal.toFixed(2)),
          requiresPrescription: item.product.prescriptionRequired,
          canViewPrice: true // All users can view prices
        });
      }
    }

    // Create response object
    const cartData = {
      cart: {
        ...cart,
        items: itemsWithTotals
      },
      total: parseFloat(total.toFixed(2)),
      itemsCount,
      items: itemsWithTotals,
      hasPrescriptionDrugs: prescriptionCheck.hasPrescriptionDrugs,
      canCheckout: prescriptionCheck.canCheckout,
      prescriptionItems: prescriptionCheck.prescriptionItems,
      prescriptionMessage: prescriptionCheck.prescriptionMessage,
      requiresPrescriptionApproval: prescriptionCheck.requiresPrescriptionApproval
    };

    console.log('✅ Cart data calculated:', {
      total: cartData.total,
      itemsCount: cartData.itemsCount,
      hasPrescriptionDrugs: cartData.hasPrescriptionDrugs,
      canCheckout: cartData.canCheckout
    });

    res.json({
      success: true,
      data: cartData
    });
    
  } catch (error) {
    console.error('❌ Get cart error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Return empty cart on error to prevent frontend crash
    res.json({
      success: true,
      data: {
        cart: null,
        total: 0,
        itemsCount: 0,
        items: [],
        hasPrescriptionDrugs: false,
        canCheckout: true
      }
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { productId, quantity = 1 } = req.body;

    console.log('🛒 Add to cart - User ID:', userId, 'Product:', productId, 'Qty:', quantity);

    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in request'
      });
    }

    // Check if product exists and is in stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock availability
    if (!product.inStock) {
      return res.status(400).json({
        success: false,
        message: 'Product is currently out of stock',
        productName: product.name
      });
    }

    // Check if product requires prescription
    if (product.prescriptionRequired) {
      // Get user's current approved prescriptions
      const userPrescriptions = await prisma.prescription.findMany({
        where: {
          userId,
          status: 'APPROVED'
        }
      });

      if (userPrescriptions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'This medication requires a prescription',
          requiresPrescription: true,
          product: {
            id: product.id,
            name: product.name,
            prescriptionRequired: true
          },
          suggestion: 'Please upload a prescription first before adding this medication to your cart.'
        });
      }
    }

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Get or create user's cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { 
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { 
          items: {
            include: {
              product: true
            }
          }
        }
      });
    }

    // Check if product already in cart
    const existingItem = cart.items?.find(item => item.productId === productId);

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity;
      const MAX_QUANTITY = 10;
      
      if (newQuantity > MAX_QUANTITY) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_QUANTITY} items allowed per product`
        });
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Add new item to cart
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity
        }
      });
    }

    // Get updated cart with totals
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: true,
                category: true
              }
            }
          }
        }
      }
    });

    // Check for prescription drugs in updated cart
    const prescriptionCheck = await checkCartForPrescriptionDrugs(updatedCart);

    // Calculate totals
    const items = updatedCart?.items || [];
    let total = 0;
    let itemsCount = 0;
    const itemsWithTotals = [];

    for (const item of items) {
      if (item && item.product) {
        const price = item.product.salePrice || item.product.price || 0;
        const quantity = item.quantity || 0;
        const itemTotal = price * quantity;
        
        total += itemTotal;
        itemsCount += quantity;
        
        itemsWithTotals.push({
          ...item,
          itemTotal: parseFloat(itemTotal.toFixed(2)),
          requiresPrescription: item.product.prescriptionRequired,
          canViewPrice: true
        });
      }
    }

    const cartData = {
      cart: updatedCart ? {
        ...updatedCart,
        items: itemsWithTotals
      } : null,
      total: parseFloat(total.toFixed(2)),
      itemsCount,
      items: itemsWithTotals,
      hasPrescriptionDrugs: prescriptionCheck.hasPrescriptionDrugs,
      canCheckout: prescriptionCheck.canCheckout,
      prescriptionItems: prescriptionCheck.prescriptionItems,
      prescriptionMessage: prescriptionCheck.prescriptionMessage,
      requiresPrescriptionApproval: prescriptionCheck.requiresPrescriptionApproval
    };

    res.json({
      success: true,
      message: existingItem ? 'Product quantity updated in cart' : 'Product added to cart',
      data: cartData
    });
    
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in request'
      });
    }

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    // Get cart item with product info
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId }
      },
      include: {
        product: true
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Check product stock (for non-zero quantities)
    if (quantity > 0 && !cartItem.product.inStock) {
      return res.status(400).json({
        success: false,
        message: 'Product is currently out of stock',
        productName: cartItem.product.name
      });
    }

    // Check prescription requirement for prescription drugs
    if (cartItem.product.prescriptionRequired && quantity > 0) {
      // Get user's current approved prescriptions
      const userPrescriptions = await prisma.prescription.findMany({
        where: {
          userId,
          status: 'APPROVED'
        }
      });

      if (userPrescriptions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'This medication requires an approved prescription',
          requiresPrescription: true,
          product: {
            id: cartItem.product.id,
            name: cartItem.product.name,
            prescriptionRequired: true
          }
        });
      }
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      await prisma.cartItem.delete({
        where: { id: itemId }
      });
    } else {
      // Validate maximum quantity
      const MAX_QUANTITY = 10;
      if (quantity > MAX_QUANTITY) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_QUANTITY} items allowed per product`
        });
      }

      // Update quantity
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity }
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: true,
                category: true
              }
            }
          }
        }
      }
    });

    // Check for prescription drugs
    const prescriptionCheck = await checkCartForPrescriptionDrugs(updatedCart);

    // Calculate totals
    const items = updatedCart?.items || [];
    let total = 0;
    let itemsCount = 0;
    const itemsWithTotals = [];

    for (const item of items) {
      if (item && item.product) {
        const price = item.product.salePrice || item.product.price || 0;
        const itemQuantity = item.quantity || 0;
        const itemTotal = price * itemQuantity;
        
        total += itemTotal;
        itemsCount += itemQuantity;
        
        itemsWithTotals.push({
          ...item,
          itemTotal: parseFloat(itemTotal.toFixed(2)),
          requiresPrescription: item.product.prescriptionRequired,
          canViewPrice: true
        });
      }
    }

    const cartData = {
      cart: updatedCart ? {
        ...updatedCart,
        items: itemsWithTotals
      } : null,
      total: parseFloat(total.toFixed(2)),
      itemsCount,
      items: itemsWithTotals,
      hasPrescriptionDrugs: prescriptionCheck.hasPrescriptionDrugs,
      canCheckout: prescriptionCheck.canCheckout,
      prescriptionItems: prescriptionCheck.prescriptionItems,
      prescriptionMessage: prescriptionCheck.prescriptionMessage,
      requiresPrescriptionApproval: prescriptionCheck.requiresPrescriptionApproval
    };

    res.json({
      success: true,
      message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
      data: cartData
    });
    
  } catch (error) {
    console.error('❌ Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in request'
      });
    }

    // Verify the item belongs to user's cart
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId }
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await prisma.cartItem.delete({
      where: { id: itemId }
    });

    // Get updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                brand: true,
                category: true
              }
            }
          }
        }
      }
    });

    // Check for prescription drugs
    const prescriptionCheck = await checkCartForPrescriptionDrugs(updatedCart);

    // Calculate totals
    const items = updatedCart?.items || [];
    let total = 0;
    let itemsCount = 0;
    const itemsWithTotals = [];

    for (const item of items) {
      if (item && item.product) {
        const price = item.product.salePrice || item.product.price || 0;
        const quantity = item.quantity || 0;
        const itemTotal = price * quantity;
        
        total += itemTotal;
        itemsCount += quantity;
        
        itemsWithTotals.push({
          ...item,
          itemTotal: parseFloat(itemTotal.toFixed(2)),
          requiresPrescription: item.product.prescriptionRequired,
          canViewPrice: true
        });
      }
    }

    const cartData = {
      cart: updatedCart ? {
        ...updatedCart,
        items: itemsWithTotals
      } : null,
      total: parseFloat(total.toFixed(2)),
      itemsCount,
      items: itemsWithTotals,
      hasPrescriptionDrugs: prescriptionCheck.hasPrescriptionDrugs,
      canCheckout: prescriptionCheck.canCheckout,
      prescriptionItems: prescriptionCheck.prescriptionItems,
      prescriptionMessage: prescriptionCheck.prescriptionMessage,
      requiresPrescriptionApproval: prescriptionCheck.requiresPrescriptionApproval
    };

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cartData
    });
    
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in request'
      });
    }

    // Find user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      return res.json({
        success: true,
        message: 'Cart not found',
        data: {
          cart: null,
          total: 0,
          itemsCount: 0,
          items: [],
          hasPrescriptionDrugs: false,
          canCheckout: true
        }
      });
    }

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    console.log(`✅ Cart cleared for user: ${userId}`);

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart: cart,
        total: 0,
        itemsCount: 0,
        items: [],
        hasPrescriptionDrugs: false,
        canCheckout: true
      }
    });
    
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
};

// Check prescription status for cart
const checkCartPrescriptionStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found in request'
      });
    }

    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                prescriptionRequired: true
              }
            }
          }
        }
      }
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.json({
        success: true,
        data: {
          hasPrescriptionDrugs: false,
          canCheckout: true,
          message: 'Cart is empty'
        }
      });
    }

    // Check for prescription drugs
    const hasPrescriptionDrugs = cart.items.some(item => 
      item.product && item.product.prescriptionRequired
    );

    if (!hasPrescriptionDrugs) {
      return res.json({
        success: true,
        data: {
          hasPrescriptionDrugs: false,
          canCheckout: true,
          message: 'No prescription drugs in cart'
        }
      });
    }

    // Get user's approved prescriptions
    const approvedPrescriptions = await prisma.prescription.findMany({
      where: {
        userId,
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'desc' }
    });

    const canCheckout = approvedPrescriptions.length > 0;

    res.json({
      success: true,
      data: {
        hasPrescriptionDrugs: true,
        canCheckout,
        approvedPrescriptions: approvedPrescriptions,
        prescriptionItems: cart.items.filter(item => 
          item.product.prescriptionRequired
        ).map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity
        })),
        message: canCheckout 
          ? 'You have an approved prescription. You can proceed to checkout.'
          : 'Please upload and get your prescription approved before checkout.'
      }
    });
    
  } catch (error) {
    console.error('❌ Check cart prescription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check prescription status',
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkCartPrescriptionStatus
};