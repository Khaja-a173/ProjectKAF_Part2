import { supabase } from './supabase';

export interface OrderSubscriptionCallbacks {
  tenantId: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
}

export interface OrderStatusEventSubscriptionCallbacks {
  tenantId: string;
  onInsert?: (payload: any) => void;
}

export interface PaymentIntentSubscriptionCallbacks {
  tenantId: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
}

export function subscribeOrders({ tenantId, onInsert, onUpdate }: OrderSubscriptionCallbacks) {
  const channel = supabase.channel(`orders:tenant:${tenantId}`);

  if (onInsert) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        try {
          onInsert(payload);
        } catch (error) {
          console.error('Error in orders onInsert callback:', error);
        }
      }
    );
  }

  if (onUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        try {
          onUpdate(payload);
        } catch (error) {
          console.error('Error in orders onUpdate callback:', error);
        }
      }
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeOrderStatusEvents({ tenantId, onInsert }: OrderStatusEventSubscriptionCallbacks) {
  const channel = supabase.channel(`order_status_events:tenant:${tenantId}`);

  if (onInsert) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_status_events',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        try {
          onInsert(payload);
        } catch (error) {
          console.error('Error in order_status_events onInsert callback:', error);
        }
      }
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribePaymentIntents({ tenantId, onInsert, onUpdate }: PaymentIntentSubscriptionCallbacks) {
  const channel = supabase.channel(`payment_intents:tenant:${tenantId}`);

  if (onInsert) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_intents',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        try {
          onInsert(payload);
        } catch (error) {
          console.error('Error in payment_intents onInsert callback:', error);
        }
      }
    );
  }

  if (onUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payment_intents',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        try {
          onUpdate(payload);
        } catch (error) {
          console.error('Error in payment_intents onUpdate callback:', error);
        }
      }
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}