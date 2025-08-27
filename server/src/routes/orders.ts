@@ .. @@
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