import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { CustomerMenu } from './pages/Menu';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-load secondary customer routes so initial QR scan (/menu) loads fast on mobile
const SelectTable = lazy(() => import('./pages/SelectTable').then(m => ({ default: m.SelectTable })));
const CustomerCart = lazy(() => import('./pages/Cart').then(m => ({ default: m.CustomerCart })));
const CustomerOrderTracking = lazy(() => import('./pages/OrderTracking').then(m => ({ default: m.CustomerOrderTracking })));
const CustomerBill = lazy(() => import('./pages/Bill').then(m => ({ default: m.CustomerBill })));
const CustomerReview = lazy(() => import('./pages/Review').then(m => ({ default: m.CustomerReview })));

const RouteFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2.5">
    <div className="w-9 h-9 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Loading...</span>
  </div>
);

export function App() {
  React.useEffect(() => {
    document.title = 'Customer Menu - Arunachala Bhavan';
    let link = document.querySelector("link[rel='icon'][sizes='192x192']") || document.querySelector("link[rel='icon']");
    if (link) {
      link.href = '/icon-192.png?v=3';
      link.type = 'image/png';
    }
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <CartProvider>
          <ToastContainer />
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />
            <div className="flex-1 pb-32 md:pb-8">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/menu?table=12" replace />} />
                  <Route path="/select-table" element={<SelectTable />} />
                  <Route path="/menu" element={<CustomerMenu />} />
                  <Route path="/table/:tableNumber" element={<CustomerMenu />} />
                  <Route path="/cart" element={<CustomerCart />} />
                  <Route path="/order-tracking" element={<CustomerOrderTracking />} />
                  <Route path="/order-tracking/:orderId" element={<CustomerOrderTracking />} />
                  <Route path="/bill" element={<CustomerBill />} />
                  <Route path="/review" element={<CustomerReview />} />
                  <Route path="*" element={<Navigate to="/menu?table=12" replace />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </CartProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
