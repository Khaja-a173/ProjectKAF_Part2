import { FastifyPluginAsync } from 'fastify';

const menuRoutes: FastifyPluginAsync = async (app) => {
  // GET /menu/public?tenantCode=XYZ
  app.get<{ Querystring: { tenantCode: string } }>('/public', async (req, reply) => {
    const { tenantCode } = req.query;

    if (!tenantCode) {
      return reply.code(400).send({ error: 'tenantCode is required' });
    }

    try {
      // Find tenant by code
      const tenantResult = await app.pg.query(
        'SELECT id FROM tenants WHERE code = $1 AND is_active = true',
        [tenantCode]
      );

      if (tenantResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      const tenantId = tenantResult.rows[0].id;

      // Get categories
      const categoriesResult = await app.pg.query(
        'SELECT id, name, description, sort_order FROM menu_categories WHERE tenant_id = $1 AND is_active = true ORDER BY sort_order, name',
        [tenantId]
      );

      // Get menu items
      const itemsResult = await app.pg.query(
        `SELECT mi.id, mi.name, mi.description, mi.price, mi.category_id, mi.is_available, mi.image_url,
                mc.name as category_name
         FROM menu_items mi
         JOIN menu_categories mc ON mi.category_id = mc.id
         WHERE mi.tenant_id = $1 AND mi.is_active = true
         ORDER BY mc.sort_order, mi.sort_order, mi.name`,
        [tenantId]
      );

      return {
        categories: categoriesResult.rows,
        items: itemsResult.rows
      };
    } catch (error: any) {
      app.log.error('Error fetching public menu:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

export default menuRoutes;