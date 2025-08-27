@@ .. @@
 import React, { useState, useEffect } from 'react';
+import { useRef } from 'react';
 import { Clock, ChefHat, CheckCircle, AlertCircle } from 'lucide-react';
 import { whoami, getKDSOrders } from '../lib/api';
+import { subscribeOrderStatusEvents } from '../lib/realtime';

 interface KDSOrder {
@@ .. @@
   const [orders, setOrders] = useState<KDSOrder[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
+  const unsubscribeFunctions = useRef<(() => void)[]>([]);
+  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
       const kdsData = await getKDSOrders();
@@ .. @@
     }
   };

+  const startRealtimeListeners = (tenantId: string) => {
+    try {
+      // Subscribe to order status events to update lanes in real-time
+      const statusEventsUnsub = subscribeOrderStatusEvents({
+        tenantId,
+        onInsert: (event) => {
+          if (event.new?.order_id) {
+            invalidateLaneFor(event.new.order_id);
+          }
+        }
+      });
+      unsubscribeFunctions.current.push(statusEventsUnsub);
+    } catch (error) {
+      console.error('Error starting KDS realtime listeners:', error);
+    }
+  };
+
+  const invalidateLaneFor = (orderId: string) => {
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
   const getStatusColor = (status: string) => {