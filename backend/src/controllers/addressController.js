const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: {
        isDefault: 'desc'
      }
    });

    res.json({
      success: true,
      data: { addresses }
    });
  } catch (error) {
    console.error('Get user addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { street, city, state, zipCode, country, isDefault } = req.body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        street,
        city,
        state,
        zipCode,
        country: country || 'India',
        isDefault: isDefault || false
      }
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;
    const { street, city, state, zipCode, country, isDefault } = req.body;

    // Verify address belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        street,
        city,
        state,
        zipCode,
        country,
        isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault
      }
    });

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: { address }
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    await prisma.address.delete({
      where: { id: addressId }
    });

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params; // Use addressId, not id
    
    console.log(`Setting address ${addressId} as default for user ${userId}`);
    
    // First, unset all other defaults
    await prisma.address.updateMany({
      where: { 
        userId: userId,
        isDefault: true 
      },
      data: { isDefault: false }
    });
    
    // Then set the specified address as default
    const updatedAddress = await prisma.address.update({
      where: { 
        id: addressId,
        userId: userId 
      },
      data: { isDefault: true }
    });
    
    res.json({
      success: true,
      data: { address: updatedAddress },
      message: 'Address set as default successfully'
    });
    
  } catch (error) {
    console.error('Set default address error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Address not found or does not belong to you'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to set default address'
    });
  }
};

module.exports = {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};