import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const checkoutRoutes: FastifyPluginAsync = async (app) => {
  const ENABLE_PAYMENTS = process.env.ENABLE_PAYMENTS === 'true';

  if (!ENABLE_PAYMENTS) {
    app.log.info('Payment features disabled via ENABLE_PAYMENTS flag');
    return;
  }

  // POST /checkout/create-intent
  app.post<{ 
    Body: { 
      cart_id: string;
      provider?: 'stripe' | 'razorpay' | 'mock';
    } 
  }>('/create-intent', async (req, reply) => {
    const { cart_id, provider = 'mock' } = req.body;

    if (!cart_id) {
      return reply.code(400).send({ error: 'cart_id is required' });
    }

    try {
      // Get cart with totals
      const cartResult = await app.pg.query(
        `SELECT c.*, t.id as tenant_id
         FROM carts c
         JOIN tenants t ON c.tenant_id = t.id
         WHERE c.id = $1`,
        [cart_id]
      );

      if (cartResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Cart not found' });
      }

      const cart = cartResult.rows[0];

      // Calculate total from cart items
      const itemsResult = await app.pg.query(
        `SELECT ci.quantity, mi.price
         FROM cart_items ci
         JOIN menu_items mi ON ci.menu_item_id = mi.id
         WHERE ci.cart_id = $1`,
        [cart_id]
      );

      const subtotal = itemsResult.rows.reduce((sum, item) => 
        sum + (parseFloat(item.price) * item.quantity), 0
      );
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      // Create payment intent
      const intentId = uuidv4();
      const clientSecret = provider === 'mock' ? `mock_${intentId}` : null;

      await app.pg.query(
        `INSERT INTO payment_intents (id, tenant_id, cart_id, provider, amount, currency, status, client_secret, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [intentId, cart.tenant_id, cart_id, provider, total, 'USD', 'requires_payment_method', clientSecret]
      );

      return {
        intent: {
          id: intentId,
          amount: parseFloat(total.toFixed(2)),
          currency: 'USD',
          status: 'requires_payment_method'
        },
        client_secret: clientSecret,
        provider_params: provider === 'mock' ? { mock: true } : {}
      };
    } catch (error: any) {
      app.log.error('Error creating payment intent:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /checkout/confirm
  app.post<{ 
    Body: { 
      intent_id: string;
      provider_payload?: any;
    } 
  }>('/confirm', async (req, reply) => {
    const { intent_id, provider_payload } = req.body;

    if (!intent_id) {
      return reply.code(400).send({ error: 'intent_id is required' });
    }

    try {
      // Get payment intent
      const intentResult = await app.pg.query(
        'SELECT * FROM payment_intents WHERE id = $1',
        [intent_id]
      );

      if (intentResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Payment intent not found' });
      }

      const intent = intentResult.rows[0];

      // For mock provider, simulate success
      if (intent.provider === 'mock') {
        // Update intent status
        await app.pg.query(
          'UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2',
          ['succeeded', intent_id]
        );

        // Create order from cart
        const orderId = uuidv4();
        await app.pg.query(
          `INSERT INTO orders (id, tenant_id, table_id, order_type, status, total_amount, payment_intent_id, created_at, updated_at)
           SELECT $1, c.tenant_id, c.table_id, c.order_type, 'paid', $2, $3, NOW(), NOW()
           FROM carts c WHERE c.id = $4`,
          [orderId, intent.amount, intent_id, intent.cart_id]
        );

        // Copy cart items to order items
        await app.pg.query(
          `INSERT INTO order_items (id, order_id, menu_item_id, quantity, unit_price, note, created_at)
           SELECT gen_random_uuid(), $1, ci.menu_item_id, ci.quantity, mi.price, ci.note, NOW()
           FROM cart_items ci
           JOIN menu_items mi ON ci.menu_item_id = mi.id
           WHERE ci.cart_id = $2`,
          [orderId, intent.cart_id]
        );

        return { status: 'succeeded', order_id: orderId };
      }

      // For other providers, return not implemented
      return reply.code(501).send({ error: 'Provider not implemented' });
    } catch (error: any) {
      app.log.error('Error confirming payment:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /checkout/cancel
  app.post<{ Body: { intent_id: string } }>('/cancel', async (req, reply) => {
    const { intent_id } = req.body;

    if (!intent_id) {
      return reply.code(400).send({ error: 'intent_id is required' });
    }

    try {
      await app.pg.query(
        'UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2',
        ['canceled', intent_id]
      );

      return { status: 'canceled' };
    } catch (error: any) {
      app.log.error('Error canceling payment:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

export default checkoutRoutes;