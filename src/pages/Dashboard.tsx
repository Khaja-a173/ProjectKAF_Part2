import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign, Calendar, Clock } from 'lucide-react';
import { whoami, getSummary, getRevenue, getFulfillmentTimeline, getTopItems } from '../lib/api';
import { subscribeOrders, subscribeOrderStatusEvents, subscribePaymentIntents, RealtimeManager } from '../lib/realtime';
import PaymentFunnel from '../components/analytics/PaymentFunnel';
import PeakHours from '../components/analytics/PeakHours';
import RevenueSeries from '../components/analytics/RevenueSeries';

interface User {
  id: string;
  email: string;
  primary_tenant_id: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [fulfillmentData, setFulfillmentData] = useState<any[]>([]);
  const [topItemsData, setTopItemsData] = useState<any[]>([]);
  const [funnelRefreshTrigger, setFunnelRefreshTrigger] = useState(0);
  const [peakHoursRefreshTrigger, setPeakHoursRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueSeriesRefreshTrigger, setRevenueSeriesRefreshTrigger] = useState(0);
  const [realtimeManager] = useState(() => new RealtimeManager());

  const [timeWindow, setTimeWindow] = useState<'24h' | '7d' | '30d'>('24h');
  const [granularity, setGranularity] = useState<'hour' | 'day'>('hour');

  useEffect(() => {
    loadData();
    
    return () => {
      realtimeManager.cleanup();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userData = await whoami();
      setUser(userData);
      
      // Start realtime listeners if we have a tenant
      if (userData.primary_tenant_id) {
        startRealtimeListeners(userData.primary_tenant_id);
      }
      
      // Load analytics data
      await loadAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startRealtimeListeners = (tenantId: string) => {
    try {
      // Create debounced callbacks
      const debouncedSummaryRefresh = realtimeManager.createDebouncedCallback('summary', () => refetchSummary(), 300);
      const debouncedRevenueRefresh = realtimeManager.createDebouncedCallback('revenue', () => refetchRevenue(), 300);
      const debouncedFulfillmentRefresh = realtimeManager.createDebouncedCallback('fulfillment', () => refetchFulfillment(), 300);
      const debouncedTopItemsRefresh = realtimeManager.createDebouncedCallback('topitems', () => refetchTopItems(), 300);

      // Subscribe to orders for summary updates
      const ordersUnsub = subscribeOrders({
        tenantId,
        onInsert: () => {
          debouncedSummaryRefresh();
          debouncedTopItemsRefresh();
        },
        onUpdate: () => {
          debouncedSummaryRefresh();
          debouncedTopItemsRefresh();
        }
      });
      realtimeManager.addSubscription(ordersUnsub);

      // Subscribe to order status events for summary updates
      const statusEventsUnsub = subscribeOrderStatusEvents({
        tenantId,
        onInsert: () => {
          debouncedSummaryRefresh();
          debouncedFulfillmentRefresh();
          triggerPeakHoursRefresh();
        }
      });
      realtimeManager.addSubscription(statusEventsUnsub);

      // Subscribe to payment intents for revenue updates
      const paymentIntentsUnsub = subscribePaymentIntents({
        tenantId,
        onInsert: () => {
          debouncedRevenueRefresh();
          triggerFunnelRefresh();
          triggerRevenueSeriesRefresh();
        },
        onUpdate: () => {
          debouncedRevenueRefresh();
          triggerFunnelRefresh();
          triggerPeakHoursRefresh();
          triggerRevenueSeriesRefresh();
        }
      });
      realtimeManager.addSubscription(paymentIntentsUnsub);
    } catch (error) {
      console.error('Error starting realtime listeners:', error);
    }
  };

  const refetchSummary = async () => {
    try {
      const summaryData = await getSummary(timeWindow);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error refetching summary:', error);
    }
  };

  const refetchRevenue = async () => {
    try {
      const revenueData = await getRevenue(timeWindow, granularity);
      setRevenueData(revenueData);
    } catch (error) {
      console.error('Error refetching revenue:', error);
    }
  };

  const refetchFulfillment = async () => {
    try {
      const fulfillmentData = await getFulfillmentTimeline(timeWindow);
      setFulfillmentData(fulfillmentData.rows || []);
    } catch (error) {
      console.error('Error refetching fulfillment:', error);
    }
  };

  const refetchTopItems = async () => {
    try {
      const topItemsData = await getTopItems(timeWindow);
      setTopItemsData(topItemsData.items || []);
    } catch (error) {
      console.error('Error refetching top items:', error);
    }
  };

  const triggerFunnelRefresh = () => {
    setFunnelRefreshTrigger(prev => prev + 1);
  };

  const triggerPeakHoursRefresh = () => {
    setPeakHoursRefreshTrigger(prev => prev + 1);
  };

  const triggerRevenueSeriesRefresh = () => {
    setRevenueSeriesRefreshTrigger(prev => prev + 1);
  };

  const loadAnalytics = async () => {
    const [summaryData, revenueData, fulfillmentData, topItemsData] = await Promise.all([
      getSummary(timeWindow),
      getRevenue(timeWindow, granularity),
      getFulfillmentTimeline(timeWindow),
      getTopItems(timeWindow)
    ]);
    
    setSummary(summaryData);
    setRevenueData(revenueData);
    setFulfillmentData(fulfillmentData.rows || []);
    setTopItemsData(topItemsData.items || []);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-2">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary?.total_revenue?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.total_orders || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.active_customers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary?.avg_order_value?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <RevenueSeries 
        window={timeWindow} 
        key={`${timeWindow}-${revenueSeriesRefreshTrigger}`}
      />

      {/* Legacy Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Revenue Over Time</h2>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as 'hour' | 'day')}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
          </select>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Fulfillment Timeline */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Order Fulfillment Timeline</h2>
        </div>
        <div className="overflow-x-auto">
          {fulfillmentData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transitions yet</p>
              <p className="text-sm mt-1">Order status changes will appear here</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From → To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transitions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fulfillmentData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="capitalize">{row.from_status}</span> → <span className="capitalize">{row.to_status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(row.avg_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.transitions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Funnel */}
      <PaymentFunnel 
        window={timeWindow} 
        key={`${timeWindow}-${funnelRefreshTrigger}`}
      />

      {/* Peak Hours */}
      <PeakHours 
        window={timeWindow} 
        key={`${timeWindow}-${peakHoursRefreshTrigger}`}
      />

      {/* Top Selling Items */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Top Selling Items</h2>
        </div>
        <div className="overflow-x-auto">
          {topItemsData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items sold yet</p>
              <p className="text-sm mt-1">Item sales will appear here</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topItemsData.slice(0, 10).map((item, index) => (
                  <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 mr-2 text-xs font-bold text-white bg-yellow-500 rounded-full">
                            {index + 1}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity_sold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(item.total_revenue || '0').toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(item.avg_price || '0').toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;