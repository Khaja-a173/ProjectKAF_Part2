import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { Clock, ChefHat, CheckCircle, AlertCircle } from 'lucide-react';
import { whoami, getKDSLanes, advanceKDSOrder } from '../lib/api';
import { subscribeOrderStatusEvents, createDebouncedCallback } from '../lib/realtime';

interface KDSLanes {
  queued: KDSOrder[];
  preparing: KDSOrder[];
  ready: KDSOrder[];
}

interface KDSOrder {
  id: string;
  table_id?: string;
  order_type: string;
  total_amount: number;
  created_at: string;
  table_number?: string;
  current_status: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    note?: string;
  }>;
}

const KDSPage = () => {
  const [lanes, setLanes] = useState<KDSLanes>({ queued: [], preparing: [], ready: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);
  const debouncedRefetch = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadKDSData();
    
    return () => {
      // Cleanup subscriptions
      unsubscribeFunctions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
      unsubscribeFunctions.current = [];
      
      // No need to cleanup debounced function as it's handled internally
    };
  }, []);

  const loadKDSData = async () => {
    try {
      setLoading(true);
      const userData = await whoami();
      if (!userData.authenticated) {
        setError('Authentication required');
        return;
      }

      // Start realtime listeners
      if (userData.primary_tenant_id) {
        startRealtimeListeners(userData.primary_tenant_id);
      }

      // Create debounced refetch function
      debouncedRefetch.current = createDebouncedCallback(() => {
        loadKDSLanes();
      }, 300);

      const kdsData = await getKDSLanes();
      setLanes(kdsData);
      setError(null);
    } catch (err) {
      setError('Failed to load KDS data');
      console.error('Error loading KDS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startRealtimeListeners = (tenantId: string) => {
    try {
      // Subscribe to order status events to update lanes in real-time
      const statusEventsUnsub = subscribeOrderStatusEvents({
        tenantId,
        onInsert: (event) => {
          if (event.new?.order_id && debouncedRefetch.current) {
            debouncedRefetch.current();
          }
        }
      });
      unsubscribeFunctions.current.push(statusEventsUnsub);
    } catch (error) {
      console.error('Error starting KDS realtime listeners:', error);
    }
  };

  const loadKDSLanes = async () => {
    try {
      const kdsData = await getKDSLanes();
      setLanes(kdsData);
    } catch (error) {
      console.error('Error loading KDS lanes:', error);
    }
  };

  const handleAdvanceOrder = async (orderId: string, toStatus: string) => {
    try {
      await advanceKDSOrder(orderId, toStatus);
      // The realtime listener will update the UI automatically
    } catch (error) {
      console.error('Error advancing order:', error);
      setError('Failed to advance order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 'text-yellow-600';
      case 'preparing':
        return 'text-blue-600';
      case 'ready':
        return 'text-green-600';
      case 'served':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ChefHat className="h-8 w-8 mr-3 text-blue-600" />
            Kitchen Display System
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queued Lane */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-yellow-500 text-white px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-semibold">Queued ({lanes.queued.length})</h2>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {lanes.queued.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Order #{order.id.slice(-8)}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatTime(order.created_at)}
                    </span>
                  </div>
                  
                  {order.table_number && (
                    <p className="text-sm text-gray-600 mb-2">Table {order.table_number}</p>
                  )}
                  
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {item.quantity}x {item.name}
                        {item.note && <span className="text-gray-500 italic"> - {item.note}</span>}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <button
                      onClick={() => handleAdvanceOrder(order.id, 'preparing')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Start Preparing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preparing Lane */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-blue-500 text-white px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-semibold">Preparing ({lanes.preparing.length})</h2>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {lanes.preparing.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Order #{order.id.slice(-8)}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatTime(order.created_at)}
                    </span>
                  </div>
                  
                  {order.table_number && (
                    <p className="text-sm text-gray-600 mb-2">Table {order.table_number}</p>
                  )}
                  
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {item.quantity}x {item.name}
                        {item.note && <span className="text-gray-500 italic"> - {item.note}</span>}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <button
                      onClick={() => handleAdvanceOrder(order.id, 'ready')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Mark Ready
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready Lane */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-green-500 text-white px-4 py-3 rounded-t-lg">
              <h2 className="text-lg font-semibold">Ready ({lanes.ready.length})</h2>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {lanes.ready.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 border-green-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Order #{order.id.slice(-8)}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatTime(order.created_at)}
                    </span>
                  </div>
                  
                  {order.table_number && (
                    <p className="text-sm text-gray-600 mb-2">Table {order.table_number}</p>
                  )}
                  
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {item.quantity}x {item.name}
                        {item.note && <span className="text-gray-500 italic"> - {item.note}</span>}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </span>
                    <button
                      onClick={() => handleAdvanceOrder(order.id, 'served')}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Mark Served
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {lanes.queued.length === 0 && lanes.preparing.length === 0 && lanes.ready.length === 0 && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders</h3>
            <p className="text-gray-600">There are no orders to display at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KDSPage;