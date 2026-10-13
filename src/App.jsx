import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { CustomerMenu } from './pages/Menu';
import { SelectTable } from './pages/SelectTable';
import { CustomerCart } from './pages/Cart';
import { CustomerOrderTracking } from './pages/OrderTracking';
import { CustomerBill } from './pages/Bill';
import { CustomerReview } from './pages/Review';

export function App() {
  React.useEffect(() => {
    document.title = 'Customer Menu - Arunachala Bhavan';
    let link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = '/favicon.svg';
    }
  }, []);

  return (
    <BrowserRouter>
      <CartProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <div className="flex-1 pb-32 md:pb-8">
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
          </div>
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
