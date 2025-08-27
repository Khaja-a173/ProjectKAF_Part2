# Phase 4 - Live Order Lifecycle & Payments

## Quick Start Guide

This guide walks you through testing the complete live order lifecycle and payments system.

## Prerequisites

1. **Database Setup**: Run the SQL pack first
   ```bash
   # Apply the SQL pack to your database
   psql -d your_database -f sql-pack/phase4-live-order-lifecycle.sql
   ```

2. **Feature Flags**: Enable the features you want to test
   ```bash
   # Add to your .env files (see FEATURE_FLAGS.md for details)
   VITE_ENABLE_QR_FLOW=true
   VITE_ENABLE_CART_CHECKOUT=true
   VITE_ENABLE_KDS_RT=true
   VITE_ENABLE_PAYMENTS=true
   
   ENABLE_QR_FLOW=true
   ENABLE_CART_CHECKOUT=true
   ENABLE_KDS_RT=true
   ENABLE_PAYMENTS=true
   ```

3. **Start Services**
   ```bash
   # Backend
   cd server && npm run dev
   
   # Frontend
   npm run dev
   ```

## Smoke Tests

### 1. Health Check
```bash
curl -s http://localhost:8080/_health
# Expected: {"ok":true}
```

### 2. Authentication Check
```bash
curl -s http://localhost:8080/auth/whoami
# Expected: {"authenticated":false,...}

# With valid token:
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/auth/whoami
# Expected: {"authenticated":true, "primary_tenant_id": "...", ...}
```

### 3. QR Entry Flow
```bash
# Test QR context (replace with actual tenant code)
curl -s http://localhost:8080/qr/DEMO/1
# Expected: {"tenant": {...}, "table": {...}}
```

### 4. Public Menu
```bash
curl -s "http://localhost:8080/menu/public?tenantCode=DEMO"
# Expected: {"categories": [...], "items": [...]}
```

### 5. Cart Creation (if ENABLE_CART_CHECKOUT=true)
```bash
curl -s -X POST http://localhost:8080/cart \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"menu_item_id": "some-uuid", "qty": 2}],
    "order_type": "dine_in",
    "tenant_code": "DEMO"
  }'
# Expected: {"cart_id": "..."}
```

### 6. Payment Intent (if ENABLE_PAYMENTS=true)
```bash
curl -s -X POST http://localhost:8080/checkout/create-intent \
  -H "Content-Type: application/json" \
  -d '{"cart_id": "cart-uuid", "provider": "mock"}'
# Expected: {"intent": {...}, "client_secret": "mock_...", ...}
```

### 7. KDS Lanes (if ENABLE_KDS_RT=true)
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/kds/lanes
# Expected: {"queued": [...], "preparing": [...], "ready": [...]}
```

### 8. Payment Providers
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/payments/providers
# Expected: {"providers": [...]}
```

## End-to-End Testing

### Customer Journey (QR → Order → Pay)

1. **Scan QR Code**
   - Visit: `http://localhost:3000/qr/DEMO/1`
   - Should show restaurant welcome and auto-redirect to menu

2. **Browse Menu**
   - Visit: `http://localhost:3000/menu/DEMO`
   - Add items to cart (if cart enabled)
   - Click "View Cart"

3. **Review Cart**
   - Visit: `http://localhost:3000/cart/{cartId}`
   - Review items and totals
   - Click "Proceed to Payment"

4. **Complete Payment**
   - Visit: `http://localhost:3000/checkout/{intentId}`
   - Select payment method
   - For mock: payment succeeds immediately
   - Redirects to success page

5. **Track Order**
   - Visit: `http://localhost:3000/order/{orderId}`
   - See order status and realtime updates

### Kitchen Staff Journey (KDS)

1. **View Kitchen Display**
   - Visit: `http://localhost:3000/kds` (requires auth)
   - See orders in three lanes: Queued, Preparing, Ready

2. **Advance Orders**
   - Click "Start Preparing" on queued orders
   - Click "Mark Ready" on preparing orders
   - Click "Mark Served" on ready orders

3. **Realtime Updates**
   - Open KDS in one tab, Dashboard in another
   - Advance order status in KDS
   - Watch Dashboard metrics update in real-time

### Admin Journey (Payment Setup)

1. **Configure Payment Provider**
   - Visit: `http://localhost:3000/admin/payments`
   - Set provider to "mock" for testing
   - Configure enabled payment methods
   - Save configuration

2. **Monitor Payments**
   - Check payment provider list
   - View payment events and status changes

## API Testing with curl

### Order Status Management
```bash
# Emit order status change
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/orders/{orderId}/emit-status \
  -H "Content-Type: application/json" \
  -d '{"to_status": "preparing", "note": "Started cooking"}'

# Advance order in KDS
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/kds/orders/{orderId}/advance \
  -H "Content-Type: application/json" \
  -d '{"to_status": "ready"}'
```

### Payment Events
```bash
# Emit payment event
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/payments/intents/{intentId}/emit-event \
  -H "Content-Type: application/json" \
  -d '{"event_type": "payment_succeeded", "payload": {"amount": 25.99}}'
```

### Payment Provider Management
```bash
# Create payment provider
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/payments/providers \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mock",
    "display_name": "Mock Provider",
    "is_live": false,
    "is_enabled": true,
    "is_default": true
  }'

# Update payment provider
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/payments/providers/{providerId} \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Updated Mock Provider"}'
```

## Realtime Testing

### Setup Multiple Browser Tabs
1. **Dashboard**: `http://localhost:3000/` (logged in)
2. **KDS**: `http://localhost:3000/kds` (logged in)
3. **Orders**: `http://localhost:3000/orders` (logged in)

### Test Realtime Updates
1. Create a new order through the customer flow
2. Watch it appear in Dashboard metrics
3. See it show up in KDS queued lane
4. Advance it through KDS stages
5. Watch Dashboard and Orders page update in real-time

## Troubleshooting

### Common Issues

1. **Feature not available**: Check feature flags in both frontend and backend
2. **Authentication errors**: Ensure valid JWT token is being sent
3. **Database errors**: Run the SQL pack and check table creation
4. **Realtime not working**: Check Supabase connection and RLS policies

### Debug Commands
```bash
# Check routes
curl -s http://localhost:8080/_routes

# Check feature flags (should be in server logs)
grep -i "feature" server/logs/app.log

# Test database connection
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/auth/whoami
```

### Expected Behavior

- **Flags OFF**: Features return 503 "Service not available" or are hidden in UI
- **Flags ON**: Full functionality available
- **Mock Provider**: Payments succeed immediately without external API calls
- **Realtime**: Updates appear within 1-2 seconds across all connected clients

## Success Criteria

✅ All smoke tests pass  
✅ Customer can complete full QR → Order → Pay flow  
✅ Kitchen staff can manage orders through KDS  
✅ Admin can configure payment providers  
✅ Realtime updates work across all pages  
✅ Feature flags properly control functionality  
✅ No errors in browser console or server logs  

## Next Steps

After successful testing:
1. Configure real payment providers (Stripe/Razorpay)
2. Set up production environment variables
3. Deploy with appropriate feature flags enabled
4. Train staff on KDS and admin interfaces