import React, { useState } from 'react';
import { createPaymentIntent, capturePayment } from '../../lib/api';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface PayButtonProps {
  amount: number;
  currency: string;
  orderId?: string;
  method: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export default function PayButton({ 
  amount, 
  currency, 
  orderId, 
  method, 
  onSuccess, 
  onError 
}: PayButtonProps) {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Create payment intent
      const intent = await createPaymentIntent({
        amount,
        currency,
        order_id: orderId,
        method,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });

      // For mock provider, simulate immediate success
      if (intent.provider === 'mock') {
        // Simulate capture
        const captureResult = await capturePayment({
          intent_id: intent.intent_id,
          provider: 'mock',
          amount
        });

        setSuccess(true);
        onSuccess?.(captureResult);
        
        // Navigate to success page after a brief delay
        setTimeout(() => {
          window.location.href = '/checkout/success';
        }, 1500);
        return;
      }

      // For other providers, show configuration message
      setError('Provider not configured yet. Please contact the restaurant admin to set up payment processing.');
      onError?.('Provider not configured yet');

    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (success) {
    return (
      <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
        <span className="text-green-700 font-medium">Payment Successful!</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-700 text-sm">{error}</p>
            {error.includes('not configured') && (
              <p className="text-red-600 text-xs mt-1">
                The restaurant needs to configure their payment provider in the admin settings.
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={processing || !method}
        className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Pay {formatAmount(amount, currency)}
          </>
        )}
      </button>

      {method === 'card' && !processing && !error && (
        <p className="text-sm text-gray-500 text-center">
          Card payment requires provider configuration by the restaurant admin.
        </p>
      )}
    </div>
  );
}