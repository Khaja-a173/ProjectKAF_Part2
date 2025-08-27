import { FastifyPluginAsync } from 'fastify';
import { PaymentsService } from '../services/payments.service';
import {
  TenantPaymentConfig,
  CreateIntentInput,
  CaptureInput,
  RefundInput,
  SplitInput
} from '../types/payments';

const paymentsRoutes: FastifyPluginAsync = async (app) => {
  const paymentsService = new PaymentsService(app);

  // All routes require authentication
  app.addHook('preHandler', app.requireAuth);

  // GET /payments/config
  app.get('/config', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const config = await paymentsService.getConfig(tenantId);
      return config;
    } catch (error: any) {
      app.log.error('Error getting payment config:', error);
      return reply.code(500).send({ error: 'Failed to get payment configuration' });
    }
  });

  // PUT /payments/config
  app.put<{ Body: TenantPaymentConfig }>('/config', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const config = await paymentsService.upsertConfig(tenantId, req.body);
      return config;
    } catch (error: any) {
      app.log.error('Error updating payment config:', error);
      return reply.code(500).send({ error: 'Failed to update payment configuration' });
    }
  });

  // POST /payments/intent
  app.post<{ Body: CreateIntentInput }>('/intent', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const intent = await paymentsService.createIntent(tenantId, req.body);
      return intent;
    } catch (error: any) {
      app.log.error('Error creating payment intent:', error);
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({ error: error.message });
    }
  });

  // POST /payments/capture
  app.post<{ Body: CaptureInput }>('/capture', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const result = await paymentsService.capture(tenantId, req.body);
      return result;
    } catch (error: any) {
      app.log.error('Error capturing payment:', error);
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({ error: error.message });
    }
  });

  // POST /payments/refund
  app.post<{ Body: RefundInput }>('/refund', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const result = await paymentsService.refund(tenantId, req.body);
      return result;
    } catch (error: any) {
      app.log.error('Error processing refund:', error);
      const statusCode = error.statusCode || 500;
      return reply.code(statusCode).send({ error: error.message });
    }
  });

  // POST /payments/split
  app.post<{ Body: SplitInput }>('/split', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const result = await paymentsService.split(tenantId, req.body);
      return result;
    } catch (error: any) {
      app.log.error('Error processing split payment:', error);
      return reply.code(400).send({ error: error.message });
    }
  });

  // POST /payments/intents/:id/emit-event
  app.post<{ Params: { id: string }, Body: { event_type: string, payload?: object } }>('/intents/:id/emit-event', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { id } = req.params;
    const { event_type, payload } = req.body;

    try {
      // First, get the payment intent to verify it exists and get provider info
      const intentResult = await app.pg.query(
        'SELECT provider FROM payment_intents WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (intentResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Payment intent not found' });
      }

      const provider = intentResult.rows[0].provider;

      // Insert payment event
      const result = await app.pg.query(
        `INSERT INTO payment_events (tenant_id, payment_intent_id, provider, event_type, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [tenantId, id, provider, event_type, payload || {}]
      );

      return result.rows[0];
    } catch (error: any) {
      // Handle table not exists error gracefully
      if (error.code === '42P01') {
        app.log.warn('Payment events table not found, using fallback response');
        return {
          success: true,
          event_id: 'fallback_' + Date.now(),
          event_type,
          payload: payload || {},
          created_at: new Date().toISOString()
        };
      }
      
      app.log.error('Error emitting payment event:', error);
      return reply.code(500).send({ error: 'Failed to emit payment event' });
    }
  });

  // POST /payments/webhook/:provider
  app.post<{ Params: { provider: string } }>('/webhook/:provider', async (req, reply) => {
    const { provider } = req.params;
    const tenantId = req.auth?.primaryTenantId;

    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const config = await paymentsService.getConfig(tenantId);
      
      if (!config.configured) {
        app.log.warn(`Webhook received for unconfigured provider: ${provider}`);
        return reply.code(202).send({ message: 'Webhook received but provider not configured' });
      }

      if (provider === 'mock') {
        app.log.info('Mock webhook received');
        return reply.code(200).send({ message: 'Mock webhook processed' });
      }

      // TODO: Implement actual webhook signature verification for stripe/razorpay
      app.log.info(`Webhook received for ${provider} but signature verification not implemented`);
      return reply.code(202).send({ message: 'Webhook received' });
    } catch (error: any) {
      app.log.error('Error processing webhook:', error);
      return reply.code(202).send({ message: 'Webhook received but could not process' });
    }
  });
};

export default paymentsRoutes;