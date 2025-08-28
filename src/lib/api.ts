@@ .. @@
  return response.json();
};
// QR and Menu API functions
export const getQRContext = async (tenantCode: string, tableNumber: string) => {
  const response = await fetch(`${API_BASE_URL}/qr/${tenantCode}/${tableNumber}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get QR context');
  }

  return response.json();
};

export const getPublicMenu = async (tenantCode: string) => {
  const response = await fetch(`${API_BASE_URL}/menu/public?tenantCode=${tenantCode}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get menu');
  }

  return response.json();
};

// Cart API functions
export const createCart = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to create cart');
  }

  return response.json();
};

export const getCart = async (cartId: string) => {
  const response = await fetch(`${API_BASE_URL}/cart/${cartId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get cart');
  }

  return response.json();
};

// Checkout API functions
export const createCheckoutIntent = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/checkout/create-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to create checkout intent');
  }

  return response.json();
};

export const confirmCheckout = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/checkout/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to confirm checkout');
  }

  return response.json();
};

export const cancelCheckout = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/checkout/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to cancel checkout');
  }

  return response.json();
};

// KDS API functions
export const getKDSLanes = async () => {
  const response = await fetch(`${API_BASE_URL}/kds/lanes`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get KDS lanes');
  }

  return response.json();
};

export const advanceKDSOrder = async (orderId: string, toStatus: string) => {
  const response = await fetch(`${API_BASE_URL}/kds/orders/${orderId}/advance`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to_status: toStatus }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to advance order');
  }

  return response.json();
};

// Order status API functions
export const emitOrderStatus = async (orderId: string, toStatus: string, note?: string) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/emit-status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to_status: toStatus, note }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to emit order status');
  }

  return response.json();
};

// Payment provider API functions
export const getPaymentProviders = async () => {
  const response = await fetch(`${API_BASE_URL}/payments/providers`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get payment providers');
  }

  return response.json();
};

export const createPaymentProvider = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/providers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to create payment provider');
  }

  return response.json();
};

export const updatePaymentProvider = async (providerId: string, payload: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/providers/${providerId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to update payment provider');
  }

  return response.json();
};

export const makeDefaultPaymentProvider = async (providerId: string) => {
  const response = await fetch(`${API_BASE_URL}/payments/providers/${providerId}/make-default`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to make default payment provider');
  }

  return response.json();
};

export const emitPaymentEvent = async (intentId: string, eventType: string, payload?: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/intents/${intentId}/emit-event`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: eventType, payload }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to emit payment event');
  }

  return response.json();
};

// Payment API functions
export const getPaymentConfig = async () => {
  const response = await fetch(`${API_BASE_URL}/payments/config`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to get payment configuration');
  }

  return response.json();
};

export const updatePaymentConfig = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/config`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to update payment configuration');
  }

  return response.json();
};

export const createPaymentIntent = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/intent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to create payment intent');
  }

  return response.json();
};

export const capturePayment = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to capture payment');
  }

  return response.json();
};

export const refundPayment = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to process refund');
  }

  return response.json();
};

export const splitPayment = async (payload: any) => {
  const response = await fetch(`${API_BASE_URL}/payments/split`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to process split payment');
  }

  return response.json();
};

// Receipt API functions
export const sendReceipt = async (orderId: string, email?: string, phone?: string) => {
  const response = await fetch(`${API_BASE_URL}/receipts/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ order_id: orderId, email, phone }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to send receipt');
  }

  return response.json();
};

export const printReceipt = async (orderId: string, printerId?: string) => {
  const response = await fetch(`${API_BASE_URL}/receipts/print`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ order_id: orderId, printer_id: printerId }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to print receipt');
  }

  return response.json();
};

export default {