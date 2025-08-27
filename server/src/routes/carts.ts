import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const cartsRoutes: FastifyPluginAsync = async (app) => {
  const ENABLE_CART_CHECKOUT = process.env.ENABLE_CART_CHECKOUT === 'true';

  if (!ENABLE_CART_CHECKOUT) {
    app.log.info('Cart/Checkout features disabled via ENABLE_CART_CHECKOUT flag');
    return;
  }

  // POST /cart
  app.post<{ 
    Body: { 
      items: Array<{ menu_item_id: string; qty: number; note?: string }>;
      order_type: 'dine_in' | 'takeaway';
      table_id?: string;
      tenant_code: string;
    } 
  }>('/', async (req, reply) => {
    const { items, order_type, table_id, tenant_code } = req.body;

    if (!items || items.length === 0) {
      return reply.code(400).send({ error: 'Items are required' });
    }

    if (!tenant_code) {
      return reply.code(400).send({ error: 'tenant_code is required' });
    }

    try {
      // Find tenant by code
      const tenantResult = await app.pg.query(
        'SELECT id FROM tenants WHERE code = $1 AND is_active = true',
        [tenant_code]
      );

      if (tenantResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      const tenantId = tenantResult.rows[0].id;
      const cartId = uuidv4();

      // Create cart
      await app.pg.query(
        `INSERT INTO carts (id, tenant_id, order_type, table_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [cartId, tenantId, order_type, table_id]
      );

      // Add cart items
      for (const item of items) {
        await app.pg.query(
          `INSERT INTO cart_items (id, cart_id, menu_item_id, quantity, note, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [uuidv4(), cartId, item.menu_item_id, item.qty, item.note || null]
        );
      }

      return { cart_id: cartId };
    } catch (error: any) {
      app.log.error('Error creating cart:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /cart/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params;

    try {
      // Get cart
      const cartResult = await app.pg.query(
        'SELECT * FROM carts WHERE id = $1',
        [id]
      );

      if (cartResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Cart not found' });
      }

      const cart = cartResult.rows[0];

      // Get cart items with menu item details
      const itemsResult = await app.pg.query(
        `SELECT ci.id, ci.quantity, ci.note,
                mi.id as menu_item_id, mi.name, mi.description, mi.price
         FROM cart_items ci
         JOIN menu_items mi ON ci.menu_item_id = mi.id
         WHERE ci.cart_id = $1`,
        [id]
      );

      // Calculate totals
      const subtotal = itemsResult.rows.reduce((sum, item) => 
        sum + (parseFloat(item.price) * item.quantity), 0
      );
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;

      return {
        cart,
        items: itemsResult.rows,
        totals: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax: parseFloat(tax.toFixed(2)),
          total: parseFloat(total.toFixed(2))
        }
      };
    } catch (error: any) {
      app.log.error('Error fetching cart:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

export default cartsRoutes;