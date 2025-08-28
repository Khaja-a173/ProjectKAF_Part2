import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRef } from 'react';
import { useRef } from 'react';
import { useRef } from 'react';
import { getPaymentConfig, confirmCheckout, cancelCheckout, emitPaymentEvent } from '../lib/api';
import MethodPicker from '../components/payments/MethodPicker';
import PayButton from '../components/payments/PayButton';
import { subscribePaymentIntents } from '../lib/realtime';
import { subscribePaymentIntents } from '../lib/realtime';
import { subscribePaymentIntents } from '../lib/realtime';
import { ShoppingCart, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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
  const { intentId } = useParams<{ intentId: string }>();
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ configured: false });
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIntentId, setCurrentIntentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  useEffect(() => {
    loadPaymentConfig();
    
    if (intentId) {
      setCurrentIntentId(intentId);
    }
    
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

  useEffect(() => {
    // Subscribe to payment intent updates when we have an intent ID
    if (currentIntentId && paymentConfig.configured) {
      startPaymentIntentListener(currentIntentId);
    }
  }, [currentIntentId, paymentConfig.configured]);

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
        setProcessing(true);
        break;
      case 'requires_action':
        // Prompt for 3DS or additional authentication
        console.log('Payment requires additional action');
        break;
      case 'succeeded':
        // Show success and navigate
        setProcessing(false);
        setTimeout(() => {
          window.location.href = '/checkout/success';
        }, 1000);
        break;
      case 'failed':
      case 'canceled':
        // Show error
        setProcessing(false);
        setError('Payment failed. Please try again.');
        break;
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
        setProcessing(true);
        break;
      case 'requires_action':
        // Prompt for 3DS or additional authentication
        console.log('Payment requires additional action');
        break;
      case 'succeeded':
        // Show success and navigate
        setProcessing(false);
        setTimeout(() => {
          window.location.href = '/checkout/success';
        }, 1000);
        break;
      case 'failed':
      case 'canceled':
        // Show error
        setProcessing(false);
        setError('Payment failed. Please try again.');
        break;
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
        setProcessing(true);
        break;
      case 'requires_action':
        // Prompt for 3DS or additional authentication
        console.log('Payment requires additional action');
        break;
      case 'succeeded':
        // Show success and navigate
        setProcessing(false);
        setTimeout(() => {
          window.location.href = '/checkout/success';
        }, 1000);
        break;
      case 'failed':
      case 'canceled':
        // Show error
        setProcessing(false);
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
    setProcessing(false);
  };

  const handleMockPayment = async () => {
    if (!currentIntentId) return;

    try {
      setProcessing(true);
      setError(null);

      // Emit payment started event
      await emitPaymentEvent(currentIntentId, 'payment_started');
      
      // Simulate processing delay
      setTimeout(async () => {
        try {
          // Confirm the payment
          const result = await confirmCheckout({
            intent_id: currentIntentId,
            provider_payload: { mock: true }
          });

          if (result.status === 'succeeded') {
            await emitPaymentEvent(currentIntentId, 'payment_succeeded');
            setPaymentStatus('succeeded');
            setTimeout(() => {
              window.location.href = '/checkout/success';
            }, 1000);
          } else {
            throw new Error('Payment confirmation failed');
          }
        } catch (err: any) {
          await emitPaymentEvent(currentIntentId, 'payment_failed', { error: err.message });
          setError(err.message || 'Payment failed');
          setProcessing(false);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      setProcessing(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!currentIntentId) return;

    try {
      await cancelCheckout({ intent_id: currentIntentId });
      setPaymentStatus('canceled');
      setError('Payment was canceled');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel payment');
    }
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
        {paymentStatus === 'succeeded' ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">Your order has been confirmed and is being prepared.</p>
            <div className="animate-pulse text-sm text-gray-500">Redirecting...</div>
          </div>
        ) : paymentStatus === 'canceled' ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Canceled</h2>
            <p className="text-gray-600 mb-4">Your payment was canceled. You can try again or contact support.</p>
          </div>
        ) : (
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
                {processing ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Payment</h3>
                    <p className="text-gray-600">Please wait while we process your payment...</p>
                    <button
                      onClick={handleCancelPayment}
                      className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                    >
                      Cancel Payment
                    </button>
                  </div>
                ) : (
                  <>
                    <MethodPicker
                      methods={paymentConfig.enabled_methods || []}
                      selectedMethod={selectedMethod}
                      onMethodSelect={setSelectedMethod}
                    />

                    {selectedMethod && (
                      <div className="space-y-4">
                        {selectedMethod === 'cash' ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                            <p className="text-yellow-800">
                              You've selected cash payment. Please pay at the counter when your order is ready.
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={handleMockPayment}
                            disabled={processing}
                            className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Pay {formatCurrency(MOCK_CART.total, paymentConfig.currency)}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}