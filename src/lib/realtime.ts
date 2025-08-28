import { supabase } from './supabase';

// Types for realtime event callbacks
export interface RealtimeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
  errors?: any;
}

export interface OrdersSubscriptionOptions {
  tenantId: string;
  onInsert?: (event: RealtimeEvent) => void;
  onUpdate?: (event: RealtimeEvent) => void;
  onDelete?: (event: RealtimeEvent) => void;
}

export interface OrderStatusEventsSubscriptionOptions {
  tenantId: string;
  onInsert?: (event: RealtimeEvent) => void;
}

export interface PaymentIntentsSubscriptionOptions {
  tenantId: string;
  onInsert?: (event: RealtimeEvent) => void;
  onUpdate?: (event: RealtimeEvent) => void;
}

// Safe callback wrapper to prevent crashes
const safeCallback = (callback?: (event: RealtimeEvent) => void) => {
  return (payload: any) => {
    if (!callback) return;
    
    try {
      const event: RealtimeEvent = {
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
        errors: payload.errors
      };
      callback(event);
    } catch (error) {
      console.error('Realtime callback error:', error);
    }
  };
};

// Subscribe to orders table changes
export const subscribeOrders = (options: OrdersSubscriptionOptions): (() => void) => {
  const { tenantId, onInsert, onUpdate, onDelete } = options;
  
  const channel = supabase
    .channel(`orders:tenant:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      },
      safeCallback(onInsert)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      },
      safeCallback(onUpdate)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      },
      safeCallback(onDelete)
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.error('Error unsubscribing from orders:', error);
    }
  };
};

// Subscribe to order_status_events table changes
export const subscribeOrderStatusEvents = (options: OrderStatusEventsSubscriptionOptions): (() => void) => {
  const { tenantId, onInsert } = options;
  
  const channel = supabase
    .channel(`order_status_events:tenant:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_status_events',
        filter: `tenant_id=eq.${tenantId}`
      },
      safeCallback(onInsert)
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.error('Error unsubscribing from order_status_events:', error);
    }
  };
};

// Subscribe to payment_intents table changes
export const subscribePaymentIntents = (options: PaymentIntentsSubscriptionOptions): (() => void) => {
  const { tenantId, onInsert, onUpdate } = options;
  
  const channel = supabase
    .channel(`payment_intents:tenant:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_intents',
        filter: `tenant_id=eq.${tenantId}`
      },
      safeCallback(onInsert)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payment_intents',
        filter: `tenant_id=eq.${tenantId}`
      },
      safeCallback(onUpdate)
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.error('Error unsubscribing from payment_intents:', error);
    }
  };
};

// Utility function to create a debounced callback
export const createDebouncedCallback = (callback: () => void, delay: number = 300): (() => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error('Debounced callback error:', error);
      }
    }, delay);
  };
};

// Multi-subscription manager for complex components
export class RealtimeManager {
  private subscriptions: (() => void)[] = [];
  private debouncedCallbacks: Map<string, () => void> = new Map();

  // Add a subscription and track it for cleanup
  addSubscription(subscription: () => void): void {
    this.subscriptions.push(subscription);
  }

  // Create and track a debounced callback
  createDebouncedCallback(key: string, callback: () => void, delay: number = 300): () => void {
    const debouncedFn = createDebouncedCallback(callback, delay);
    this.debouncedCallbacks.set(key, debouncedFn);
    return debouncedFn;
  }

  // Get existing debounced callback
  getDebouncedCallback(key: string): (() => void) | undefined {
    return this.debouncedCallbacks.get(key);
  }

  // Clean up all subscriptions and callbacks
  cleanup(): void {
    this.subscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error during subscription cleanup:', error);
      }
    });
    this.subscriptions = [];
    this.debouncedCallbacks.clear();
  }
}