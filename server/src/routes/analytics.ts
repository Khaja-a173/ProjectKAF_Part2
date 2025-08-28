@@ .. @@
   return reply.send({ window, granularity, series: revenueData });
 });

// GET /analytics/payment-funnel
app.get<{ Querystring: { window?: string } }>('/payment-funnel', {
  preHandler: [app.requireAuth]
}, async (req, reply) => {
  const tenantId = req.auth?.primaryTenantId;
  if (!tenantId) {
    return reply.code(400).send({ error: 'tenant_required' });
  }

  const window = req.query.window || '7d';
  
  // Validate window parameter (strict)
  const validWindows = ['7d', '30d', '90d', 'mtd', 'qtd', 'ytd'];
  if (!validWindows.includes(window)) {
    return reply.code(400).send({ error: 'invalid_window' });
  }

  try {
    const { data, error } = await app.supabase.rpc(
      'payment_conversion_funnel',
      { p_tenant_id: tenantId, p_window: window }
    );

    if (error) {
      app.log.error('Payment funnel DB error:', error);
      return reply.code(500).send({ error: 'db_error' });
    }

    return reply.send({
      window,
      rows: data || []
    });
  } catch (error: any) {
    app.log.error('Error fetching payment funnel:', error);
    return reply.code(500).send({ error: 'db_error' });
  }
});

+// GET /analytics/fulfillment-timeline
+app.get<{ Querystring: { window?: string } }>('/fulfillment-timeline', {
+  preHandler: [app.requireAuth]
+}, async (req, reply) => {
+  const tenantId = req.auth?.primaryTenantId;
+  if (!tenantId) {
+    return reply.code(400).send({ error: 'Missing tenant ID' });
+  }
+
+  const window = req.query.window || '7d';
+  
+  // Map window to interval text
+  const windowMap: Record<string, string> = {
+    '7d': '7 days',
+    '30d': '30 days', 
+    '90d': '90 days',
+    'mtd': '1 month',
+    'qtd': '3 months',
+    'ytd': '1 year'
+  };
+
+  const intervalText = windowMap[window];
+  if (!intervalText) {
+    return reply.code(400).send({ error: 'Invalid window parameter' });
+  }
+
+  try {
+    const result = await app.pg.query(
+      'SELECT * FROM app.order_fulfillment_timeline($1, $2)',
+      [tenantId, intervalText]
+    );
+
+    return reply.send({
+      window,
+      rows: result.rows
+    });
+  } catch (error: any) {
+    app.log.error('Error fetching fulfillment timeline:', error);
+    return reply.code(500).send({ error: 'Failed to fetch fulfillment timeline' });
+  }
+});
+
 };