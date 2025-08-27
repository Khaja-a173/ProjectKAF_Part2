@@ .. @@
 import authRoutes from './routes/auth';
 import tenantRoutes from './routes/tenants';
 import analyticsRoutes from './routes/analytics';
+import paymentsRoutes from './routes/payments';
 
 const app: FastifyInstance = fastify({
@@ .. @@
 await app.register(authRoutes, { prefix: '/auth' });
 await app.register(tenantRoutes, { prefix: '/tenants' });
 await app.register(analyticsRoutes, { prefix: '/analytics' });
+await app.register(paymentsRoutes, { prefix: '/payments' });
 
 // Health check endpoint