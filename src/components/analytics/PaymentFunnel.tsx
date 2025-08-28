import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { getPaymentFunnel } from '../../lib/api';

interface PaymentFunnelProps {
  window: string;
  onRefresh?: () => void;
}

interface FunnelRow {
  stage: string;
  stage_order: number;
  intents: number;
  amount_total: string;
}

interface FunnelData {
  window: string;
  rows: FunnelRow[];
}

const PaymentFunnel: React.FC<PaymentFunnelProps> = ({ window, onRefresh }) => {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFunnelData();
  }, [window]);

  const loadFunnelData = async () => {
    try {
      setLoading(true);
      setError(null);
      const funnelData = await getPaymentFunnel(window);
      setData(funnelData);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment funnel');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
  };

  const formatStage = (stage: string) => {
    return stage.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'created':
        return 'bg-blue-500';
      case 'requires_action':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-indigo-500';
      case 'processing':
        return 'bg-purple-500';
      case 'succeeded':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'canceled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <CreditCard className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Payment Conversion Funnel</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <CreditCard className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Payment Conversion Funnel</h3>
        </div>
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <CreditCard className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Payment Conversion Funnel</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No payment activity in this window</p>
          <p className="text-sm mt-1">Payment intents will appear here once created</p>
        </div>
      </div>
    );
  }

  // Sort by stage_order and find max intents for bar sizing
  const sortedRows = [...data.rows].sort((a, b) => a.stage_order - b.stage_order);
  const maxIntents = Math.max(...sortedRows.map(row => row.intents));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CreditCard className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Payment Conversion Funnel</h3>
        </div>
      </div>

      <div className="space-y-4">
        {sortedRows.map((row) => {
          const barWidth = maxIntents > 0 ? (row.intents / maxIntents) * 100 : 0;
          
          return (
            <div key={row.stage} className="flex items-center space-x-4">
              {/* Stage Label */}
              <div className="w-32 text-sm font-medium text-gray-900 text-right">
                {formatStage(row.stage)}
              </div>
              
              {/* Progress Bar */}
              <div className="flex-1 relative">
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div
                    className={`h-6 rounded-full ${getStageColor(row.stage)} transition-all duration-300`}
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Metrics */}
              <div className="w-40 text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {row.intents} intents
                </div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(row.amount_total)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentFunnel;