import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { Clock, ChefHat, CheckCircle, AlertCircle } from 'lucide-react';
import { whoami, getKDSOrders } from '../lib/api';
import { subscribeOrderStatusEvents } from '../lib/realtime';

interface KDSOrder {
  id: string;
  status: string;
  items: any[];
  created_at: string;
}

const KDSPage = () => {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadOrders();
    
    return () => {
      // Cleanup subscriptions and timeouts
      unsubscribeFunctions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
      unsubscribeFunctions.current = [];
      
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  const loadOrders = async () => {
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

      const kdsData = await getKDSOrders();
      setOrders(kdsData);
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
      console.error('Error loading orders:', err);
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
          if (event.new?.order_id) {
            invalidateLaneFor(event.new.order_id);
          }
        }
      });
      unsubscribeFunctions.current.push(statusEventsUnsub);
    } catch (error) {
      console.error('Error starting KDS realtime listeners:', error);
    }
  };

  const invalidateLaneFor = (orderId: string) => {
    // Debounce refetch to avoid too many API calls
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    
    refetchTimeoutRef.current = setTimeout(() => {
      loadOrders();
    }, 300);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'preparing':
        return 'text-blue-600';
      case 'ready':
        return 'text-green-600';
      case 'completed':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{order.id}
                </h3>
                <span className={`flex items-center ${getStatusColor(order.status)}`}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {order.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                {order.items.map((item, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {item.quantity}x {item.name}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(order.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
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