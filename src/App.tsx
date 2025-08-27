@@ .. @@
 import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
 import Dashboard from './pages/Dashboard';
 import AdminTenants from './pages/AdminTenants';
+import AdminPayments from './pages/AdminPayments';
+import Checkout from './pages/Checkout';
+import CheckoutSuccess from './pages/CheckoutSuccess';
 import Login from './pages/Login';
@@ .. @@
         <Routes>
           <Route path="/" element={<Dashboard />} />
           <Route path="/admin/tenants" element={<AdminTenants />} />
+          <Route path="/admin/payments" element={<AdminPayments />} />
+          <Route path="/checkout" element={<Checkout />} />
+          <Route path="/checkout/success" element={<CheckoutSuccess />} />
           <Route path="/login" element={<Login />} />
         </Routes>