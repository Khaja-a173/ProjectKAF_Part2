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