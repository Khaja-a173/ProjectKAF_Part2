import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { Clock, ChefHat, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { whoami, getKDSLanes, advanceKDSOrder } from '../lib/api';
import { subscribeOrderStatusEvents, subscribeOrders } from '../lib/realtime';

interface KDSOrder {
  id: string;
  table_id?: string;
  table_number?: string;
  order_type: string;
  current_status: string;
  total_amount: number;
  created_at: string;
  status_updated_at?: string;
  items: Array<{
    id: string;
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    note?: string;
  }>;
}

interface KDSLanes {
  queued: KDSOrder[];
  preparing: KDSOrder[];
  ready: KDSOrder[];
}

export default function KDS() {
  const [lanes, setLanes] = useState<KDSLanes>({ queued: [], preparing: [], ready: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ENABLE_KDS_RT = import.meta.env.VITE_ENABLE_KDS_RT === 'true';

  useEffect(() => {
    if (!ENABLE_KDS_RT) {
      setError('KDS features are not enabled');
      setLoading(false);
      return;
    }

    loadLanes();
    
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

  const loadLanes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userData = await whoami();
      if (!userData.authenticated) {
        setError('Authentication required');
        return;
      }

      // Start realtime listeners
      if (userData.primary_tenant_id) {
        startRealtimeListeners(userData.primary_tenant_id);
      }

      const lanesData = await getKDSLanes();
      setLanes(lanesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load KDS lanes');
    } finally {
      setLoading(false);
    }
  };

  const startRealtimeListeners = (tenantId: string) => {
    try {
      // Subscribe to orders for new orders
      const ordersUnsub = subscribeOrders({
        tenantId,
        onInsert: () => debouncedRefetch(),
        onUpdate: () => debouncedRefetch()
      });
      unsubscribeFunctions.current.push(ordersUnsub);

      // Subscribe to order status events to update lanes in real-time
      const statusEventsUnsub = subscribeOrderStatusEvents({
        tenantId,
        onInsert: () => debouncedRefetch()
      });
      unsubscribeFunctions.current.push(statusEventsUnsub);
    } catch (error) {
      console.error('Error starting KDS realtime listeners:', error);
    }
  };

  const debouncedRefetch = () => {
    // Debounce refetch to avoid too many API calls
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    
    refetchTimeoutRef.current = setTimeout(() => {
      loadLanes();
    }, 300);
  };

  const handleAdvanceOrder = async (orderId: string, toStatus: string) => {
    try {
      setAdvancing(orderId);
      await advanceKDSOrder(orderId, toStatus);
      // The realtime listener will update the UI
    } catch (err: any) {
      setError(err.message || 'Failed to advance order');
    } finally {
      setAdvancing(null);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'new':
      case 'confirmed':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'served';
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 'Start Preparing';
      case 'preparing':
        return 'Mark Ready';
      case 'ready':
        return 'Mark Served';
      default:
        return 'Complete';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 'border-yellow-400';
      case 'preparing':
        return 'border-blue-400';
      case 'ready':
        return 'border-green-400';
      case 'served':
        return 'border-gray-400';
      default:
        return 'border-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading KDS lanes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">KDS Not Available</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {ENABLE_KDS_RT && (
            <button
              onClick={loadLanes}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ChefHat className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Kitchen Display System</h1>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Queued: {lanes.queued.length}</span>
              <span>Preparing: {lanes.preparing.length}</span>
              <span>Ready: {lanes.ready.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {lanes.queued.length === 0 && lanes.preparing.length === 0 && lanes.ready.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
            <p className="text-gray-500">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Queued Lane */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Queued ({lanes.queued.length})
                </h2>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {lanes.queued.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvanceOrder}
                    advancing={advancing === order.id}
                    getStatusColor={getStatusColor}
                    getTimeElapsed={getTimeElapsed}
                    getNextStatus={getNextStatus}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
                {lanes.queued.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No queued orders</p>
                )}
              </div>
            </div>

            {/* Preparing Lane */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Preparing ({lanes.preparing.length})
                </h2>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {lanes.preparing.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvanceOrder}
                    advancing={advancing === order.id}
                    getStatusColor={getStatusColor}
                    getTimeElapsed={getTimeElapsed}
                    getNextStatus={getNextStatus}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
                {lanes.preparing.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No orders in preparation</p>
                )}
              </div>
            </div>

            {/* Ready Lane */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Ready ({lanes.ready.length})
                </h2>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {lanes.ready.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvanceOrder}
                    advancing={advancing === order.id}
                    getStatusColor={getStatusColor}
                    getTimeElapsed={getTimeElapsed}
                    getNextStatus={getNextStatus}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
                {lanes.ready.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No orders ready</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: KDSOrder;
  onAdvance: (orderId: string, toStatus: string) => void;
  advancing: boolean;
  getStatusColor: (status: string) => string;
  getTimeElapsed: (createdAt: string) => string;
  getNextStatus: (currentStatus: string) => string | null;
  getStatusLabel: (status: string) => string;
}

function OrderCard({ 
  order, 
  onAdvance, 
  advancing, 
  getStatusColor, 
  getTimeElapsed, 
  getNextStatus, 
  getStatusLabel 
}: OrderCardProps) {
  const nextStatus = getNextStatus(order.current_status);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className={`border-l-4 p-4 rounded-r-lg ${getStatusColor(order.current_status)}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            Order #{order.id.slice(-6)}
          </h3>
          {order.table_number && (
            <p className="text-sm text-gray-600">Table {order.table_number}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {getTimeElapsed(order.created_at)}
          </p>
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(order.total_amount)}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-900">
              {item.quantity}× {item.name}
            </span>
            {item.note && (
              <span className="text-gray-500 italic text-xs">
                {item.note}
              </span>
            )}
          </div>
        ))}
      </div>

      {nextStatus && (
        <button
          onClick={() => onAdvance(order.id, nextStatus)}
          disabled={advancing}
          className="w-full flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {advancing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              {getStatusLabel(order.current_status)}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </button>
      )}
    </div>
  );
}