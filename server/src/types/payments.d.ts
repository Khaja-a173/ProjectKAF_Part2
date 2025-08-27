export type PaymentProvider = 'stripe' | 'razorpay' | 'mock';

export interface TenantPaymentConfig {
  provider: PaymentProvider;
  live_mode: boolean;
  currency: string;
  enabled_methods: string[];
  publishable_key?: string;
  secret_key?: string;
}

export interface CreateIntentInput {
  amount: number;
  currency: string;
  order_id?: string;
  method?: string;
  metadata?: Record<string, any>;
}

export interface CaptureInput {
  intent_id: string;
  provider: PaymentProvider;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface RefundInput {
  payment_id: string;
  amount: number;
  provider: PaymentProvider;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface SplitInput {
  total: number;
  currency: string;
  splits: Array<{
    amount: number;
    payer_type: string;
    note?: string;
  }>;
}

export interface PaymentConfigResponse {
  configured: boolean;
  provider?: PaymentProvider;
  live_mode?: boolean;
  currency?: string;
  enabled_methods?: string[];
  publishable_key?: string;
  // secret_key is never returned
}

export interface PaymentIntentResponse {
  client_secret?: string;
  provider: PaymentProvider;
  status: string;
  intent_id?: string;
  amount?: number;
  currency?: string;
}