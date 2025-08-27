import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRef } from 'react';
import { getOrders } from '../lib/api';
import { subscribeOrders, subscribeOrderStatusEvents } from '../lib/realtime';
import { Clock, CheckCircle, Utensils, Package } from 'lucide-react';

interface Order {
  id: string;
  table_id?: string;
  order_type: string;
  status: string;
  total_amount: number;
  created_at: string;
  table_number?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    note?: string;
  }>;
  status_events: Array<{
    from_status: string;
    to_status: string;
    created_at: string;
    note?: string;
  }>;
}

const STATUS_STEPS = [
  { key: 'new', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Utensils },
  { key: 'ready', label: 'Ready', icon: CheckCircle },
  { key: 'served', label: 'Served', icon: CheckCircle }
];

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }

    return () => {
      unsubscribeFunctions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
      unsubscribeFunctions.current = [];
    };
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get orders and find the specific one
      const ordersData = await getOrders();
      const foundOrder = ordersData.orders?.find((o: Order) => o.id === orderId);
      
      if (!foundOrder) {
        setError('Order not found');
        return;
      }

      setOrder(foundOrder);

      // Start realtime listeners if we have tenant context
      // Note: In a real app, you'd get tenant ID from auth context
      // For now, we'll use a placeholder
      startRealtimeListeners('current-tenant');
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const startRealtimeListeners = (tenantId: string) => {
    try {
      const ordersUnsub = subscribeOrders({
        tenantId,
        onUpdate: (event) => {
          if (event.new?.id === orderId) {
            loadOrder();
          }
        }
      });
      unsubscribeFunctions.current.push(ordersUnsub);

      const statusEventsUnsub = subscribeOrderStatusEvents({
        tenantId,
        onInsert: (event) => {
          if (event.new?.order_id === orderId) {
            loadOrder();
          }
        }
      });
      unsubscribeFunctions.current.push(statusEventsUnsub);
    } catch (error) {
      console.error('Error starting realtime listeners:', error);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const currentStatus = order.status || 'new';
    return STATUS_STEPS.findIndex(step => step.key === currentStatus);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <Package className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600">{error || 'The order you\'re looking for could not be found.'}</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(-8)}</h1>
              <p className="text-gray-600 mt-1">
                Placed at {formatTime(order.created_at)}
                {order.table_number && ` • Table ${order.table_number}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(order.total_amount)}
              </p>
              <p className="text-sm text-gray-500 capitalize">{order.order_type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Status Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>
          <div className="relative">
            <div className="flex justify-between">
              {STATUS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-indigo-100' : ''}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p
                      className={`mt-2 text-sm font-medium ${
                        isCompleted ? 'text-indigo-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`absolute top-5 left-10 w-full h-0.5 ${
                          index < currentStepIndex ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                        style={{ width: 'calc(100vw / 5 - 2.5rem)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  {item.note && (
                    <p className="text-sm text-gray-500 mt-1 italic">Note: {item.note}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium text-gray-900">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status History */}
        {order.status_events && order.status_events.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
            <div className="space-y-3">
              {order.status_events.map((event, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      Status changed to <span className="font-medium capitalize">{event.to_status}</span>
                    </p>
                    {event.note && (
                      <p className="text-xs text-gray-500 mt-1">{event.note}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{formatTime(event.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}