import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentProvider,
  TenantPaymentConfig,
  CreateIntentInput,
  CaptureInput,
  RefundInput,
  SplitInput,
  PaymentConfigResponse,
  PaymentIntentResponse
} from '../types/payments';

// In-memory fallback for when DB tables don't exist yet
const configFallback = new Map<string, TenantPaymentConfig>();

export class PaymentsService {
  constructor(private app: FastifyInstance) {}

  async getConfig(tenantId: string): Promise<PaymentConfigResponse> {
    try {
      const result = await this.app.pg.query(
        'SELECT provider, live_mode, currency, enabled_methods, publishable_key FROM payment_providers WHERE tenant_id = $1',
        [tenantId]
      );

      if (result.rows.length === 0) {
        // Check in-memory fallback
        const fallbackConfig = configFallback.get(tenantId);
        if (fallbackConfig) {
          return {
            configured: true,
            provider: fallbackConfig.provider,
            live_mode: fallbackConfig.live_mode,
            currency: fallbackConfig.currency,
            enabled_methods: fallbackConfig.enabled_methods,
            publishable_key: fallbackConfig.publishable_key
          };
        }
        return { configured: false };
      }

      const row = result.rows[0];
      return {
        configured: true,
        provider: row.provider,
        live_mode: row.live_mode,
        currency: row.currency,
        enabled_methods: row.enabled_methods,
        publishable_key: row.publishable_key
      };
    } catch (error: any) {
      // Handle table not exists error (42P01)
      if (error.code === '42P01') {
        this.app.log.warn('Payment tables not found, using fallback');
        const fallbackConfig = configFallback.get(tenantId);
        if (fallbackConfig) {
          return {
            configured: true,
            provider: fallbackConfig.provider,
            live_mode: fallbackConfig.live_mode,
            currency: fallbackConfig.currency,
            enabled_methods: fallbackConfig.enabled_methods,
            publishable_key: fallbackConfig.publishable_key
          };
        }
        return { configured: false };
      }
      throw error;
    }
  }

  async upsertConfig(tenantId: string, payload: TenantPaymentConfig): Promise<PaymentConfigResponse> {
    try {
      const result = await this.app.pg.query(
        `INSERT INTO payment_providers (tenant_id, provider, live_mode, currency, enabled_methods, publishable_key, secret_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (tenant_id) 
         DO UPDATE SET 
           provider = $2,
           live_mode = $3,
           currency = $4,
           enabled_methods = $5,
           publishable_key = $6,
           secret_key = $7,
           updated_at = NOW()
         RETURNING provider, live_mode, currency, enabled_methods, publishable_key`,
        [
          tenantId,
          payload.provider,
          payload.live_mode,
          payload.currency,
          payload.enabled_methods,
          payload.publishable_key,
          payload.secret_key
        ]
      );

      const row = result.rows[0];
      return {
        configured: true,
        provider: row.provider,
        live_mode: row.live_mode,
        currency: row.currency,
        enabled_methods: row.enabled_methods,
        publishable_key: row.publishable_key
      };
    } catch (error: any) {
      // Handle table not exists error (42P01)
      if (error.code === '42P01') {
        this.app.log.warn('Payment tables not found, using in-memory fallback');
        configFallback.set(tenantId, payload);
        return {
          configured: true,
          provider: payload.provider,
          live_mode: payload.live_mode,
          currency: payload.currency,
          enabled_methods: payload.enabled_methods,
          publishable_key: payload.publishable_key
        };
      }
      throw error;
    }
  }

  async createIntent(tenantId: string, body: CreateIntentInput): Promise<PaymentIntentResponse> {
    const config = await this.getConfig(tenantId);
    
    if (!config.configured) {
      throw new Error('Payment provider not configured');
    }

    if (config.provider === 'mock') {
      return {
        client_secret: 'mock_' + uuidv4(),
        provider: 'mock',
        status: 'requires_capture',
        intent_id: 'mock_intent_' + uuidv4(),
        amount: body.amount,
        currency: body.currency
      };
    }

    // For stripe/razorpay, check if we have keys
    if (!config.publishable_key) {
      const error = new Error(`${config.provider} provider not configured yet - missing API keys`);
      (error as any).statusCode = 501;
      throw error;
    }

    // TODO: Implement actual Stripe/Razorpay SDK integration
    const error = new Error(`${config.provider} integration not implemented yet`);
    (error as any).statusCode = 501;
    throw error;
  }

  async capture(tenantId: string, body: CaptureInput): Promise<any> {
    const config = await this.getConfig(tenantId);
    
    if (!config.configured) {
      throw new Error('Payment provider not configured');
    }

    if (config.provider === 'mock') {
      return {
        success: true,
        payment_id: 'mock_payment_' + uuidv4(),
        status: 'succeeded',
        amount: body.amount || 0,
        captured_at: new Date().toISOString()
      };
    }

    // For stripe/razorpay, check if configured
    if (!config.publishable_key) {
      const error = new Error(`${config.provider} provider not configured yet`);
      (error as any).statusCode = 501;
      throw error;
    }

    // TODO: Implement actual provider capture
    const error = new Error(`${config.provider} capture not implemented yet`);
    (error as any).statusCode = 501;
    throw error;
  }

  async refund(tenantId: string, body: RefundInput): Promise<any> {
    const config = await this.getConfig(tenantId);
    
    if (!config.configured) {
      throw new Error('Payment provider not configured');
    }

    if (config.provider === 'mock') {
      return {
        success: true,
        refund_id: 'mock_refund_' + uuidv4(),
        status: 'succeeded',
        amount: body.amount,
        reason: body.reason || 'requested_by_customer',
        refunded_at: new Date().toISOString()
      };
    }

    // For stripe/razorpay, check if configured
    if (!config.publishable_key) {
      const error = new Error(`${config.provider} provider not configured yet`);
      (error as any).statusCode = 501;
      throw error;
    }

    // TODO: Implement actual provider refund
    const error = new Error(`${config.provider} refund not implemented yet`);
    (error as any).statusCode = 501;
    throw error;
  }

  async split(tenantId: string, body: SplitInput): Promise<any> {
    // Validate that splits add up to total
    const splitTotal = body.splits.reduce((sum, split) => sum + split.amount, 0);
    const tolerance = 0.01; // Allow 1 cent tolerance for rounding
    
    if (Math.abs(splitTotal - body.total) > tolerance) {
      throw new Error(`Split amounts (${splitTotal}) do not match total (${body.total})`);
    }

    // Return normalized splits
    return {
      success: true,
      split_id: 'split_' + uuidv4(),
      total: body.total,
      currency: body.currency,
      splits: body.splits.map((split, index) => ({
        ...split,
        split_item_id: `split_item_${index + 1}_${uuidv4()}`
      })),
      created_at: new Date().toISOString()
    };
  }
}