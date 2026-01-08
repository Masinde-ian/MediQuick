// controllers/productController.js - CORRECT VERSION MATCHING YOUR SCHEMA
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all products - CORRECTED VERSION
exports.getProducts = async (req, res) => {
  try {
    console.log('📦 GET /api/products - Query params:', req.query);
    
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const user = req.user;
    
    // Build where clause
    const where = {};
    
    // Handle prescription drugs based on user role
    if (user && (user.role === 'ADMIN' || user.role === 'DOCTOR')) {
      // Admins and doctors can see all products
      // No prescription filter applied
    } else {
      // Regular users only see non-prescription drugs
      where.prescriptionRequired = false;
    }
    
    // Handle other filters if provided
    if (req.query.category) {
      where.category = {
        slug: req.query.category
      };
    }
    
    if (req.query.brand) {
      where.brand = {
        slug: req.query.brand
      };
    }
    
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search } },
        { description: { contains: req.query.search } }
      ];
    }
    
    if (req.query.inStock === 'true') {
      where.inStock = true;
    } else if (req.query.inStock === 'false') {
      where.inStock = false;
    }
    
    if (req.query.minPrice) {
      where.price = { gte: parseFloat(req.query.minPrice) };
    }
    
    if (req.query.maxPrice) {
      where.price = { lte: parseFloat(req.query.maxPrice) };
    }
    
    if (req.query.prescriptionRequired === 'true') {
      where.prescriptionRequired = true;
    } else if (req.query.prescriptionRequired === 'false') {
      where.prescriptionRequired = false;
    }

    console.log('🔍 WHERE clause:', JSON.stringify(where, null, 2));
    console.log(`📄 Pagination: page ${page}, limit ${limit}, skip ${skip}`);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    console.log(`✅ Found ${products.length} of ${total} products`);

    // ✅ Parse images JSON string
    const formattedProducts = products.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
      image: p.images ? JSON.parse(p.images)[0] ?? null : null, // 👈 convenience
    }));

    res.status(200).json({
      success: true,
      page,
      total,
      products: formattedProducts,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + products.length < total,
      userRole: user?.role
    });
  } catch (error) {
    console.error('❌ Failed to load products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const user = req.user;

    console.log('🔍 Getting product by slug:', slug);

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
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

    // Parse images
    const parsedImages = product.images ? JSON.parse(product.images) : [];
    
    // Prepare response
    const responseData = {
      ...product,
      images: parsedImages,
      image: parsedImages[0] || null,
      canViewDetails,
      requiresPrescription: product.prescriptionRequired,
      // Hide sensitive info for prescription drugs if user not authorized
      price: canViewDetails ? product.price : null,
      salePrice: canViewDetails ? product.salePrice : null,
      ingredients: canViewDetails ? product.ingredients : null,
      usageInstructions: canViewDetails ? product.usageInstructions : null,
      prescriptionMessage: product.prescriptionRequired && !canViewDetails 
        ? 'This medication requires a prescription. Please consult a doctor.' 
        : null
    };

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Failed to load product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const user = req.user;

    console.log('🔍 Search request:', { q, page, limit });

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: {
          products: [],
          total: 0,
          page: 1,
          pages: 0
        }
      });
    }

    const searchTerm = q.trim();
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    const where = {};
    
    // Search in name and description
    where.OR = [
      { name: { contains: searchTerm } },
      { description: { contains: searchTerm } }
    ];
    
    // Handle prescription drugs based on user role
    if (user && (user.role === 'ADMIN' || user.role === 'DOCTOR')) {
      // Admins and doctors can search all products
    } else {
      // Regular users only see non-prescription drugs
      where.prescriptionRequired = false;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          name: 'asc',
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Parse images JSON string
    const formattedProducts = products.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
      image: p.images ? JSON.parse(p.images)[0] ?? null : null,
    }));

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        hasMore: skip + products.length < total,
        userRole: user?.role
      }
    });

  } catch (error) {
    console.error('❌ Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Quick search for autocomplete
exports.quickSearch = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    const user = req.user;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: { products: [] }
      });
    }

    const searchTerm = q.trim();
    
    const where = {
      OR: [
        { name: { contains: searchTerm } },
        { brand: { name: { contains: searchTerm } } }
      ]
    };
    
    // Handle prescription drugs based on user role
    if (user && (user.role === 'ADMIN' || user.role === 'DOCTOR')) {
      // Admins and doctors can search all products
    } else {
      // Regular users only see non-prescription drugs
      where.prescriptionRequired = false;
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        prescriptionRequired: true,
        images: true,
        brand: {
          select: {
            name: true
          }
        }
      },
      take: Number(limit) || 5
    });

    // Parse images and format response
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      salePrice: p.salePrice,
      image: p.images ? JSON.parse(p.images)[0] || null : null,
      brandName: p.brand.name,
      requiresPrescription: p.prescriptionRequired
    }));

    res.json({
      success: true,
      data: { products: formattedProducts }
    });
  } catch (error) {
    console.error('❌ Quick search error:', error);
    res.json({
      success: true,
      data: { products: [] }
    });
  }
};

// Get filter counts (brands and categories)
exports.getFilterCounts = async (req, res) => {
  try {
    const user = req.user;
    
    // Build where clause for counts
    const where = {};
    
    // Handle prescription drugs based on user role
    if (user && (user.role === 'ADMIN' || user.role === 'DOCTOR')) {
      // Admins and doctors can see all products
    } else {
      // Regular users only see non-prescription drugs
      where.prescriptionRequired = false;
    }

    const [brands, categories] = await Promise.all([
      // Get brands with product counts
      prisma.brand.findMany({
        include: {
          _count: {
            select: { products: { where } }
          }
        },
        where: {
          products: {
            some: where
          }
        }
      }),
      
      // Get categories with product counts
      prisma.category.findMany({
        include: {
          _count: {
            select: { products: { where } }
          }
        }
      })
    ]);

    // Filter out items with zero products
    const filteredBrands = brands.filter(b => b._count.products > 0);
    const filteredCategories = categories.filter(c => c._count.products > 0);

    res.json({
      success: true,
      data: {
        brands: filteredBrands.map(b => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          count: b._count.products
        })),
        categories: filteredCategories.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: c._count.products
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get filter counts error:', error);
    res.json({
      success: true,
      data: {
        brands: [],
        categories: []
      }
    });
  }
};

// Test endpoint
exports.testEndpoint = (req, res) => {
  res.json({
    success: true,
    message: 'Product API is working',
    timestamp: new Date().toISOString(),
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : 'No user authenticated'
  });
};