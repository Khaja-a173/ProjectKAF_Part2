@@ .. @@
 import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
 import Dashboard from './pages/Dashboard';
 import AdminTenants from './pages/AdminTenants';
+import AdminPayments from './pages/AdminPayments';
import ScanEntry from './pages/ScanEntry';
import MenuPublic from './pages/MenuPublic';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import OrderTracking from './pages/OrderTracking';
import KDS from './pages/KDS';
import ScanEntry from './pages/ScanEntry';
import MenuPublic from './pages/MenuPublic';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
+import CheckoutSuccess from './pages/CheckoutSuccess';
import OrderTracking from './pages/OrderTracking';
import KDS from './pages/KDS';
 import Login from './pages/Login';
@@ .. @@
         <Routes>
           <Route path="/" element={<Dashboard />} />
           <Route path="/admin/tenants" element={<AdminTenants />} />
+          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/qr/:tenantCode/:tableNumber" element={<ScanEntry />} />
          <Route path="/menu/:tenantCode" element={<MenuPublic />} />
          <Route path="/cart/:cartId" element={<Cart />} />
          <Route path="/checkout/:intentId" element={<Checkout />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/order/:orderId" element={<OrderTracking />} />
          <Route path="/kds" element={<KDS />} />
          <Route path="/qr/:tenantCode/:tableNumber" element={<ScanEntry />} />
          <Route path="/menu/:tenantCode" element={<MenuPublic />} />
          <Route path="/cart/:cartId" element={<Cart />} />
          <Route path="/checkout/:intentId" element={<Checkout />} />
+          <Route path="/checkout" element={<Checkout />} />
+          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/order/:orderId" element={<OrderTracking />} />
          <Route path="/kds" element={<KDS />} />
           <Route path="/login" element={<Login />} />
         </Routes>