@@ .. @@
 import authRoutes from './routes/auth';
 import tenantRoutes from './routes/tenants';
 import analyticsRoutes from './routes/analytics';
import qrRoutes from './routes/qr';
import menuRoutes from './routes/menu';
import cartsRoutes from './routes/carts';
import checkoutRoutes from './routes/checkout';
import kdsRoutes from './routes/kds';
import qrRoutes from './routes/qr';
import menuRoutes from './routes/menu';
import cartsRoutes from './routes/carts';
import checkoutRoutes from './routes/checkout';
import kdsRoutes from './routes/kds';
+import paymentsRoutes from './routes/payments';
import receiptsRoutes from './routes/receipts';
 
 const app: FastifyInstance = fastify({
 }
 )
@@ .. @@
 await app.register(authRoutes, { prefix: '/auth' });
 await app.register(tenantRoutes, { prefix: '/tenants' });
 await app.register(analyticsRoutes, { prefix: '/analytics' });
await app.register(qrRoutes, { prefix: '/qr' });
await app.register(menuRoutes, { prefix: '/menu' });
await app.register(cartsRoutes, { prefix: '/cart' });
await app.register(checkoutRoutes, { prefix: '/checkout' });
await app.register(kdsRoutes, { prefix: '/kds' });
await app.register(qrRoutes, { prefix: '/qr' });
await app.register(menuRoutes, { prefix: '/menu' });
await app.register(cartsRoutes, { prefix: '/cart' });
await app.register(checkoutRoutes, { prefix: '/checkout' });
await app.register(kdsRoutes, { prefix: '/kds' });
+await app.register(paymentsRoutes, { prefix: '/payments' });
await app.register(receiptsRoutes, { prefix: '/receipts' });
 
 // Health check endpoint