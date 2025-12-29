// middleware/prescriptionFilter.js
/**
 * Middleware to check if user can access prescription drugs
 */
const checkPrescriptionAccess = (req, res, next) => {
  const user = req.user;
  
  // For product routes, add user info to request for filtering
  if (req.path.startsWith('/api/products')) {
    req.userRole = user?.role;
  }
  
  next();
};

/**
 * Middleware to check if cart contains prescription drugs
 */
const checkCartPrescription = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user?.userId || user?.id;
    
    if (!userId) {
      req.cartPrescriptionCheck = {
        hasPrescriptionDrugs: false,
        canCheckout: true
      };
      return next();
    }
    
    // Check user's cart for prescription drugs
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      req.cartPrescriptionCheck = {
        hasPrescriptionDrugs: false,
        canCheckout: true
      };
      return next();
    }
    
    // Check for prescription drugs
    const hasPrescriptionDrugs = cart.items.some(item => 
      item.product && item.product.prescriptionRequired
    );
    
    const canCheckout = !hasPrescriptionDrugs || 
      (user && (user.role === 'ADMIN' || user.role === 'DOCTOR'));
    
    req.cartPrescriptionCheck = {
      hasPrescriptionDrugs,
      canCheckout,
      userRole: user?.role
    };
    
    next();
  } catch (error) {
    console.error('Cart prescription check error:', error);
    req.cartPrescriptionCheck = {
      hasPrescriptionDrugs: false,
      canCheckout: true
    };
    next();
  }
};

module.exports = {
  checkPrescriptionAccess,
  checkCartPrescription
};