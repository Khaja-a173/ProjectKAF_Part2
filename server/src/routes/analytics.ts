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

// GET /analytics/peak-hours
app.get<{ Querystring: { window?: string } }>('/peak-hours', {
  preHandler: [app.requireAuth]
}, async (req, reply) => {
  const tenantId = req.auth?.primaryTenantId;
  if (!tenantId) {
    return reply.code(400).send({ error: 'tenant_missing' });
  }

  const window = req.query.window || '7d';
  
  // Validate window parameter (strict)
  const validWindows = ['7d', '30d', '90d', 'mtd', 'qtd', 'ytd'];
  if (!validWindows.includes(window)) {
    return reply.code(400).send({ error: 'invalid_window' });
  }

  try {
    const result = await app.pg.query(
      'SELECT weekday, hour24, orders_count, revenue_total FROM app.peak_hours_heatmap($1::uuid, $2::text)',
      [tenantId, window]
    );

    return reply.send({
      window,
      rows: result.rows
    });
  } catch (error: any) {
    app.log.error('Error fetching peak hours:', error);
    return reply.code(500).send({ error: 'db_error' });
  }
});

// GET /analytics/revenue-series
app.get<{ Querystring: { window?: string; granularity?: string } }>('/revenue-series', {
  preHandler: [app.requireAuth]
}, async (req, reply) => {
  const tenantId = req.auth?.primaryTenantId;
  if (!tenantId) {
    return reply.code(400).send({ error: 'tenant_missing' });
  }

  const window = (req.query.window || '30d').toLowerCase();
  const granularity = (req.query.granularity || 'day').toLowerCase();
  
  // Validate parameters
  const validWindows = ['7d', '30d', '90d', 'mtd', 'qtd', 'ytd'];
  const validGranularities = ['day', 'week', 'month'];
  
  if (!validWindows.includes(window)) {
    return reply.code(400).send({ error: 'invalid_window' });
  }
  
  if (!validGranularities.includes(granularity)) {
    return reply.code(400).send({ error: 'invalid_granularity' });
  }

  try {
    const result = await app.pg.query(
      'SELECT bucket, revenue_total, orders_count FROM app.revenue_timeseries($1::uuid, $2::text, $3::text)',
      [tenantId, window, granularity]
    );

    // Calculate totals server-side
    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.revenue_total || '0'), 0);
    const orders = result.rows.reduce((sum, row) => sum + parseInt(row.orders_count || '0'), 0);

    return reply.send({
      window,
      granularity,
      series: result.rows,
      total: total.toFixed(2),
      orders
    });
  } catch (error: any) {
    app.log.error('Error fetching revenue series:', error);
    return reply.code(500).send({ error: 'db_error' });
  }
});

// GET /analytics/revenue-breakdown
app.get<{ Querystring: { bucket: string; by: string; granularity?: string } }>('/revenue-breakdown', {
  preHandler: [app.requireAuth]
}, async (req, reply) => {
  const tenantId = req.auth?.primaryTenantId;
  if (!tenantId) {
    return reply.code(400).send({ error: 'tenant_missing' });
  }

  const { bucket, by } = req.query;
  const granularity = req.query.granularity || 'day';
  
  if (!bucket || !by) {
    return reply.code(400).send({ error: 'missing_params' });
  }

  const validBy = ['item', 'category', 'order_type'];
  if (!validBy.includes(by)) {
    return reply.code(400).send({ error: 'invalid_by' });
  }

  try {
    // Parse bucket date and calculate time range
    const bucketDate = new Date(bucket);
    let startTime, endTime;
    
    switch (granularity) {
      case 'day':
        startTime = new Date(bucketDate);
        endTime = new Date(bucketDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(bucketDate);
        endTime = new Date(bucketDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(bucketDate);
        endTime = new Date(bucketDate.getFullYear(), bucketDate.getMonth() + 1, 1);
        break;
      default:
        return reply.code(400).send({ error: 'invalid_granularity' });
    }

    let result;
    
    switch (by) {
      case 'item':
        result = await app.pg.query(`
          SELECT mi.id, mi.name as label, 
                 SUM(oi.quantity) as qty,
                 SUM(oi.quantity * oi.unit_price) as revenue
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.tenant_id = $1 AND o.created_at >= $2 AND o.created_at < $3
          GROUP BY mi.id, mi.name
          ORDER BY revenue DESC
          LIMIT 10
        `, [tenantId, startTime.toISOString(), endTime.toISOString()]);
        break;
        
      case 'category':
        result = await app.pg.query(`
          SELECT mc.id, mc.name as label,
                 SUM(oi.quantity) as qty,
                 SUM(oi.quantity * oi.unit_price) as revenue
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          JOIN menu_categories mc ON mi.category_id = mc.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.tenant_id = $1 AND o.created_at >= $2 AND o.created_at < $3
          GROUP BY mc.id, mc.name
          ORDER BY revenue DESC
        `, [tenantId, startTime.toISOString(), endTime.toISOString()]);
        break;
        
      case 'order_type':
        result = await app.pg.query(`
          SELECT o.order_type as id, o.order_type as label,
                 COUNT(*) as qty,
                 COALESCE(SUM(o.total_amount), 0) as revenue
          FROM orders o
          WHERE o.tenant_id = $1 AND o.created_at >= $2 AND o.created_at < $3
          GROUP BY o.order_type
          ORDER BY revenue DESC
        `, [tenantId, startTime.toISOString(), endTime.toISOString()]);
        break;
        
      default:
        return reply.code(400).send({ error: 'invalid_by' });
    }

    // Format revenue as string
    const rows = result.rows.map(row => ({
      ...row,
      revenue: parseFloat(row.revenue || '0').toFixed(2)
    }));

    return reply.send({
      bucket,
      by,
      rows
    });
  } catch (error: any) {
    app.log.error('Error fetching revenue breakdown:', error);
    return reply.code(500).send({ error: 'db_error' });
  }
});

// GET /analytics/fulfillment-timeline
app.get<{ Querystring: { window?: string } }>('/fulfillment-timeline', {
  preHandler: [app.requireAuth]
}, async (req, reply) => {
  const tenantId = req.auth?.primaryTenantId;
  if (!tenantId) {
    return reply.code(400).send({ error: 'Missing tenant ID' });
  }

  const window = req.query.window || '7d';
  
  // Map window to interval text
  const windowMap: Record<string, string> = {
    '7d': '7 days',
    '30d': '30 days', 
    '90d': '90 days',
    'mtd': '1 month',
    'qtd': '3 months',
    'ytd': '1 year'
  };

  const intervalText = windowMap[window];
  if (!intervalText) {
    return reply.code(400).send({ error: 'Invalid window parameter' });
  }

  try {
    const result = await app.pg.query(
      'SELECT * FROM app.order_fulfillment_timeline($1, $2)',
      [tenantId, intervalText]
    );

    return reply.send({
      window,
      rows: result.rows
    });
  } catch (error: any) {
    app.log.error('Error fetching fulfillment timeline:', error);
    return reply.code(500).send({ error: 'Failed to fetch fulfillment timeline' });
  }
});

// GET /analytics/payment-funnel
app.get<{ Querystring: { window?: string } }>('/payment-funnel', {
  preHandler: [app.requireAuth]
}, async (req, reply) => {
  const tenantId = req.auth?.primaryTenantId;
  if (!tenantId) {
    return reply.code(400).send({ error: 'tenant_missing' });
  }

  const window = req.query.window || '7d';
  
  // Validate window parameter (strict)
  const validWindows = ['7d', '30d', '90d', 'mtd', 'qtd', 'ytd'];
  if (!validWindows.includes(window)) {
    return reply.code(400).send({ error: 'invalid_window' });
  }

  try {
    const result = await app.pg.query(
      'SELECT stage, stage_order, intents, amount_total FROM app.payment_conversion_funnel($1::uuid, $2::text)',
      [tenantId, window]
    );

    return reply.send({
      window,
      rows: result.rows
    });
  } catch (error: any) {
    app.log.error('Error fetching payment funnel:', error);
    return reply.code(500).send({ error: 'db_error' });
  }
});

};