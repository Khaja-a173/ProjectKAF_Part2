@@ .. @@
 import React, { useState, useEffect } from 'react';
+import { useRef } from 'react';
 import { Search, Filter, Calendar, Clock, DollarSign, User } from 'lucide-react';
 import { whoami, getOrders } from '../lib/api';
+import { subscribeOrders, subscribeOrderStatusEvents } from '../lib/realtime';

 interface Order {
@@ .. @@
   const [orders, setOrders] = useState<Order[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
+  const unsubscribeFunctions = useRef<(() => void)[]>([]);
+  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

   const [filters, setFilters] = useState({
@@ .. @@
   useEffect(() => {
     loadOrders();
+    
+    return () => {
+      // Cleanup subscriptions and timeouts
+      unsubscribeFunctions.current.forEach(unsubscribe => {
+        try {
+          unsubscribe();
+        } catch (error) {
+          console.error('Error unsubscribing:', error);
+        }
+      });
+      unsubscribeFunctions.current = [];
+      
+      if (refetchTimeoutRef.current) {
+        clearTimeout(refetchTimeoutRef.current);
+      }
+    };
   }, []);

@@ .. @@
       const userData = await whoami();
       if (!userData.authenticated) {
         setError('Authentication required');
         return;
       }

+      // Start realtime listeners
+      if (userData.primary_tenant_id) {
+        startRealtimeListeners(userData.primary_tenant_id);
+      }
+
       const ordersData = await getOrders();
@@ .. @@
     }
   };

+  const startRealtimeListeners = (tenantId: string) => {
+    try {
+      // Subscribe to orders for real-time updates
+      const ordersUnsub = subscribeOrders({
+        tenantId,
+        onInsert: () => debouncedRefetch(),
+        onUpdate: () => debouncedRefetch()
+      });
+      unsubscribeFunctions.current.push(ordersUnsub);
+
+      // Subscribe to order status events
+      const statusEventsUnsub = subscribeOrderStatusEvents({
+        tenantId,
+        onInsert: () => debouncedRefetch()
+      });
+      unsubscribeFunctions.current.push(statusEventsUnsub);
+    } catch (error) {
+      console.error('Error starting Orders realtime listeners:', error);
+    }
+  };
+
+  const debouncedRefetch = () => {
+    // Debounce refetch to avoid too many API calls
+    if (refetchTimeoutRef.current) {
+      clearTimeout(refetchTimeoutRef.current);
+    }
+    
+    refetchTimeoutRef.current = setTimeout(() => {
+      loadOrders();
+    }, 300);
+  };
+
   const formatCurrency = (amount: number) => {