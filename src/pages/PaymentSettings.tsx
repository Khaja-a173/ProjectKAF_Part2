import React, { useState, useEffect } from 'react';
import { CreditCard, Settings, AlertCircle, CheckCircle, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { getPaymentProviders, createPaymentProvider, updatePaymentProvider, makeDefaultPaymentProvider } from '../lib/api';

interface PaymentProvider {
  id: string;
  provider: 'stripe' | 'razorpay' | 'paypal' | 'mock';
  display_name: string;
  publishable_key?: string;
  secret_key_last4?: string;
  is_live: boolean;
  is_enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const PROVIDER_OPTIONS = [
  { value: 'stripe', label: 'Stripe', description: 'Global payment processing' },
  { value: 'razorpay', label: 'Razorpay', description: 'India-focused payments' },
  { value: 'paypal', label: 'PayPal', description: 'Digital wallet payments' },
  { value: 'mock', label: 'Mock (Testing)', description: 'For development only' }
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
  { value: 'INR', label: 'Indian Rupee (INR)', symbol: '₹' },
  { value: 'AED', label: 'UAE Dirham (AED)', symbol: 'د.إ' },
  { value: 'AUD', label: 'Australian Dollar (AUD)', symbol: 'A$' },
  { value: 'SAR', label: 'Saudi Riyal (SAR)', symbol: '﷼' }
];

export default function PaymentSettings() {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);

  const [formData, setFormData] = useState({
    provider: 'stripe' as 'stripe' | 'razorpay' | 'paypal' | 'mock',
    display_name: '',
    publishable_key: '',
    secret_key: '',
    webhook_url: '',
    is_live: false,
    is_enabled: true,
    is_default: false,
    currency: 'USD'
  });

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPaymentProviders();
      setProviders(data.providers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      const payload = {
        ...formData,
        display_name: formData.display_name || `${formData.provider.charAt(0).toUpperCase() + formData.provider.slice(1)} ${formData.is_live ? 'Live' : 'Test'}`
      };

      if (editingProvider) {
        await updatePaymentProvider(editingProvider.id, payload);
        setSuccess('Payment provider updated successfully!');
      } else {
        await createPaymentProvider(payload);
        setSuccess('Payment provider added successfully!');
      }

      await loadProviders();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save payment provider');
    }
  };

  const handleMakeDefault = async (providerId: string) => {
    try {
      setError(null);
      await makeDefaultPaymentProvider(providerId);
      setSuccess('Default payment provider updated!');
      await loadProviders();
    } catch (err: any) {
      setError(err.message || 'Failed to update default provider');
    }
  };

  const handleEdit = (provider: PaymentProvider) => {
    setEditingProvider(provider);
    setFormData({
      provider: provider.provider,
      display_name: provider.display_name,
      publishable_key: provider.publishable_key || '',
      secret_key: '', // Never populate secret key
      webhook_url: '',
      is_live: provider.is_live,
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      currency: 'USD' // Default, could be stored per provider
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      provider: 'stripe',
      display_name: '',
      publishable_key: '',
      secret_key: '',
      webhook_url: '',
      is_live: false,
      is_enabled: true,
      is_default: false,
      currency: 'USD'
    });
    setEditingProvider(null);
    setShowAddForm(false);
  };

  const toggleSecretVisibility = (providerId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
                  <p className="mt-1 text-gray-600">
                    Configure payment providers and processing options
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </button>
            </div>
          </div>

          <div className="p-6">
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

            {/* Add/Edit Form */}
            {showAddForm && (
              <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingProvider ? 'Edit Payment Provider' : 'Add Payment Provider'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provider Type
                      </label>
                      <select
                        value={formData.provider}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          provider: e.target.value as any 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={!!editingProvider}
                      >
                        {PROVIDER_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label} - {option.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="e.g., Stripe Live, Razorpay Test"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
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

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_live}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_live: e.target.checked }))}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Live Mode</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_enabled}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_enabled: e.target.checked }))}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enabled</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_default}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Default</span>
                      </label>
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
                        <input
                          type="password"
                          value={formData.secret_key}
                          onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                          placeholder={editingProvider ? "Leave blank to keep current key" : `Enter your ${formData.provider} secret key`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          value={formData.webhook_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                          placeholder="https://your-domain.com/webhooks/payments"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {editingProvider ? 'Update Provider' : 'Add Provider'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Providers List */}
            <div className="space-y-4">
              {providers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No payment providers configured</p>
                  <p className="mt-1">Add a payment provider to start accepting payments</p>
                </div>
              ) : (
                providers.map((provider) => (
                  <div
                    key={provider.id}
                    className={`border rounded-lg p-4 ${
                      provider.is_default ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          provider.is_enabled ? 'bg-green-400' : 'bg-gray-400'
                        }`} />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {provider.display_name}
                            {provider.is_default && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                Default
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1)} • 
                            {provider.is_live ? ' Live Mode' : ' Test Mode'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!provider.is_default && (
                          <button
                            onClick={() => handleMakeDefault(provider.id)}
                            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            Make Default
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(provider)}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {provider.publishable_key && (
                      <div className="mt-3 text-sm text-gray-600">
                        <p>Publishable Key: {provider.publishable_key.slice(0, 12)}...</p>
                        {provider.secret_key_last4 && (
                          <p>Secret Key: ****{provider.secret_key_last4}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}