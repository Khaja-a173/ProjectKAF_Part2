import React, { useState, useEffect } from 'react';
import { getPaymentConfig, updatePaymentConfig } from '../lib/api';
import { CreditCard, Settings, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface PaymentConfig {
  configured: boolean;
  provider?: 'stripe' | 'razorpay' | 'mock';
  live_mode?: boolean;
  currency?: string;
  enabled_methods?: string[];
  publishable_key?: string;
}

const AVAILABLE_METHODS = [
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'wallet', label: 'Digital Wallet' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' }
];

export default function AdminPayments() {
  const [config, setConfig] = useState<PaymentConfig>({ configured: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [formData, setFormData] = useState({
    provider: 'mock' as 'stripe' | 'razorpay' | 'mock',
    live_mode: false,
    currency: 'USD',
    enabled_methods: ['cash'],
    publishable_key: '',
    secret_key: ''
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPaymentConfig();
      setConfig(data);
      
      if (data.configured) {
        setFormData({
          provider: data.provider || 'mock',
          live_mode: data.live_mode || false,
          currency: data.currency || 'USD',
          enabled_methods: data.enabled_methods || ['cash'],
          publishable_key: data.publishable_key || '',
          secret_key: '' // Never populate secret key from API
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        ...formData,
        // Only include secret_key if it's been changed
        ...(formData.secret_key ? { secret_key: formData.secret_key } : {})
      };

      const updatedConfig = await updatePaymentConfig(payload);
      setConfig(updatedConfig);
      setSuccess('Payment configuration saved successfully!');
      
      // Clear the secret key field after saving
      setFormData(prev => ({ ...prev, secret_key: '' }));
    } catch (err: any) {
      setError(err.message || 'Failed to save payment configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleMethodToggle = (method: string) => {
    setFormData(prev => ({
      ...prev,
      enabled_methods: prev.enabled_methods.includes(method)
        ? prev.enabled_methods.filter(m => m !== method)
        : [...prev.enabled_methods, method]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <CreditCard className="h-6 w-6 text-indigo-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Configure payment providers and methods for your restaurant
            </p>
          </div>

          <div className="p-6">
            {!config.configured && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">
                      Payment System Not Configured
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Configure your payment settings below to start accepting payments.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Provider
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      provider: e.target.value as 'stripe' | 'razorpay' | 'mock' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="mock">Mock (Testing)</option>
                    <option value="stripe">Stripe</option>
                    <option value="razorpay">Razorpay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="live_mode"
                    checked={formData.live_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, live_mode: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="live_mode" className="ml-2 block text-sm text-gray-700">
                    Live Mode (uncheck for testing)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enabled Payment Methods
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_METHODS.map(method => (
                    <label key={method.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.enabled_methods.includes(method.value)}
                        onChange={() => handleMethodToggle(method.value)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.provider !== 'mock' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publishable Key
                    </label>
                    <input
                      type="text"
                      value={formData.publishable_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, publishable_key: e.target.value }))}
                      placeholder={`Enter your ${formData.provider} publishable key`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret Key
                    </label>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={formData.secret_key}
                        onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                        placeholder={config.configured ? "Leave blank to keep current key" : `Enter your ${formData.provider} secret key`}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showSecretKey ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}