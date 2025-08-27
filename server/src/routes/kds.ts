import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const kdsRoutes: FastifyPluginAsync = async (app) => {
  const ENABLE_KDS_RT = process.env.ENABLE_KDS_RT === 'true';

  // All routes require authentication
  app.addHook('preHandler', app.requireAuth);

  // GET /kds/lanes
  app.get('/lanes', async (req, reply) => {
    if (!ENABLE_KDS_RT) {
      return reply.code(503).send({ error: 'KDS features disabled', reason: 'feature_flag_off' });
    }

    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    try {
      // Get orders with latest status using a subquery approach
      const ordersResult = await app.pg.query(
        `SELECT o.id, o.table_id, o.order_type, o.total_amount, o.created_at,
                t.table_number,
                COALESCE(latest_status.to_status, 'new') as current_status,
                latest_status.created_at as status_updated_at,
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'menu_item_id', oi.menu_item_id,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'note', oi.note,
                    'name', mi.name
                  )
                ) as items
         FROM orders o
         LEFT JOIN tables t ON o.table_id = t.id
         LEFT JOIN LATERAL (
           SELECT to_status, created_at
           FROM order_status_events ose
           WHERE ose.order_id = o.id
           ORDER BY ose.created_at DESC
           LIMIT 1
         ) latest_status ON true
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE o.tenant_id = $1
           AND COALESCE(latest_status.to_status, 'new') IN ('new', 'confirmed', 'preparing', 'ready')
         GROUP BY o.id, o.table_id, o.order_type, o.total_amount, o.created_at,
                  t.table_number, latest_status.to_status, latest_status.created_at
         ORDER BY o.created_at ASC`,
        [tenantId]
      );

      // Group orders by status
      const lanes = {
        queued: [],
        preparing: [],
        ready: []
      };

      ordersResult.rows.forEach(order => {
        const status = order.current_status;
        if (status === 'new' || status === 'confirmed') {
          lanes.queued.push(order);
        } else if (status === 'preparing') {
          lanes.preparing.push(order);
        } else if (status === 'ready') {
          lanes.ready.push(order);
        }
      });

      return lanes;
    } catch (error: any) {
      app.log.error('Error fetching KDS lanes:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /kds/orders/:id/advance
  app.post<{ Params: { id: string }, Body: { to_status: string } }>('/orders/:id/advance', async (req, reply) => {
    if (!ENABLE_KDS_RT) {
      return reply.code(503).send({ error: 'KDS features disabled', reason: 'feature_flag_off' });
    }

    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { id } = req.params;
    const { to_status } = req.body;

    // Validate kitchen-allowed statuses
    const validStatuses = ['preparing', 'ready', 'served'];
    if (!validStatuses.includes(to_status)) {
      return reply.code(400).send({ error: 'Invalid status for kitchen' });
    }

    try {
      // Get current status
      const currentResult = await app.pg.query(
        `SELECT COALESCE(
           (SELECT to_status FROM order_status_events WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1),
           'new'
         ) as current_status`,
        [id]
      );

      const fromStatus = currentResult.rows[0]?.current_status || 'new';

      // Insert status event
      const result = await app.pg.query(
        `INSERT INTO order_status_events (id, tenant_id, order_id, from_status, to_status, created_at, created_by_staff_id)
         SELECT $1, $2, $3, $4, $5, NOW(), $6
         WHERE EXISTS (SELECT 1 FROM orders WHERE id = $3 AND tenant_id = $2)
         RETURNING *`,
        [uuidv4(), tenantId, id, fromStatus, to_status, req.auth?.userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      return { ok: true };
    } catch (error: any) {
      app.log.error('Error advancing order status:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Failed to advance order status' });
    }
  });
};

export default kdsRoutes;