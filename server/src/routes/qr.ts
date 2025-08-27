import { FastifyPluginAsync } from 'fastify';

const qrRoutes: FastifyPluginAsync = async (app) => {
  // GET /qr/:tenantCode/:tableNumber (public)
  app.get<{ Params: { tenantCode: string; tableNumber: string } }>('/:tenantCode/:tableNumber', async (req, reply) => {
    const { tenantCode, tableNumber } = req.params;

    try {
      // Find tenant by code
      const tenantResult = await app.pg.query(
        'SELECT id, name, code, branding FROM tenants WHERE code = $1 AND is_active = true',
        [tenantCode]
      );

      if (tenantResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      const tenant = tenantResult.rows[0];

      // Find table
      const tableResult = await app.pg.query(
        'SELECT id, table_number, section, capacity FROM tables WHERE tenant_id = $1 AND table_number = $2',
        [tenant.id, tableNumber]
      );

      if (tableResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Table not found' });
      }

      const table = tableResult.rows[0];

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          branding: tenant.branding || {}
        },
        table: {
          id: table.id,
          number: table.table_number,
          section: table.section,
          capacity: table.capacity
        }
      };
    } catch (error: any) {
      app.log.error('Error fetching QR context:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

export default qrRoutes;