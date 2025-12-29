const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const shippingService = require('../services/shippingService');

exports.calculateShipping = async (req, res) => {
  try {
    const { state: area, cartTotal = 0, options = {} } = req.body;
    
    if (!area) {
      return res.status(400).json({ 
        success: false, 
        message: 'Area is required to calculate shipping' 
      });
    }
    
    const shipping = shippingService.calculateShipping(area, cartTotal, options);
    
    res.json({
      success: true,
      data: shipping,
      metadata: {
        freeShippingThreshold: shippingService.shippingPrices?.sameDayDelivery?.freeShippingThreshold || 5000,
        sameDayDelivery: shippingService.shippingPrices?.sameDayDelivery,
        expressDelivery: shippingService.shippingPrices?.expressDelivery
      }
    });
  } catch (error) {
    console.error('Shipping calculation error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to calculate shipping' 
    });
  }
};

// NEW: Get shipping estimate for checkout
exports.estimateShipping = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user?.id;
    
    console.log('🚚 Getting shipping estimate for address:', addressId);
    
    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: 'Address ID is required'
      });
    }
    
    // Get the address from database
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: userId
      }
    });
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    // Extract area/state from address
    const area = address.state || address.city || 'Nairobi';
    
    // Find the zone for this area
    const zone = shippingService.findZoneForArea(area);
    const zoneData = shippingService.shippingPrices.shippingZones[zone] || 
                     shippingService.shippingPrices.shippingZones.DEFAULT;
    
    console.log('📍 Area:', area, 'Zone:', zone, 'Zone data:', zoneData);
    
    // Calculate shipping options
    const shippingOptions = [];
    
    // Standard delivery option
    shippingOptions.push({
      id: 'standard',
      name: 'Standard Delivery',
      cost: zoneData.basePrice || 150,
      days: zoneData.estimatedDeliveryDays || 3,
      estimatedDays: `${zoneData.estimatedDeliveryDays || 3} business days`,
      description: zoneData.description || 'Regular delivery',
      available: zoneData.isAvailable !== false
    });
    
    // Express delivery if available
    const expressData = shippingService.shippingPrices.expressDelivery;
    if (expressData?.available && expressData.areas?.includes(zone)) {
      const expressCost = zoneData.basePrice + (expressData.additionalCharge || 150);
      shippingOptions.push({
        id: 'express',
        name: 'Express Delivery',
        cost: expressCost,
        days: 1,
        estimatedDays: '1-2 business days',
        description: 'Fast delivery',
        available: true,
        additionalInfo: `Delivered in ${expressData.deliveryHours || 24} hours`
      });
    }
    
    // Same day delivery if available
    const sameDayData = shippingService.shippingPrices.sameDayDelivery;
    if (sameDayData?.available && sameDayData.areas?.includes(zone)) {
      const sameDayCost = zoneData.basePrice + (sameDayData.additionalCharge || 200);
      shippingOptions.push({
        id: 'same-day',
        name: 'Same Day Delivery',
        cost: sameDayCost,
        days: 0,
        estimatedDays: 'Same day delivery',
        description: 'Delivery on the same day',
        available: true,
        additionalInfo: `Order before ${sameDayData.cutoffTime || '2:00 PM'}`
      });
    }
    
    // Calculate free shipping threshold
    const freeShippingThreshold = sameDayData?.freeShippingThreshold || 5000;
    
    res.json({
      success: true,
      data: {
        addressId,
        area,
        zone,
        options: shippingOptions,
        estimatedDays: zoneData.estimatedDeliveryDays || 3,
        freeShippingThreshold,
        message: `Shipping estimate for ${area} (${zone})`
      }
    });
    
  } catch (error) {
    console.error('Shipping estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate shipping estimate',
      error: error.message,
      fallback: {
        options: [
          {
            id: 'standard',
            name: 'Standard Delivery',
            cost: 150,
            days: 3,
            estimatedDays: '3-5 business days',
            description: 'Regular delivery',
            available: true
          }
        ],
        estimatedDays: '3-5'
      }
    });
  }
};

exports.getShippingZones = async (req, res) => {
  try {
    const zones = shippingService.getShippingZones();
    const shippingPrices = shippingService.shippingPrices;
    
    res.json({
      success: true,
      data: zones,
      version: shippingPrices.version || '1.0.0',
      lastUpdated: shippingPrices.lastUpdated || new Date().toISOString().split('T')[0],
      metadata: {
        sameDayDelivery: shippingPrices.sameDayDelivery,
        expressDelivery: shippingPrices.expressDelivery
      }
    });
  } catch (error) {
    console.error('Get shipping zones error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get shipping zones' 
    });
  }
};

exports.getZoneForArea = async (req, res) => {
  try {
    const { area } = req.params;
    
    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Area parameter is required'
      });
    }
    
    const zone = shippingService.findZoneForArea(area);
    const zoneData = shippingService.shippingPrices.shippingZones[zone] || 
                     shippingService.shippingPrices.shippingZones.DEFAULT;
    
    res.json({
      success: true,
      data: {
        area,
        zone,
        ...zoneData
      }
    });
  } catch (error) {
    console.error('Get zone for area error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to get zone for area' 
    });
  }
};

// Admin endpoint to update shipping prices
exports.updateShippingPrices = async (req, res) => {
  try {
    const result = shippingService.updateShippingPrices(req.body);
    res.json(result);
  } catch (error) {
    console.error('Update shipping prices error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update shipping prices' 
    });
  }
};