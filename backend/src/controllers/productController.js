// controllers/productController.js - UPDATED VERSION
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getProducts = async (req, res) => {
  try {
    const { 
      category, 
      subcategory,
      condition, 
      brand, 
      search, 
      minPrice, 
      maxPrice, 
      prescriptionRequired,
      inStock,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Get user from request (from auth middleware)
    const user = req.user;
    
    // Default: hide prescription drugs for regular browsing
    // Unless user is ADMIN or DOCTOR, or explicitly asking for prescription drugs
    let showPrescriptionDrugs = false;
    
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'DOCTOR') {
        showPrescriptionDrugs = true;
      }
    }
    
    // If explicitly asking for prescription drugs in query
    if (prescriptionRequired === 'true') {
      showPrescriptionDrugs = true;
    }

    // Build where clause for filtering
    const where = {
      AND: [
        // Search in name and description
        search ? { 
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { brand: { name: { contains: search, mode: 'insensitive' } } }
          ]
        } : {},
        
        // Category filter (including subcategories)
        category ? {
          OR: [
            { category: { slug: category } },
            { category: { parent: { slug: category } } },
            { category: { parent: { parent: { slug: category } } } }
          ]
        } : {},
        
        // Specific subcategory filter
        subcategory ? { category: { slug: subcategory } } : {},
        
        // Condition/Illness filter
        condition ? { conditions: { some: { condition: { slug: condition } } } } : {},
        
        // Brand filter
        brand ? { brand: { slug: brand } } : {},
        
        // Price range filter
        minPrice ? { price: { gte: parseFloat(minPrice) } } : {},
        maxPrice ? { price: { lte: parseFloat(maxPrice) } } : {},
        
        // Prescription requirement filter
        prescriptionRequired !== undefined ? { 
          prescriptionRequired: prescriptionRequired === 'true' 
        } : (!showPrescriptionDrugs ? { prescriptionRequired: false } : {}),
        
        // Stock availability filter
        inStock === 'true' ? { inStock: true } : {},
        inStock === 'false' ? { inStock: false } : {},
      ]
    };

    // Remove empty objects from AND array
    where.AND = where.AND.filter(condition => Object.keys(condition).length > 0);

    // Sort options
    const orderBy = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'popular') {
      // You can add a popularity field later
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          include: {
            parent: {
              include: {
                parent: true // Full hierarchy
              }
            }
          }
        },
        brand: true,
        conditions: {
          include: {
            condition: true
          }
        }
      },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy
    });

    const total = await prisma.product.count({ where });

    // Get filter counts for UI
    const filterCounts = await getFilterCounts(where);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        filterCounts,
        userRole: user?.role,
        showPrescriptionDrugs
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const user = req.user; // From auth middleware
    
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          include: {
            parent: {
              include: {
                parent: true // Full hierarchy for breadcrumbs
              }
            }
          }
        },
        brand: true,
        conditions: {
          include: {
            condition: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user can view prescription drug details
    const canViewDetails = !product.prescriptionRequired || 
      (user && (user.role === 'ADMIN' || user.role === 'DOCTOR'));

    // Prepare response
    const responseData = {
      product: {
        ...product,
        // Hide sensitive info for prescription drugs if user not authorized
        price: canViewDetails ? product.price : null,
        salePrice: canViewDetails ? product.salePrice : null,
        ingredients: canViewDetails ? product.ingredients : null,
        usageInstructions: canViewDetails ? product.usageInstructions : null,
      },
      canViewDetails,
      requiresPrescription: product.prescriptionRequired,
      prescriptionMessage: product.prescriptionRequired && !canViewDetails 
        ? 'This medication requires a prescription. Please consult a doctor.' 
        : null
    };

    // Only get related products if user can view them
    if (canViewDetails || !product.prescriptionRequired) {
      const relatedProducts = await prisma.product.findMany({
        where: {
          AND: [
            { id: { not: product.id } },
            {
              OR: [
                { categoryId: product.categoryId },
                { conditions: { some: { conditionId: { in: product.conditions.map(pc => pc.conditionId) } } } }
              ]
            },
            // Hide prescription drugs from related products for non-authorized users
            user?.role === 'ADMIN' || user?.role === 'DOCTOR' ? {} : { prescriptionRequired: false }
          ]
        },
        include: {
          brand: true,
          category: true
        },
        take: 8
      });

      responseData.relatedProducts = relatedProducts;
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Helper function to get filter counts
async function getFilterCounts(baseWhere) {
  try {
    // Remove prescription filter for counts (so users see all available filters)
    const countWhere = { ...baseWhere };
    if (countWhere.AND) {
      countWhere.AND = countWhere.AND.filter(condition => 
        !condition.prescriptionRequired
      );
    }

    const [brandCounts, conditionCounts, categoryCounts] = await Promise.all([
      // Brand counts
      prisma.brand.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: countWhere.AND && countWhere.AND.length > 0 ? { AND: countWhere.AND } : {}
              }
            }
          }
        }
      }),
      
      // Condition counts
      prisma.condition.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: countWhere.AND && countWhere.AND.length > 0 ? { 
                  AND: countWhere.AND.filter(cond => !cond.conditions)
                } : {}
              }
            }
          }
        }
      }),
      
      // Category counts
      prisma.category.findMany({
        where: { isLeaf: true }, // Only count leaf categories
        include: {
          _count: {
            select: {
              products: {
                where: countWhere.AND && countWhere.AND.length > 0 ? { 
                  AND: countWhere.AND.filter(cond => 
                    !cond.category && !cond.OR?.some(o => o.category)
                  )
                } : {}
              }
            }
          }
        }
      })
    ]);

    return {
      brands: brandCounts.filter(brand => brand._count.products > 0),
      conditions: conditionCounts.filter(condition => condition._count.products > 0),
      categories: categoryCounts.filter(category => category._count.products > 0)
    };
  } catch (error) {
    console.error('Error getting filter counts:', error);
    return { brands: [], conditions: [], categories: [] };
  }
}

const searchProducts = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const user = req.user; // From auth middleware

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: { products: [] }
      });
    }

    const searchTerm = q.trim();

    // Check user role for prescription drug visibility
    const showPrescriptionDrugs = user && (user.role === 'ADMIN' || user.role === 'DOCTOR');

    const where = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { 
          brand: { 
            name: { contains: searchTerm, mode: 'insensitive' } 
          } 
        },
        { 
          category: { 
            name: { contains: searchTerm, mode: 'insensitive' } 
          } 
        }
      ],
      // Hide prescription drugs for non-authorized users
      ...(showPrescriptionDrugs ? {} : { prescriptionRequired: false })
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: {
          include: {
            parent: true
          }
        }
      },
      take: parseInt(limit)
    });

    // Process products to hide details for prescription drugs
    const processedProducts = products.map(product => {
      const canViewDetails = !product.prescriptionRequired || showPrescriptionDrugs;
      
      return {
        ...product,
        // Hide sensitive info for prescription drugs if user not authorized
        price: canViewDetails ? product.price : null,
        salePrice: canViewDetails ? product.salePrice : null,
        ingredients: canViewDetails ? product.ingredients : null,
        usageInstructions: canViewDetails ? product.usageInstructions : null,
        canViewDetails,
        requiresPrescription: product.prescriptionRequired
      };
    });

    res.json({
      success: true,
      data: { 
        products: processedProducts,
        userRole: user?.role,
        showPrescriptionDrugs
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getProducts,
  getProductBySlug,
  searchProducts
};