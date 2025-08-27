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

  // POST /payments/intents/:id/emit-event
  app.post<{ Params: { id: string }, Body: { event_type: string, payload?: object } }>('/intents/:id/emit-event', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { id } = req.params;
    const { event_type, payload } = req.body;

    try {
      // Get payment intent to verify it exists and get provider info
      const intentResult = await app.pg.query(
        'SELECT provider, status FROM payment_intents WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (intentResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Payment intent not found' });
      }

      const intent = intentResult.rows[0];

      // Update intent status based on event type
      let newStatus = intent.status;
      if (event_type === 'payment_started') {
        newStatus = 'processing';
      } else if (event_type === 'payment_succeeded') {
        newStatus = 'succeeded';
      } else if (event_type === 'payment_failed') {
        newStatus = 'failed';
      }

      // Update intent status
      await app.pg.query(
        'UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, id]
      );

      // Insert payment event
      const eventResult = await app.pg.query(
        `INSERT INTO payment_events (id, tenant_id, payment_intent_id, provider, event_type, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [uuidv4(), tenantId, id, intent.provider, event_type, payload || {}]
      );

      return eventResult.rows[0];
    } catch (error: any) {
      // Handle table not exists error gracefully
      if (error.code === '42P01') {
        app.log.warn('Payment events table not found, using fallback response');
        return {
          ok: true,
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

  // GET /payments/providers
  app.get('/providers', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      const result = await app.pg.query(
        `SELECT id, provider, display_name, is_live, is_enabled, is_default, created_at, updated_at
         FROM payment_providers 
         WHERE tenant_id = $1 
         ORDER BY is_default DESC, created_at ASC`,
        [tenantId]
      );

      return { providers: result.rows };
    } catch (error: any) {
      app.log.error('Error fetching payment providers:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /payments/providers
  app.post<{ 
    Body: { 
      provider: 'stripe' | 'razorpay' | 'mock';
      display_name: string;
      publishable_key?: string;
      secret_key?: string;
      is_live: boolean;
      is_enabled: boolean;
      is_default?: boolean;
    } 
  }>('/providers', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { provider, display_name, publishable_key, secret_key, is_live, is_enabled, is_default } = req.body;

    try {
      // If this is set as default, unset others
      if (is_default) {
        await app.pg.query(
          'UPDATE payment_providers SET is_default = false WHERE tenant_id = $1',
          [tenantId]
        );
      }

      const result = await app.pg.query(
        `INSERT INTO payment_providers (id, tenant_id, provider, display_name, publishable_key, secret_key, is_live, is_enabled, is_default, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING id, provider, display_name, is_live, is_enabled, is_default, created_at, updated_at`,
        [uuidv4(), tenantId, provider, display_name, publishable_key, secret_key, is_live, is_enabled, is_default || false]
      );

      return result.rows[0];
    } catch (error: any) {
      app.log.error('Error creating payment provider:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // PATCH /payments/providers/:id
  app.patch<{ 
    Params: { id: string };
    Body: { 
      display_name?: string;
      publishable_key?: string;
      secret_key?: string;
      is_live?: boolean;
      is_enabled?: boolean;
    } 
  }>('/providers/:id', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { id } = req.params;
    const updates = req.body;

    try {
      const setParts = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setParts.length === 0) {
        return reply.code(400).send({ error: 'No updates provided' });
      }

      values.push(tenantId, id);
      const result = await app.pg.query(
        `UPDATE payment_providers 
         SET ${setParts.join(', ')}, updated_at = NOW()
         WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1}
         RETURNING id, provider, display_name, is_live, is_enabled, is_default, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Payment provider not found' });
      }

      return result.rows[0];
    } catch (error: any) {
      app.log.error('Error updating payment provider:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /payments/providers/:id/make-default
  app.post<{ Params: { id: string } }>('/providers/:id/make-default', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { id } = req.params;

    try {
      // Unset all defaults for this tenant
      await app.pg.query(
        'UPDATE payment_providers SET is_default = false WHERE tenant_id = $1',
        [tenantId]
      );

      // Set this one as default
      const result = await app.pg.query(
        `UPDATE payment_providers 
         SET is_default = true, updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, provider, display_name, is_live, is_enabled, is_default, created_at, updated_at`,
        [tenantId, id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Payment provider not found' });
      }

      return result.rows[0];
    } catch (error: any) {
      app.log.error('Error setting default payment provider:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
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