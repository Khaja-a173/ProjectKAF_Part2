@@ .. @@
 import React, { useState, useEffect } from 'react';
+import { useRef } from 'react';
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
 import { TrendingUp, Users, ShoppingCart, DollarSign, Calendar, Clock } from 'lucide-react';
 import { whoami, getSummary, getRevenue } from '../lib/api';
+import { subscribeOrders, subscribeOrderStatusEvents, subscribePaymentIntents } from '../lib/realtime';

 interface User {
@@ .. @@
   const [revenueData, setRevenueData] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
+  const unsubscribeFunctions = useRef<(() => void)[]>([]);

   const [timeWindow, setTimeWindow] = useState<'24h' | '7d' | '30d'>('24h');
@@ .. @@
   useEffect(() => {
     loadData();
+    
+    return () => {
+      // Cleanup all subscriptions on unmount
+      unsubscribeFunctions.current.forEach(unsubscribe => {
+        try {
+          unsubscribe();
+        } catch (error) {
+          console.error('Error unsubscribing:', error);
+        }
+      });
+      unsubscribeFunctions.current = [];
+    };
   }, []);

@@ .. @@
       const userData = await whoami();
       setUser(userData);
       
+      // Start realtime listeners if we have a tenant
+      if (userData.primary_tenant_id) {
+        startRealtimeListeners(userData.primary_tenant_id);
+      }
+      
       // Load analytics data
@@ .. @@
     }
   };

+  const startRealtimeListeners = (tenantId: string) => {
+    try {
+      // Subscribe to orders for summary updates
+      const ordersUnsub = subscribeOrders({
+        tenantId,
+        onInsert: () => refetchSummary(),
+        onUpdate: () => refetchSummary()
+      });
+      unsubscribeFunctions.current.push(ordersUnsub);
+
+      // Subscribe to order status events for summary updates
+      const statusEventsUnsub = subscribeOrderStatusEvents({
+        tenantId,
+        onInsert: () => refetchSummary()
+      });
+      unsubscribeFunctions.current.push(statusEventsUnsub);
+
+      // Subscribe to payment intents for revenue updates
+      const paymentIntentsUnsub = subscribePaymentIntents({
+        tenantId,
+        onInsert: () => refetchRevenue(),
+        onUpdate: () => refetchRevenue()
+      });
+      unsubscribeFunctions.current.push(paymentIntentsUnsub);
+    } catch (error) {
+      console.error('Error starting realtime listeners:', error);
+    }
+  };
+
+  const refetchSummary = async () => {
+    try {
+      const summaryData = await getSummary(timeWindow);
+      setSummary(summaryData);
+    } catch (error) {
+      console.error('Error refetching summary:', error);
+    }
+  };
+
+  const refetchRevenue = async () => {
+    try {
+      const revenueData = await getRevenue(timeWindow, granularity);
+      setRevenueData(revenueData);
+    } catch (error) {
+      console.error('Error refetching revenue:', error);
+    }
+  };
+
   const loadAnalytics = async () => {