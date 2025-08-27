@@ .. @@
   return response.json();
 };
 
+// Payment API functions
+export const getPaymentConfig = async () => {
+  const response = await fetch(`${API_BASE_URL}/payments/config`, {
+    headers: {
+      'Authorization': `Bearer ${getToken()}`,
+      'Content-Type': 'application/json',
+    },
+  });
+
+  if (!response.ok) {
+    if (response.status === 401 || response.status === 403) {
+      throw new Error('Authentication required');
+    }
+    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
+    throw new Error(error.error || 'Failed to get payment configuration');
+  }
+
+  return response.json();
+};
+
+export const updatePaymentConfig = async (payload: any) => {
+  const response = await fetch(`${API_BASE_URL}/payments/config`, {
+    method: 'PUT',
+    headers: {
+      'Authorization': `Bearer ${getToken()}`,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify(payload),
+  });
+
+  if (!response.ok) {
+    if (response.status === 401 || response.status === 403) {
+      throw new Error('Authentication required');
+    }
+    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
+    throw new Error(error.error || 'Failed to update payment configuration');
+  }
+
+  return response.json();
+};
+
+export const createPaymentIntent = async (payload: any) => {
+  const response = await fetch(`${API_BASE_URL}/payments/intent`, {
+    method: 'POST',
+    headers: {
+      'Authorization': `Bearer ${getToken()}`,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify(payload),
+  });
+
+  if (!response.ok) {
+    if (response.status === 401 || response.status === 403) {
+      throw new Error('Authentication required');
+    }
+    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
+    throw new Error(error.error || 'Failed to create payment intent');
+  }
+
+  return response.json();
+};
+
+export const capturePayment = async (payload: any) => {
+  const response = await fetch(`${API_BASE_URL}/payments/capture`, {
+    method: 'POST',
+    headers: {
+      'Authorization': `Bearer ${getToken()}`,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify(payload),
+  });
+
+  if (!response.ok) {
+    if (response.status === 401 || response.status === 403) {
+      throw new Error('Authentication required');
+    }
+    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
+    throw new Error(error.error || 'Failed to capture payment');
+  }
+
+  return response.json();
+};
+
+export const refundPayment = async (payload: any) => {
+  const response = await fetch(`${API_BASE_URL}/payments/refund`, {
+    method: 'POST',
+    headers: {
+      'Authorization': `Bearer ${getToken()}`,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify(payload),
+  });
+
+  if (!response.ok) {
+    if (response.status === 401 || response.status === 403) {
+      throw new Error('Authentication required');
+    }
+    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
+    throw new Error(error.error || 'Failed to process refund');
+  }
+
+  return response.json();
+};
+
+export const splitPayment = async (payload: any) => {
+  const response = await fetch(`${API_BASE_URL}/payments/split`, {
+    method: 'POST',
+    headers: {
+      'Authorization': `Bearer ${getToken()}`,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify(payload),
+  });
+
+  if (!response.ok) {
+    if (response.status === 401 || response.status === 403) {
+      throw new Error('Authentication required');
+    }
+    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
+    throw new Error(error.error || 'Failed to process split payment');
+  }
+
+  return response.json();
+};
+
 export default {