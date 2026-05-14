import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import Footer from './components/Footer';
import HomeScreen from './screens/HomeScreen';
import ProductScreen from './screens/ProductScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CartScreen from './screens/CartScreen';
import ShippingScreen from './screens/ShippingScreen';
import PaymentScreen from './screens/PaymentScreen';
import PlaceOrderScreen from './screens/PlaceOrderScreen';
import OrderScreen from './screens/OrderScreen';
import SearchScreen from './screens/SearchScreen';
import AdminDashboard from './dashboards/AdminDashboard';
import VendorDashboard from './dashboards/VendorDashboard';
import UserDashboard from './dashboards/UserDashboard';
import DeliveryLogin from './dashboards/DeliveryLogin';
import DeliveryDashboard from './dashboards/DeliveryDashboard';

const App = () => {
  const location = useLocation();
  const isDelivery = location.pathname.startsWith('/delivery');

  return (
    <div className={`app-container min-vh-100 d-flex flex-column`}>
      {!isDelivery && <Header />}
      <main className="flex-grow-1">
        <div className="container-fluid px-4">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/product/:id" element={<ProductScreen />} />
            <Route path="/product" element={<SearchScreen />} />
            <Route path="/product/search" element={<SearchScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/cart" element={<CartScreen />} />
            <Route path="/shipping" element={<ShippingScreen />} />
            <Route path="/payment" element={<PaymentScreen />} />
            <Route path="/placeorder" element={<PlaceOrderScreen />} />
            <Route path="/order/:id" element={<OrderScreen />} />
            
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/profile" element={<UserDashboard />} />
            
            <Route path="/delivery/login" element={<DeliveryLogin />} />
            <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
          </Routes>
        </div>
      </main>
      <Footer />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default App;
