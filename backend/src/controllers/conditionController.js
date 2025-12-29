const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get all conditions
// @route   GET /api/conditions
// @access  Public
const getConditions = async (req, res) => {
  try {
    const conditions = await prisma.condition.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            products: true
          }
        },
        products: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                salePrice: true,
                images: true,
                inStock: true,
                prescriptionRequired: true,
                brand: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          take: 3 // Show only 3 sample products
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Format the response
    const formattedConditions = conditions.map(condition => ({
      id: condition.id,
      name: condition.name,
      slug: condition.slug,
      description: condition.description,
      createdAt: condition.createdAt,
      productCount: condition._count.products,
      // Get first 3 products with their details
      sampleProducts: condition.products.map(pc => pc.product)
    }));

    res.status(200).json({
      success: true,
      data: formattedConditions,
      count: formattedConditions.length
    });
  } catch (error) {
    console.error('Error fetching conditions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conditions'
    });
  }
};

// @desc    Get single condition by slug with all products
// @route   GET /api/conditions/:slug
// @access  Public
const getConditionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const condition = await prisma.condition.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        products: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                price: true,
                salePrice: true,
                images: true,
                sku: true,
                inStock: true,
                prescriptionRequired: true,
                ingredients: true,
                usageInstructions: true,
                createdAt: true,
                updatedAt: true,
                brand: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                }
              }
            }
          },
          orderBy: {
            product: {
              name: 'asc'
            }
          }
        }
      }
    });

    if (!condition) {
      return res.status(404).json({
        success: false,
        error: 'Condition not found'
      });
    }

    // Format the response
    const formattedCondition = {
      id: condition.id,
      name: condition.name,
      slug: condition.slug,
      description: condition.description,
      createdAt: condition.createdAt,
      products: condition.products.map(pc => pc.product),
      productCount: condition.products.length
    };

    res.status(200).json({
      success: true,
      data: formattedCondition
    });
  } catch (error) {
    console.error('Error fetching condition by slug:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch condition'
    });
  }
};

// @desc    Get products for a specific condition
// @route   GET /api/conditions/:slug/products
// @access  Public
const getProductsByCondition = async (req, res) => {
  try {
    const { slug } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      sort = 'name', 
      order = 'asc',
      inStock,
      priceMin,
      priceMax,
      brand
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Check if condition exists
    const condition = await prisma.condition.findUnique({
      where: { slug },
      select: { id: true, name: true }
    });

    if (!condition) {
      return res.status(404).json({
        success: false,
        error: 'Condition not found'
      });
    }

    // Build where clause
    const where = {
      productCondition: {
        some: {
          conditionId: condition.id
        }
      }
    };

    // Add filters
    if (inStock === 'true') {
      where.inStock = true;
    } else if (inStock === 'false') {
      where.inStock = false;
    }

    if (priceMin) {
      where.price = {
        ...where.price,
        gte: parseFloat(priceMin)
      };
    }

    if (priceMax) {
      where.price = {
        ...where.price,
        lte: parseFloat(priceMax)
      };
    }

    if (brand) {
      where.brand = {
        slug: brand
      };
    }

    // Build orderBy clause
    let orderBy = {};
    if (sort === 'price') {
      orderBy = { price: order };
    } else if (sort === 'createdAt') {
      orderBy = { createdAt: order };
    } else {
      orderBy = { name: order };
    }

    // Get products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          salePrice: true,
          images: true,
          sku: true,
          inStock: true,
          prescriptionRequired: true,
          ingredients: true,
          usageInstructions: true,
          createdAt: true,
          updatedAt: true,
          brand: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.product.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        condition: {
          id: condition.id,
          name: condition.name,
          slug: slug
        },
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching products by condition:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products for this condition'
    });
  }
};

module.exports = {
  getConditions,
  getConditionBySlug,
  getProductsByCondition
};