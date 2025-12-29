// components/admin/ShippingManager.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";

export default function ShippingManager() {
  const [shippingData, setShippingData] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchShippingData();
  }, []);

  const fetchShippingData = async () => {
    try {
      const response = await api.get('/shipping/zones');
      setShippingData(response.data);
    } catch (error) {
      console.error('Failed to fetch shipping data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateZone = async (zoneKey, updatedData) => {
    try {
      setSaving(true);
      // This would call your admin API to update the JSON file
      await api.put('/admin/shipping/prices', {
        shippingZones: {
          [zoneKey]: updatedData
        }
      });
      await fetchShippingData();
      setEditingZone(null);
    } catch (error) {
      console.error('Failed to update shipping zone:', error);
      alert('Failed to update shipping zone');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading shipping data...</div>;
  if (!shippingData) return <div>No shipping data available</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Price Management</h1>
          <p className="text-gray-600">Version: {shippingData.version} • Last updated: {shippingData.lastUpdated}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipping Zones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Shipping Zones & Prices</h2>
          <div className="space-y-4">
            {Object.entries(shippingData.data).map(([zoneKey, zone]) => (
              <div key={zoneKey} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{zoneKey}</h3>
                    <p className="text-sm text-gray-600">{zone.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-700">
                      KES {zone.basePrice}
                    </div>
                    <div className="text-xs text-gray-500">
                      Free shipping: KES {zone.minOrderAmount}+
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 mb-3">
                  <span className="font-medium">Areas:</span> {zone.areas.slice(0, 3).join(', ')}
                  {zone.areas.length > 3 && ` +${zone.areas.length - 3} more`}
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Delivery: {zone.estimatedDeliveryDays} day(s)</span>
                  <span>Distance: {zone.estimatedDistance} km</span>
                  <span>Status: {zone.isAvailable ? '✅ Available' : '❌ Unavailable'}</span>
                </div>
                
                <button
                  onClick={() => setEditingZone(zoneKey)}
                  className="mt-3 w-full py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Edit Zone
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Global Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Global Shipping Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Global Free Shipping Threshold
                </label>
                <div className="flex items-center">
                  <span className="mr-2">KES</span>
                  <input
                    type="number"
                    value={shippingData.metadata?.freeShippingThreshold || 0}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    readOnly
                  />
                </div>
              </div>

              {/* Same Day Delivery Settings */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">Same Day Delivery</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shippingData.metadata?.sameDayDelivery?.available || false}
                      className="h-4 w-4 text-yellow-600"
                      readOnly
                    />
                    <span className="ml-2 text-sm">Available</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Cutoff Time:</span> {shippingData.metadata?.sameDayDelivery?.cutoffTime}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Additional Charge:</span> KES {shippingData.metadata?.sameDayDelivery?.additionalCharge}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Available Zones:</span> {shippingData.metadata?.sameDayDelivery?.areas?.join(', ')}
                  </div>
                </div>
              </div>

              {/* Express Delivery Settings */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">Express Delivery</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shippingData.metadata?.expressDelivery?.available || false}
                      className="h-4 w-4 text-green-600"
                      readOnly
                    />
                    <span className="ml-2 text-sm">Available</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Delivery Time:</span> {shippingData.metadata?.expressDelivery?.deliveryHours} hours
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Additional Charge:</span> KES {shippingData.metadata?.expressDelivery?.additionalCharge}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Available Zones:</span> {shippingData.metadata?.expressDelivery?.areas?.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* JSON Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">JSON Configuration</h2>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {JSON.stringify(shippingData, null, 2)}
              </pre>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Edit the config/shippingPrices.json file to make changes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}