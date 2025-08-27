import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { getPaymentConfig } from '../lib/api';
import MethodPicker from '../components/payments/MethodPicker';
import PayButton from '../components/payments/PayButton';
import { subscribePaymentIntents } from '../lib/realtime';
import { ShoppingCart, AlertCircle } from 'lucide-react';

interface PaymentConfig {
  configured: boolean;
  provider?: string;
  currency?: string;
  enabled_methods?: string[];
}

// Mock cart data - in real app this would come from cart context/state
const MOCK_CART = {
  items: [
    { id: 1, name: 'Margherita Pizza', price: 12.99, quantity: 2 },
    { id: 2, name: 'Caesar Salad', price: 8.50, quantity: 1 },
    { id: 3, name: 'Garlic Bread', price: 4.99, quantity: 1 }
  ],
  subtotal: 39.47,
  tax: 3.95,
  total: 43.42
};

export default function Checkout() {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ configured: false });
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIntentId, setCurrentIntentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  useEffect(() => {
    loadPaymentConfig();
    
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
    };
  }, []);

  useEffect(() => {
    // Subscribe to payment intent updates when we have an intent ID
    if (currentIntentId && paymentConfig.configured) {
      startPaymentIntentListener(currentIntentId);
    }
  }, [currentIntentId, paymentConfig.configured]);

  const loadPaymentConfig = async () => {
    try {
      setLoading(true);
      const config = await getPaymentConfig();
      setPaymentConfig(config);
      
      // Auto-select first available method
      if (config.enabled_methods && config.enabled_methods.length > 0) {
        setSelectedMethod(config.enabled_methods[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment configuration');
    } finally {
      setLoading(false);
    }
  };

  const startPaymentIntentListener = (intentId: string) => {
    try {
      // We need tenant ID for the subscription - get it from auth context or API
      // For now, we'll use a placeholder approach since we don't have direct access to tenant ID here
      // In a real implementation, you'd get this from your auth context
      const tenantId = 'current-tenant'; // This should come from auth context
      
      const paymentIntentUnsub = subscribePaymentIntents({
        tenantId,
        onUpdate: (event) => {
          if (event.new?.id === intentId) {
            handlePaymentIntentUpdate(event.new);
          }
        }
      });
      unsubscribeFunctions.current.push(paymentIntentUnsub);
    } catch (error) {
      console.error('Error starting payment intent listener:', error);
    }
  };

  const handlePaymentIntentUpdate = (intent: any) => {
    setPaymentStatus(intent.status);
    
    switch (intent.status) {
      case 'processing':
        // Show spinner - handled by PayButton component
        break;
      case 'requires_action':
        // Prompt for 3DS or additional authentication
        console.log('Payment requires additional action');
        break;
      case 'succeeded':
        // Show success and navigate
        setTimeout(() => {
          window.location.href = '/checkout/success';
        }, 1000);
        break;
      case 'failed':
      case 'canceled':
        // Show error
        setError('Payment failed. Please try again.');
        break;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handlePaymentSuccess = (result: any) => {
    console.log('Payment successful:', result);
    if (result.intent_id) {
      setCurrentIntentId(result.intent_id);
    }
    // In real app, you might update order status, clear cart, etc.
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setPaymentStatus('failed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
              <ShoppingCart className="h-6 w-6 text-indigo-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
            </div>

            <div className="space-y-4">
              {MOCK_CART.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(item.price * item.quantity, paymentConfig.currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(MOCK_CART.subtotal, paymentConfig.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(MOCK_CART.tax, paymentConfig.currency)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(MOCK_CART.total, paymentConfig.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Payment</h2>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {!paymentConfig.configured ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Payment Not Configured
                </h3>
                <p className="text-gray-600">
                  The restaurant hasn't set up payment processing yet. 
                  Please contact them directly to complete your order.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <MethodPicker
                  methods={paymentConfig.enabled_methods || []}
                  selectedMethod={selectedMethod}
                  onMethodSelect={setSelectedMethod}
                />

                {selectedMethod && (
                  <PayButton
                    amount={MOCK_CART.total}
                    currency={paymentConfig.currency || 'USD'}
                    orderId={`order_${Date.now()}`}
                    method={selectedMethod}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}