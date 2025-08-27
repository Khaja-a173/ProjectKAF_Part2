# Feature Flags Configuration

This document describes the feature flags used to control Phase 4 functionality.

## Environment Variables

### Frontend (Vite)
Add these to your `.env` file or set them in your deployment environment:

```bash
# QR Code Entry Flow
VITE_ENABLE_QR_FLOW=true

# Cart and Checkout System
VITE_ENABLE_CART_CHECKOUT=true

# Kitchen Display System with Realtime
VITE_ENABLE_KDS_RT=true

# Payment Processing
VITE_ENABLE_PAYMENTS=true
```

### Backend (Node.js)
Add these to your server environment:

```bash
# QR Code Entry Flow (always enabled - public endpoints)
ENABLE_QR_FLOW=true

# Cart and Checkout System
ENABLE_CART_CHECKOUT=true

# Kitchen Display System with Realtime
ENABLE_KDS_RT=true

# Payment Processing
ENABLE_PAYMENTS=true
```

## Feature Descriptions

### ENABLE_QR_FLOW / VITE_ENABLE_QR_FLOW
- **Purpose**: Enables QR code scanning entry points
- **Backend**: Controls `/qr/:tenantCode/:tableNumber` endpoint
- **Frontend**: Shows QR scan entry page and public menu access
- **Default**: `false`

### ENABLE_CART_CHECKOUT / VITE_ENABLE_CART_CHECKOUT
- **Purpose**: Enables cart creation and checkout flow
- **Backend**: Controls `/cart/*` and `/checkout/*` endpoints
- **Frontend**: Shows "Add to Cart" buttons and cart management
- **Dependencies**: Requires QR flow for public menu access
- **Default**: `false`

### ENABLE_KDS_RT / VITE_ENABLE_KDS_RT
- **Purpose**: Enables Kitchen Display System with realtime updates
- **Backend**: Controls `/kds/*` endpoints
- **Frontend**: Shows KDS page with live order lanes
- **Dependencies**: Requires authentication and kitchen role
- **Default**: `false`

### ENABLE_PAYMENTS / VITE_ENABLE_PAYMENTS
- **Purpose**: Enables payment processing and provider management
- **Backend**: Controls `/payments/*` endpoints (except basic config)
- **Frontend**: Shows payment forms and provider settings
- **Dependencies**: Requires cart/checkout flow
- **Default**: `false`

## How to Enable Features

### Development
1. Copy `.env.example` to `.env` (if not exists)
2. Add the desired feature flags with `=true`
3. Restart both frontend and backend servers

### Production
1. Set environment variables in your deployment platform
2. Ensure both frontend build-time and backend runtime variables are set
3. Deploy the updated configuration

## Feature Dependencies

```
QR Flow (base)
├── Cart/Checkout (requires QR for public access)
│   └── Payments (requires cart for payment intents)
└── KDS (independent, requires auth)
```

## Testing Feature Combinations

### Minimal Setup (QR + Menu only)
```bash
VITE_ENABLE_QR_FLOW=true
ENABLE_QR_FLOW=true
```

### Full Customer Flow
```bash
VITE_ENABLE_QR_FLOW=true
VITE_ENABLE_CART_CHECKOUT=true
VITE_ENABLE_PAYMENTS=true
ENABLE_QR_FLOW=true
ENABLE_CART_CHECKOUT=true
ENABLE_PAYMENTS=true
```

### Kitchen Staff Only
```bash
VITE_ENABLE_KDS_RT=true
ENABLE_KDS_RT=true
```

### Complete System
```bash
# All flags enabled
VITE_ENABLE_QR_FLOW=true
VITE_ENABLE_CART_CHECKOUT=true
VITE_ENABLE_KDS_RT=true
VITE_ENABLE_PAYMENTS=true
ENABLE_QR_FLOW=true
ENABLE_CART_CHECKOUT=true
ENABLE_KDS_RT=true
ENABLE_PAYMENTS=true
```

## Troubleshooting

### Feature Not Showing
1. Check both frontend and backend flags are set
2. Verify environment variable names (VITE_ prefix for frontend)
3. Restart servers after changing flags
4. Check browser console for flag-related errors

### API Endpoints Returning 503
- Backend feature flag is disabled
- Check server logs for "features disabled" messages
- Enable the corresponding backend flag

### UI Elements Missing
- Frontend feature flag is disabled
- Check that VITE_ prefixed variables are set
- Rebuild frontend if flags changed after build