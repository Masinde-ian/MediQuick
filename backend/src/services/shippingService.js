// services/shippingService.js
const fs = require('fs');
const path = require('path');

class ShippingService {
  constructor() {
    this.shippingPrices = this.loadShippingPrices();
    this.areaToZoneMap = this.createAreaToZoneMap();
  }

  loadShippingPrices() {
    try {
      const filePath = path.join(__dirname, '../config/shippingPrices.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading shipping prices:', error);
      return this.getDefaultPrices();
    }
  }

  getDefaultPrices() {
    return {
      shippingZones: {
        DEFAULT: {
          basePrice: 300,
          minOrderAmount: 0,
          estimatedDeliveryDays: 2,
          isAvailable: true
        }
      }
    };
  }

  createAreaToZoneMap() {
    const map = {};
    const { shippingZones } = this.shippingPrices;
    
    for (const [zone, data] of Object.entries(shippingZones)) {
      if (data.areas) {
        data.areas.forEach(area => {
          const normalizedArea = area.toLowerCase().trim();
          map[normalizedArea] = zone;
        });
      }
    }
    return map;
  }

  findZoneForArea(area) {
    if (!area) return 'DEFAULT';
    
    const normalizedArea = area.toLowerCase().trim();
    
    // Exact match
    if (this.areaToZoneMap[normalizedArea]) {
      return this.areaToZoneMap[normalizedArea];
    }
    
    // Partial match
    for (const [storedArea, zone] of Object.entries(this.areaToZoneMap)) {
      if (normalizedArea.includes(storedArea) || storedArea.includes(normalizedArea)) {
        return zone;
      }
    }
    
    // Keyword matching for common patterns
    const areaLower = normalizedArea;
    
    if (areaLower.includes('cbd') || areaLower.includes('central') || areaLower.includes('business')) {
      return 'CBD';
    } else if (areaLower.includes('westlands') || areaLower.includes('lavington') || areaLower.includes('kileleshwa')) {
      return 'WEST';
    } else if (areaLower.includes('karen') || areaLower.includes('langata') || areaLower.includes('south')) {
      return 'SOUTH';
    } else if (areaLower.includes('eastleigh') || areaLower.includes('embakasi') || areaLower.includes('buruburu')) {
      return 'EAST';
    } else if (areaLower.includes('ruiru') || areaLower.includes('kitengela') || areaLower.includes('rongai')) {
      return 'OUTSKIRTS';
    }
    
    return 'DEFAULT';
  }

  calculateShipping(area, cartTotal = 0, options = {}) {
    const zone = this.findZoneForArea(area);
    const zoneData = this.shippingPrices.shippingZones[zone] || this.shippingPrices.shippingZones.DEFAULT;
    
    if (!zoneData.isAvailable) {
      throw new Error(`Shipping to ${area} is currently unavailable`);
    }
    
    let totalShipping = zoneData.basePrice;
    const isFree = cartTotal >= zoneData.minOrderAmount;
    
    if (isFree) {
      totalShipping = 0;
    }
    
    // Check for same-day delivery
    const now = new Date();
    const cutoffTime = this.shippingPrices.sameDayDelivery.cutoffTime;
    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
    const cutoffDate = new Date(now);
    cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);
    
    const canSameDayDelivery = options.requestSameDay && 
                              this.shippingPrices.sameDayDelivery.available &&
                              this.shippingPrices.sameDayDelivery.areas.includes(zone) &&
                              now < cutoffDate;
    
    if (canSameDayDelivery) {
      totalShipping += this.shippingPrices.sameDayDelivery.additionalCharge;
    }
    
    // Check for express delivery
    if (options.requestExpress && 
        this.shippingPrices.expressDelivery.available &&
        this.shippingPrices.expressDelivery.areas.includes(zone)) {
      totalShipping += this.shippingPrices.expressDelivery.additionalCharge;
    }
    
    return {
      zone,
      basePrice: zoneData.basePrice,
      perKmPrice: zoneData.perKmPrice,
      minOrderAmount: zoneData.minOrderAmount,
      estimatedDistance: zoneData.estimatedDistance,
      estimatedDeliveryDays: canSameDayDelivery ? 0 : zoneData.estimatedDeliveryDays,
      estimatedDeliveryHours: options.requestExpress ? this.shippingPrices.expressDelivery.deliveryHours : null,
      totalShipping: Math.max(0, totalShipping),
      isFree,
      canSameDayDelivery,
      sameDayAdditionalCharge: this.shippingPrices.sameDayDelivery.additionalCharge,
      expressAdditionalCharge: this.shippingPrices.expressDelivery.additionalCharge,
      currency: "KES",
      description: zoneData.description,
      areas: zoneData.areas
    };
  }

  getShippingZones() {
    return this.shippingPrices.shippingZones;
  }

  updateShippingPrices(newPrices) {
    try {
      const filePath = path.join(__dirname, '../config/shippingPrices.json');
      const currentPrices = this.loadShippingPrices();
      
      // Merge new prices with existing
      const updatedPrices = {
        ...currentPrices,
        ...newPrices,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      fs.writeFileSync(filePath, JSON.stringify(updatedPrices, null, 2), 'utf8');
      this.shippingPrices = updatedPrices;
      this.areaToZoneMap = this.createAreaToZoneMap();
      
      return { success: true, message: 'Shipping prices updated successfully' };
    } catch (error) {
      console.error('Error updating shipping prices:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new ShippingService();