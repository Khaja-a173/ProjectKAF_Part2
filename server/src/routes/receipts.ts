import { FastifyPluginAsync } from 'fastify';

const receiptsRoutes: FastifyPluginAsync = async (app) => {
  // All routes require authentication
  app.addHook('preHandler', app.requireAuth);

  // POST /receipts/send - Send receipt via email/SMS
  app.post<{ Body: { order_id: string; email?: string; phone?: string } }>('/send', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { order_id, email, phone } = req.body;

    if (!order_id) {
      return reply.code(400).send({ error: 'order_id is required' });
    }

    try {
      // Verify order exists and belongs to tenant
      const orderResult = await app.pg.query(
        'SELECT id FROM orders WHERE id = $1 AND tenant_id = $2',
        [order_id, tenantId]
      );

      if (orderResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Log the receipt send attempt
      app.log.info('Receipt send requested', {
        order_id,
        tenant_id: tenantId,
        email: email ? '***@***.***' : undefined,
        phone: phone ? '***-***-****' : undefined
      });

      // TODO: Implement actual email/SMS sending
      // For now, just return accepted status
      return reply.code(202).send({
        accepted: true,
        message: 'Receipt send request accepted',
        order_id,
        delivery_methods: {
          email: !!email,
          sms: !!phone
        }
      });
    } catch (error: any) {
      app.log.error('Error sending receipt:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Failed to send receipt' });
    }
  });

  // POST /receipts/invoice/:orderId - Generate PDF invoice
  app.post<{ Params: { orderId: string } }>('/invoice/:orderId', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { orderId } = req.params;

    try {
      // Verify order exists and belongs to tenant
      const orderResult = await app.pg.query(
        'SELECT id FROM orders WHERE id = $1 AND tenant_id = $2',
        [orderId, tenantId]
      );

      if (orderResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Log the PDF generation request
      app.log.info('PDF invoice generation requested', {
        order_id: orderId,
        tenant_id: tenantId
      });

      // TODO: Implement actual PDF generation
      // For now, return a mock PDF response
      const mockPDF = Buffer.from('Mock PDF content for order ' + orderId);
      
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);
      return reply.send(mockPDF);
    } catch (error: any) {
      app.log.error('Error generating PDF invoice:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Failed to generate PDF invoice' });
    }
  });

  // POST /receipts/print - Print receipt to thermal printer
  app.post<{ Body: { order_id: string; printer_id?: string } }>('/print', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { order_id, printer_id } = req.body;

    if (!order_id) {
      return reply.code(400).send({ error: 'order_id is required' });
    }

    try {
      // Verify order exists and belongs to tenant
      const orderResult = await app.pg.query(
        'SELECT id FROM orders WHERE id = $1 AND tenant_id = $2',
        [order_id, tenantId]
      );

      if (orderResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      // Log the print request
      app.log.info('Receipt print requested', {
        order_id,
        tenant_id: tenantId,
        printer_id: printer_id || 'default'
      });

      // TODO: Implement actual thermal printer integration
      // For now, just return accepted status
      return reply.code(202).send({
        accepted: true,
        message: 'Receipt print request accepted',
        order_id,
        printer_id: printer_id || 'default'
      });
    } catch (error: any) {
      app.log.error('Error printing receipt:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Failed to print receipt' });
    }
  });
};

export default receiptsRoutes;