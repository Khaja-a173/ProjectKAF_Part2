import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { getPeakHours } from '../../lib/api';

interface PeakHoursProps {
  window: string;
  onRefresh?: () => void;
}

interface PeakHourRow {
  weekday: number;
  hour24: number;
  orders_count: number;
  revenue_total: string;
}

interface PeakHoursData {
  window: string;
  rows: PeakHourRow[];
}

const PeakHours: React.FC<PeakHoursProps> = ({ window, onRefresh }) => {
  const [data, setData] = useState<PeakHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPeakHours();
  }, [window]);

  const loadPeakHours = async () => {
    try {
      setLoading(true);
      setError(null);
      const peakHoursData = await getPeakHours(window);
      setData(peakHoursData);
    } catch (err: any) {
      setError(err.message || 'Failed to load peak hours');
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

  const formatWeekday = (weekday: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[weekday] || 'Unknown';
  };

  const formatHour = (hour24: number) => {
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    return `${hour12}${ampm}`;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Peak Hours</h3>
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
          <Clock className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Peak Hours</h3>
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
          <Clock className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Peak Hours</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No activity in this window</p>
          <p className="text-sm mt-1">Order activity will appear here once available</p>
        </div>
      </div>
    );
  }

  // Sort data by weekday and hour for table display
  const sortedRows = [...data.rows].sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.hour24 - b.hour24;
  });

  // Get top 10 busiest periods for compact display
  const topPeriods = sortedRows
    .filter(row => row.orders_count > 0)
    .sort((a, b) => b.orders_count - a.orders_count)
    .slice(0, 10);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Clock className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Peak Hours</h3>
        </div>
      </div>

      {topPeriods.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topPeriods.map((row, index) => (
                <tr key={`${row.weekday}-${row.hour24}`} className={index < 3 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatWeekday(row.weekday)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatHour(row.hour24)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {row.orders_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.revenue_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {topPeriods.length === 10 && sortedRows.filter(r => r.orders_count > 0).length > 10 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Showing top 10 busiest periods
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No activity in this window</p>
        </div>
      )}
    </div>
  );
};

export default PeakHours;