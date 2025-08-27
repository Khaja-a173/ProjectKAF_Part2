@@ .. @@
   });

  // POST /orders/:id/emit-status
  app.post<{ Params: { id: string }, Body: { to_status: string; note?: string } }>('/:id/emit-status', async (req, reply) => {
    const tenantId = req.auth?.primaryTenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Missing tenant ID' });
    }

    const { id } = req.params;
    const { to_status, note } = req.body;

    // Validate status
    const validStatuses = ['new', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
    if (!validStatuses.includes(to_status)) {
      return reply.code(400).send({ error: 'Invalid status' });
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
        `INSERT INTO order_status_events (id, tenant_id, order_id, from_status, to_status, note, created_at)
         SELECT $1, $2, $3, $4, $5, $6, NOW()
         WHERE EXISTS (SELECT 1 FROM orders WHERE id = $3 AND tenant_id = $2)
         RETURNING *`,
        [uuidv4(), tenantId, id, fromStatus, to_status, note]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Order not found' });
      }

      return { ok: true };
    } catch (error: any) {
      app.log.error('Error emitting order status:', error);
      if (error.code === '42P01') {
        return reply.code(503).send({ error: 'Service not available', reason: 'missing_table' });
      }
      return reply.code(500).send({ error: 'Failed to emit status change' });
    }
  });

+  // POST /orders/:id/emit-status - Emit status change events
+  app.post<{ Params: { id: string }, Body: { to_status: string } }>('/:id/emit-status', async (req, reply) => {
+    const tenantId = req.auth?.primaryTenantId;
+    if (!tenantId) {
+      return reply.code(401).send({ error: 'Missing tenant ID' });
+    }
+
+    const { id } = req.params;
+    const { to_status } = req.body;
+
+    // Validate status
+    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
+    if (!validStatuses.includes(to_status)) {
+      return reply.code(400).send({ error: 'Invalid status' });
+    }
+
+    try {
+      // Insert status event
+      const result = await app.pg.query(
+        `INSERT INTO order_status_events (tenant_id, order_id, from_status, to_status, created_at)
+         SELECT $1, $2, 
+                COALESCE((SELECT to_status FROM order_status_events WHERE order_id = $2 ORDER BY created_at DESC LIMIT 1), 'pending'),
+                $3, NOW()
+         WHERE EXISTS (SELECT 1 FROM orders WHERE id = $2 AND tenant_id = $1)
+         RETURNING *`,
+        [tenantId, id, to_status]
+      );
+
+      if (result.rows.length === 0) {
+        return reply.code(404).send({ error: 'Order not found' });
+      }
+
+      return result.rows[0];
+    } catch (error: any) {
+      app.log.error('Error emitting order status:', error);
+      return reply.code(500).send({ error: 'Failed to emit status change' });
+    }
+  });
+
   // GET /orders/kds - Kitchen Display System view