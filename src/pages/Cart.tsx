import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCart, createCheckoutIntent } from '../lib/api';
import { ShoppingCart, Plus, Minus, Trash2, AlertCircle } from 'lucide-react';

interface CartData {
  cart: {
    id: string;
    order_type: string;
    table_id?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    note?: string;
    menu_item_id: string;
    name: string;
    description: string;
    price: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
}

export default function Cart() {
  const { cartId } = useParams<{ cartId: string }>();
  const navigate = useNavigate();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');

  const ENABLE_PAYMENTS = import.meta.env.VITE_ENABLE_PAYMENTS === 'true';

  useEffect(() => {
    if (cartId) {
      loadCart();
    }
  }, [cartId]);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCart(cartId!);
      setCartData(data);
      setOrderType(data.cart.order_type);
    } catch (err: any) {
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!ENABLE_PAYMENTS || !cartData) return;

    try {
      const intent = await createCheckoutIntent({
        cart_id: cartId,
        provider: 'mock'
      });

      navigate(`/checkout/${intent.intent.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Cart</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadCart}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!cartData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Cart not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Your Order</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Type Selector */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Type</h3>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="dine_in"
                    checked={orderType === 'dine_in'}
                    onChange={(e) => setOrderType(e.target.value as 'dine_in')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">Dine In</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="takeaway"
                    checked={orderType === 'takeaway'}
                    onChange={(e) => setOrderType(e.target.value as 'takeaway')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700">Takeaway</span>
                </label>
              </div>
            </div>

            {/* Items */}
            {cartData.items.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-600 mt-1">{item.description}</p>
                    )}
                    <p className="text-lg font-bold text-indigo-600 mt-2">
                      ${item.price.toFixed(2)} each
                    </p>
                    {item.note && (
                      <p className="text-sm text-gray-500 mt-1 italic">Note: {item.note}</p>
                    )}
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">
                      Qty: {item.quantity}
                    </span>
                    <span className="font-bold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 h-fit">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${cartData.totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${cartData.totals.tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>${cartData.totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {ENABLE_PAYMENTS ? (
              <button
                onClick={handleCheckout}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Proceed to Payment
              </button>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  Payment processing is not available yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}