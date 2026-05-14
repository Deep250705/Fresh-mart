import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Tab, Tabs, Modal, Button, Table, Badge } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaTrash, FaEdit, FaBoxOpen, FaRupeeSign, FaChartLine, FaTruck,
  FaPlus, FaBell, FaShieldAlt, FaCheckCircle, FaTimesCircle,
  FaArrowUp, FaExternalLinkAlt, FaWarehouse, FaUserTie, FaRoute, FaBox
} from 'react-icons/fa';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { confirmAction, notifySuccess, notifyError } from '../utils/notify';
import ExcelReportDownloadCard from '../components/ExcelReportDownloadCard';

/* ─── Custom Tooltip for Recharts ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '10px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        fontSize: '0.83rem',
      }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#374151' }}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
            {p.dataKey}: ₹{p.value?.toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ─── Stat Card Component ─── */
const StatCard = ({ title, value, icon: Icon, gradient, sub, badge }) => (
  <div className="vd-stat-card" style={{ background: gradient }}>
    <div className="vd-stat-icon"><Icon size={22} /></div>
    <div className="vd-stat-body">
      <div className="vd-stat-label">{title}</div>
      <div className="vd-stat-value">{value}</div>
      {sub && (
        <div className="vd-stat-sub">
          <FaArrowUp size={9} style={{ marginRight: 3 }} />{sub}
        </div>
      )}
    </div>
    {badge && <span className="vd-stat-badge">{badge}</span>}
  </div>
);

/* ─── Shared th style ─── */
const thStyle = {
  backgroundColor: 'transparent',
  color: '#fff',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  padding: '13px 16px',
  border: 'none',
  whiteSpace: 'nowrap',
};

const VendorDashboard = () => {
  const [stats, setStats] = useState({});
  const [categories, setCategories] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [productDetails, setProductDetails] = useState({
    name: '', price: 0, image: '', brand: '', category: '',
    countInStock: 0, unit: 'kilogram', description: '', costPrice: 0,
  });
  const [editStockId, setEditStockId] = useState(null);
  const [editStockValue, setEditStockValue] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [chartDays, setChartDays] = useState(7);
  
  // Delivery Management States
  const [agents, setAgents] = useState([]);
  const [ordersToDeliver, setOrdersToDeliver] = useState([]);
  const [agentAssignmentError, setAgentAssignmentError] = useState('');

  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userInfo || userInfo.role !== 'vendor') {
      navigate('/login');
    } else {
      const fetchStatsAndCats = async () => {
        try {
          const { data } = await axios.get('/api/dashboard/vendor', {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          setStats(data);
          const { data: catData } = await axios.get('/api/categories');
          setCategories(catData);
          const { data: prodData } = await axios.get(
            `/api/products?vendor=${userInfo._id}&pageNumber=1&pageSize=1000`
          );
          setMyProducts(prodData.products);

          const { data: agentsData } = await axios.get('/api/delivery', {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          setAgents(agentsData);

          const { data: vendorOrders } = await axios.get('/api/orders', {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          setOrdersToDeliver(vendorOrders.orders || []);
        } catch (error) {
          console.error(error);
        }
      };
      fetchStatsAndCats();
    }
  }, [userInfo, navigate]);

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userInfo.token}` },
      });
      setProductDetails({ ...productDetails, image: data.image });
    } catch (error) {
      notifyError('Error uploading image: ' + (error.response?.data?.message || error.message));
    }
  };

  const addProductHandler = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...productDetails,
        pricingOptions: [{
           weight: productDetails.unit,
           price: Number(productDetails.price),
           costPrice: Number(productDetails.costPrice),
           countInStock: Number(productDetails.countInStock)
        }]
      };
      const { data } = await axios.post('/api/products', payload, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      notifySuccess('Product Added Successfully!');
      setMyProducts([data, ...myProducts]);
      setProductDetails({ name: '', price: 0, image: '', brand: '', category: '', countInStock: 0, unit: 'kilogram', description: '', costPrice: 0 });
    } catch (err) {
      notifyError('Failed to add product: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleEditStock = (id, currentStock) => {
    setEditStockId(id);
    setEditStockValue(currentStock);
    setShowStockModal(true);
  };

  const saveStockHandler = async (id) => {
    if (editStockValue !== '' && !isNaN(editStockValue) && editStockValue >= 0) {
      try {
        const product = myProducts.find((p) => p._id === id);
        if (!product) {
          notifyError('Unable to find that product in the current list.');
          return;
        }

        const pricingOptions = (product.pricingOptions || []).map((option, index) => ({
          ...option,
          countInStock: index === 0 ? Number(editStockValue) : option.countInStock,
        }));

        await axios.put(`/api/products/${id}`, { pricingOptions, countInStock: Number(editStockValue) }, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        
        setMyProducts(myProducts.map(p => {
          if (p._id === id) {
             const newOpts = p.pricingOptions.map((o, index) => ({
               ...o,
               countInStock: index === 0 ? Number(editStockValue) : o.countInStock,
             }));
             return { ...p, pricingOptions: newOpts };
          }
          return p;
        }));
        setEditStockId(null);
        setShowStockModal(false);
      } catch (err) {
        notifyError('Failed to update inventory: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const deleteProductHandler = async (id, name) => {
    const result = await confirmAction('Delete Product', `Are you absolutely sure you want to delete ${name}? This action is irreversible.`);
    if (result.isConfirmed) {
      try {
        await axios.delete(`/api/products/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setMyProducts(myProducts.filter(p => p._id !== id));
        notifySuccess('Product deleted successfully.');
      } catch (err) {
        notifyError('Failed to delete product: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const packOrderHandler = async (orderId, method) => {
    const result = await confirmAction('Pack Order', `Are you sure you want to mark this order as Packed via ${method} delivery?`);
    if (result.isConfirmed) {
      try {
        const { data: updatedOrder } = await axios.put(`/api/orders/${orderId}/pack`, { deliveryMethod: method }, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        
        if (updatedOrder.isPacked) {
          notifySuccess(`Order fully Packed! Method: ${updatedOrder.deliveryMethod}`);
        } else {
          notifySuccess(`Your items for this order are packed. Awaiting other vendors.`);
        }
        
        setOrdersToDeliver(ordersToDeliver.map(o => o._id === orderId ? updatedOrder : o));
      } catch (err) {
        notifyError('Failed to pack order: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const assignAgentHandler = async (orderId, agentId) => {
    setAgentAssignmentError('');
    if (!agentId) {
      setAgentAssignmentError('Please select a Delivery Agent from the dropdown.');
      return;
    }
    const result = await confirmAction('Assign Agent', 'Are you sure you want to assign this delivery agent?');
    if (result.isConfirmed) {
      try {
        const { data: updatedOrder } = await axios.put(`/api/orders/${orderId}/assign`, { deliveryAgentId: agentId }, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        notifySuccess('Delivery Agent assigned successfully!');
        setOrdersToDeliver(ordersToDeliver.map(o => o._id === orderId ? updatedOrder : o));
      } catch (err) {
        notifyError('Failed to assign agent: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const markDeliveredHandler = async (orderId) => {
    try {
      const { data: updatedOrder } = await axios.put(`/api/orders/${orderId}/deliver`, { status: 'Delivered' }, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      notifySuccess('Product Delivered successfully');
      setOrdersToDeliver(ordersToDeliver.map(o => o._id === orderId ? updatedOrder : o));
    } catch (err) {
      notifyError('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const calculateProfitMargin = () => (!stats.totalSales || stats.totalSales === 0 ? 0 : 25.0);

  const getChartData = () => {
    if (!stats.salesByDate) return [];
    const dataSlice = chartDays ? stats.salesByDate.slice(-chartDays) : stats.salesByDate;
    return dataSlice.map(d => ({ date: d._id, Revenue: d.sales, Profit: d.profit }));
  };

  const lowStockProducts = myProducts.filter(p => p.pricingOptions && p.pricingOptions.some(opt => opt.countInStock > 0 && opt.countInStock <= 5));
  const outOfStockProducts = myProducts.filter(p => p.pricingOptions && p.pricingOptions.every(opt => opt.countInStock === 0));

  return (
    <>
      <style>{`
        .vd-page { background: #f1f5f4; min-height: 100vh; }

        .vd-header {
          background: linear-gradient(135deg, #0f7c44 0%, #1aab5e 60%, #00c16e 100%);
          border-radius: 18px; padding: 28px 32px; color: #fff;
          margin-bottom: 28px; box-shadow: 0 6px 24px rgba(26,171,94,0.22);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .vd-header h2 { font-size: 1.55rem; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; }
        .vd-header p  { margin: 0; font-size: 0.88rem; opacity: 0.85; }

        .vd-verified-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35);
          border-radius: 20px; padding: 4px 14px; font-size: 0.78rem; font-weight: 700; color: #fff;
        }
        .vd-pending-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,193,7,0.25); border: 1px solid rgba(255,193,7,0.5);
          border-radius: 20px; padding: 4px 14px; font-size: 0.78rem; font-weight: 700; color: #ffe083;
        }
        .vd-quick-action {
          background: #fff; color: #1aab5e; border: none; border-radius: 10px;
          padding: 10px 20px; font-size: 0.85rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 7px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12); transition: all 0.22s ease;
        }
        .vd-quick-action:hover { background: #f0fff7; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.15); }

        .vd-alert-row { display: flex; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
        .vd-alert-chip {
          display: flex; align-items: center; gap: 8px;
          background: #fff8e1; border: 1px solid #ffd54f;
          border-radius: 10px; padding: 8px 16px; font-size: 0.8rem; font-weight: 600; color: #6d4c00;
        }
        .vd-alert-chip.danger { background: #fff0f0; border-color: #ffb3b3; color: #7d1010; }

        .vd-stat-card {
          border-radius: 16px; padding: 22px 20px 18px;
          display: flex; align-items: flex-start; gap: 16px;
          box-shadow: 0 3px 14px rgba(0,0,0,0.09);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          position: relative; overflow: hidden; margin-bottom: 20px; min-height: 120px;
        }
        .vd-stat-card::before {
          content: ''; position: absolute; top: -20px; right: -20px;
          width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.12);
        }
        .vd-stat-card:hover { transform: translateY(-5px); box-shadow: 0 12px 28px rgba(0,0,0,0.15); }
        .vd-stat-icon {
          background: rgba(255,255,255,0.22); border-radius: 12px;
          width: 46px; height: 46px; display: flex; align-items: center;
          justify-content: center; color: #fff; flex-shrink: 0;
        }
        .vd-stat-body { flex: 1; }
        .vd-stat-label { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.78); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .vd-stat-value { font-size: 1.85rem; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 5px; letter-spacing: -0.5px; }
        .vd-stat-sub { font-size: 0.72rem; color: rgba(255,255,255,0.7); font-weight: 500; display: flex; align-items: center; }
        .vd-stat-badge { position: absolute; top: 12px; right: 14px; background: rgba(255,255,255,0.2); color: #fff; border-radius: 20px; font-size: 0.65rem; font-weight: 700; padding: 2px 9px; letter-spacing: 0.04em; }

        .vd-tabs .nav-tabs { border-bottom: 2px solid #e2ede7; gap: 4px; margin-bottom: 24px; }
        .vd-tabs .nav-tabs .nav-link { border: none !important; border-radius: 10px 10px 0 0; padding: 10px 20px; font-size: 0.85rem; font-weight: 600; color: #6b7280; background: transparent; transition: all 0.2s ease; }
        .vd-tabs .nav-tabs .nav-link:hover { color: #1aab5e; background: #f0fff7; }
        .vd-tabs .nav-tabs .nav-link.active { color: #1aab5e !important; background: #fff !important; border-bottom: 3px solid #1aab5e !important; margin-bottom: -2px; }

        .vd-chart-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 14px rgba(0,0,0,0.07); margin-bottom: 28px; }
        .vd-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .vd-chart-title { font-size: 1rem; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 8px; }
        .vd-chart-title::before { content: ''; display: block; width: 4px; height: 1.1rem; background: linear-gradient(180deg, #1aab5e, #00c16e); border-radius: 4px; }
        .vd-date-filter { display: flex; gap: 6px; }
        .vd-date-btn { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; color: #6b7280; cursor: pointer; transition: all 0.18s; }
        .vd-date-btn:hover, .vd-date-btn.active { background: #1aab5e; color: #fff; border-color: #1aab5e; }

        .vd-table { border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .vd-table table { margin-bottom: 0; background: #fff; }
        .vd-table tbody tr { transition: background 0.16s ease; border-bottom: 1px solid #f0f4f2; }
        .vd-table tbody tr:nth-child(even) { background: #f8fbf9; }
        .vd-table tbody tr:hover { background: #e6f9ef !important; }
        .vd-table tbody td { padding: 13px 16px; font-size: 0.84rem; color: #374151; vertical-align: middle; border: none !important; }

        .vd-txn-id { font-family: 'Courier New', monospace; font-size: 0.75rem; color: #6b7280; background: #f3f4f6; padding: 3px 8px; border-radius: 5px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px; }
        .vd-txn-id:hover { background: #e6f9ef; color: #1aab5e; }
        .vd-revenue { color: #1aab5e; font-weight: 700; }
        .vd-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
        .vd-status-pill.success { background: #e6f9ef; color: #128247; }
        .vd-status-pill.danger  { background: #fff0f0; color: #c0392b; }

        .vd-section-title { display: flex; align-items: center; gap: 10px; font-size: 1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #e6f9ef; }
        .vd-section-title::before { content: ''; display: block; width: 4px; height: 1.1rem; background: linear-gradient(180deg, #1aab5e, #00c16e); border-radius: 4px; }

        .vd-profile-card { background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 14px rgba(0,0,0,0.07); max-width: 540px; margin: 0 auto; }
        .vd-profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #1aab5e, #00c16e); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff; font-weight: 800; margin: 0 auto 20px; }
        .vd-profile-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f4f2; font-size: 0.88rem; }
        .vd-profile-row:last-child { border-bottom: none; }
        .vd-profile-label { color: #6b7280; font-weight: 600; }
        .vd-profile-value { color: #1a1a2e; font-weight: 700; }

        .vd-form-card { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 2px 14px rgba(0,0,0,0.07); }
        .vd-form-card .form-control, .vd-form-card .form-select { border-radius: 9px; border: 1.5px solid #e2e8f0; font-size: 0.88rem; padding: 10px 13px; transition: border-color 0.2s, box-shadow 0.2s; }
        .vd-form-card .form-control:focus, .vd-form-card .form-select:focus { border-color: #1aab5e; box-shadow: 0 0 0 3px rgba(26,171,94,0.12); }
        .vd-form-card .form-label { font-size: 0.8rem; font-weight: 700; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
        .vd-submit-btn { background: linear-gradient(135deg, #1aab5e, #00c16e); border: none; border-radius: 11px; padding: 12px 36px; font-size: 0.9rem; font-weight: 700; color: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(26,171,94,0.3); transition: all 0.22s ease; display: inline-flex; align-items: center; gap: 8px; }
        .vd-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(26,171,94,0.38); }

        .stock-ok    { background: #e6f9ef; color: #128247; font-weight: 700; padding: 3px 10px; border-radius: 10px; font-size: 0.78rem; }
        .stock-low   { background: #fff8e1; color: #6d4c00; font-weight: 700; padding: 3px 10px; border-radius: 10px; font-size: 0.78rem; }
        .stock-empty { background: #fff0f0; color: #c0392b; font-weight: 700; padding: 3px 10px; border-radius: 10px; font-size: 0.78rem; }

        .vd-restriction { background: linear-gradient(135deg, #fff5f5, #ffe8e8); border: 1.5px solid #ffb3b3; border-radius: 14px; padding: 24px 28px; }
      `}</style>

      <Container fluid className="mt-4 px-4 fade-in mb-5 vd-page">

        {/* ── Header Banner ── */}
        <div className="vd-header">
          <div>
            <h2>
              {userInfo?.name}&apos;s Storefront
              <span style={{ display: 'inline-block', marginLeft: 12 }}>
                {stats.isApproved
                  ? <span className="vd-verified-badge"><FaShieldAlt size={11} /> Verified Supplier</span>
                  : <span className="vd-pending-badge"><FaBell size={11} /> Pending Verification</span>}
              </span>
            </h2>
            <p>FreshMart Seller Centre · Welcome back, {userInfo?.name}</p>
          </div>
          <button
            className="vd-quick-action"
            onClick={() => document.querySelector('[data-rr-ui-event-key="add-product"]')?.click()}
          >
            <FaPlus size={13} /> Add New Product
          </button>
        </div>

        {/* ── Alert Chips ── */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <div className="vd-alert-row">
            {lowStockProducts.length > 0 && (
              <div className="vd-alert-chip">
                <FaBell size={12} />
                {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low on stock
              </div>
            )}
            {outOfStockProducts.length > 0 && (
              <div className="vd-alert-chip danger">
                <FaWarehouse size={12} />
                {outOfStockProducts.length} product{outOfStockProducts.length > 1 ? 's' : ''} out of stock
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="vd-tabs">
          <Tabs defaultActiveKey="overview" id="vendor-tabs" className="mb-0">

            {/* ══ Store Analytics ══ */}
            <Tab eventKey="overview" title="📊 Store Analytics">
              <ExcelReportDownloadCard
                authToken={userInfo?.token}
                role="vendor"
              />
              <Row className="mt-4 g-3 mb-4">
                <Col xs={12} sm={6} md={3} lg={2} className="flex-fill">
                  <StatCard title="Listed Products" value={stats.productsCount || 0} icon={FaBoxOpen}
                    gradient="linear-gradient(135deg,#3b82f6,#2563eb)" sub="Active catalog items" badge="CATALOG" />
                </Col>
                <Col xs={12} sm={6} md={3} lg={3} className="flex-fill">
                  <StatCard title="Cumulative Revenue"
                    value={`₹${(stats.totalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    icon={FaRupeeSign} gradient="linear-gradient(135deg,#1aab5e,#00c16e)"
                    sub="+12% vs last month" badge="PRIMARY" />
                </Col>
                <Col xs={12} sm={6} md={3} lg={2} className="flex-fill">
                  <StatCard title="Est. Margin" value={`${calculateProfitMargin()}%`} icon={FaChartLine}
                    gradient="linear-gradient(135deg,#f59e0b,#d97706)" sub="+2.4 pts" badge="YIELD" />
                </Col>
                <Col xs={12} sm={6} md={3} lg={2} className="flex-fill">
                  <StatCard title="Active Shipments" value={stats.pendingOrdersCount || 0} icon={FaTruck}
                    gradient="linear-gradient(135deg,#e11d48,#be123c)" sub="Pending dispatches" badge="LOGISTICS" />
                </Col>
                <Col xs={12} sm={6} md={4} lg={3} className="flex-fill">
                  <StatCard title="Delivered Orders" value={(stats.recentOrders || []).filter(o => o.isDelivered).length + (stats.totalOrdersCount ? stats.totalOrdersCount - stats.pendingOrdersCount : 0)} icon={FaCheckCircle}
                    gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" sub="Completed trips" badge="FULFILLMENT" />
                </Col>
              </Row>

              {/* Chart */}
              <div className="vd-chart-card">
                <div className="vd-chart-header">
                  <div className="vd-chart-title">Revenue vs Profit Trend (Last {chartDays} Days)</div>
                  <div className="vd-date-filter">
                    <Form.Select 
                      size="sm" 
                      value={chartDays} 
                      onChange={(e) => setChartDays(Number(e.target.value))}
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', borderRadius: '8px', border: '1px solid #e5e7eb', width: 'auto', background: '#f3f4f6' }}
                    >
                      <option value={7}>7 Days</option>
                      <option value={30}>30 Days</option>
                      <option value={90}>90 Days</option>
                    </Form.Select>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f2" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.82rem', fontWeight: 600, paddingTop: 12 }} />
                    <Line type="linear" dataKey="Revenue" stroke="#1aab5e" strokeWidth={3}
                      dot={{ r: 5, fill: '#1aab5e', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#1aab5e' }} />
                    <Line type="linear" dataKey="Profit" stroke="#f59e0b" strokeWidth={2.5}
                      strokeDasharray="6 3"
                      dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#f59e0b' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Sales Table */}
              <div className="vd-section-title mt-2">Recent Vendor Sales</div>
              <div className="vd-table">
                <table className="table table-borderless mb-0">
                  <thead>
                    <tr style={{ background: 'linear-gradient(90deg, #0a5c33, #1aab5e)' }}>
                      <th style={thStyle}>🔖 Transaction ID</th>
                      <th style={thStyle}>📅 Order Date</th>
                      <th style={thStyle}>💰 Order Value</th>
                      <th style={thStyle}>💳 Payment Status</th>
                      <th style={thStyle}>🚚 Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders?.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-muted py-4">No orders yet.</td></tr>
                    )}
                    {stats.recentOrders?.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <span className="vd-txn-id">
                            {order._id.substring(0, 12)}... <FaExternalLinkAlt size={9} />
                          </span>
                        </td>
                        <td style={{ color: '#6b7280' }}>{order.createdAt.substring(0, 10)}</td>
                        <td className="vd-revenue">₹{Number(order.totalPrice).toLocaleString('en-IN')}</td>
                        <td>
                          {order.isPaid
                            ? <span className="vd-status-pill success"><FaCheckCircle size={10} /> Paid</span>
                            : <span className="vd-status-pill danger"><FaTimesCircle size={10} /> Unpaid</span>}
                        </td>
                        <td>
                          {order.isDelivered
                            ? <span className="vd-status-pill success"><FaCheckCircle size={10} /> Delivered</span>
                            : <span className="vd-status-pill danger"><FaTimesCircle size={10} /> Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tab>

            {/* ══ Vendor Identity ══ */}
            <Tab eventKey="profile" title="🪪 Vendor Identity">
              <div style={{ padding: '24px 0' }}>
                <div className="vd-profile-card">
                  <div className="vd-profile-avatar">{userInfo?.name?.charAt(0).toUpperCase()}</div>
                  <h4 style={{ textAlign: 'center', fontWeight: 800, marginBottom: 24 }}>
                    {userInfo?.name}
                    <br />
                    <small style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                      FreshMart Vendor Account
                    </small>
                  </h4>
                  <div className="vd-profile-row">
                    <span className="vd-profile-label">Email Address</span>
                    <span className="vd-profile-value">{userInfo?.email}</span>
                  </div>
                  <div className="vd-profile-row">
                    <span className="vd-profile-label">Account Role</span>
                    <span className="vd-profile-value">
                      <span className="vd-status-pill success" style={{ fontSize: '0.78rem' }}>
                        {userInfo?.role?.toUpperCase()}
                      </span>
                    </span>
                  </div>
                  <div className="vd-profile-row">
                    <span className="vd-profile-label">Vendor Status</span>
                    <span className="vd-profile-value">
                      {stats.isApproved
                        ? <span className="vd-status-pill success"><FaShieldAlt size={10} /> Verified</span>
                        : <span className="vd-status-pill danger"><FaBell size={10} /> Pending</span>}
                    </span>
                  </div>
                  <div className="vd-profile-row">
                    <span className="vd-profile-label">Store ID</span>
                    <span className="vd-profile-value" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {userInfo?._id}
                    </span>
                  </div>
                </div>
              </div>
            </Tab>

            {/* ══ My Active Products ══ */}
            <Tab eventKey="my-products" title="📦 My Active Products">
              <div style={{ marginTop: 20 }}>
                <div className="vd-section-title">
                  Catalog Inventory Management
                  <span style={{ marginLeft: 'auto', background: '#e6f9ef', color: '#128247', borderRadius: 20, padding: '2px 12px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {myProducts.length} Products
                  </span>
                </div>
                {myProducts.length === 0 ? (
                  <div style={{ background: '#e6f9ef', border: '1px solid #b2e4cb', borderRadius: 12, padding: '20px 24px', color: '#128247', fontSize: '0.88rem' }}>
                    You currently have no products listed in the marketplace.
                  </div>
                ) : (
                  <div className="vd-table">
                    <table className="table table-borderless mb-0">
                      <thead>
                        <tr style={{ background: 'linear-gradient(90deg, #0a5c33, #1aab5e)' }}>
                          <th style={thStyle}>🔖 ID</th>
                          <th style={thStyle}>📦 Product Name</th>
                          <th style={thStyle}>💰 Price</th>
                          <th style={thStyle}>🏷️ Stock</th>
                          <th style={thStyle}>⚖️ Unit</th>
                          <th style={thStyle}>🏭 Brand</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>⚙️ Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myProducts.map(product => (
                          <tr key={product._id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#9ca3af', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                                {product._id.substring(0, 8)}…
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: '#1a1a2e' }}>{product.name}</td>
                            <td className="vd-revenue">₹{product.pricingOptions?.[0]?.price || 0}</td>
                            <td>
                              <span className={product.pricingOptions?.[0]?.countInStock === 0 ? 'stock-empty' : product.pricingOptions?.[0]?.countInStock <= 5 ? 'stock-low' : 'stock-ok'}>
                                {product.pricingOptions?.[0]?.countInStock === 0 ? 'Out of Stock' : product.pricingOptions?.[0]?.countInStock}
                              </span>
                            </td>
                            <td style={{ color: '#6b7280', fontSize: '0.82rem' }}>{product.pricingOptions?.length || 1} Variant(s)</td>
                            <td style={{ color: '#6b7280', fontSize: '0.82rem' }}>{product.brand}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => toggleEditStock(product._id, product.pricingOptions?.[0]?.countInStock || 0)}
                                id={`edit-stock-${product._id}`}
                                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', cursor: 'pointer', marginRight: 6, transition: 'all 0.18s' }}
                              >
                                <FaEdit style={{ marginRight: 4, marginBottom: 1 }} /> Stock
                              </button>
                              <button
                                onClick={() => deleteProductHandler(product._id, product.name)}
                                id={`delete-${product._id}`}
                                style={{ background: '#fff0f0', border: '1px solid #ffb3b3', borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#c0392b', cursor: 'pointer', transition: 'all 0.18s' }}
                              >
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Tab>

            {/* ══ Delivery Management ══ */}
            <Tab eventKey="delivery" title="🚚 Delivery Management">
              <div style={{ marginTop: 20 }}>
                <div className="vd-section-title">
                  Order Dispatch & Agent Assignment
                </div>
                {ordersToDeliver.filter(o => !o.isDelivered).length === 0 ? (
                  <div style={{ background: '#e6f9ef', border: '1px solid #b2e4cb', borderRadius: 12, padding: '20px 24px', color: '#128247', fontSize: '0.88rem' }}>
                    You have no active orders queued for dispatch right now.
                  </div>
                ) : (
                  <div className="vd-table">
                    <table className="table table-borderless mb-0">
                      <thead>
                        <tr style={{ background: 'linear-gradient(90deg, #0f7c44, #1aab5e)' }}>
                          <th style={thStyle}>🔖 Order ID</th>
                          <th style={thStyle}>📦 Status Overview</th>
                          <th style={thStyle}>🧑‍💼 Fulfillment Target</th>
                          <th style={{ ...thStyle, minWidth: '220px' }}>⚙️ Logistics Controls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersToDeliver.filter(o => !o.isDelivered).map(order => (
                          <tr key={order._id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                                #{order._id.substring(0, 10)}…
                              </span>
                            </td>
                            <td>
                              {order.status === 'Pending' && <Badge bg="secondary">New / Unpaid</Badge>}
                              {order.status === 'Processing' && <Badge bg="warning" text="dark">Payment Confirmed</Badge>}
                              {order.status === 'Packed' && <Badge bg="info">Packed</Badge>}
                              {order.status === 'Assigned' && <Badge bg="primary">Agent Assigned</Badge>}
                              {order.status === 'Picked' && <Badge bg="secondary">In Transit</Badge>}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{order.user?.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                {order.deliveryMethod || 'Awaiting Pack Method'}
                              </div>
                            </td>
                            <td>
                              {/* Workflow Control Box */}
                              <div className="d-flex flex-column gap-2">
                                {!order.isPacked && (
                                  <div className="d-flex gap-2">
                                    <Button size="sm" variant="success" className="fw-bold" onClick={() => packOrderHandler(order._id, 'Self')}>
                                      <FaBox className="me-1"/> Pack (Self Delivery)
                                    </Button>
                                    <Button size="sm" variant="outline-primary" className="fw-bold bg-white" onClick={() => packOrderHandler(order._id, 'Third-Party')}>
                                      <FaBox className="me-1"/> Pack (3rd Party)
                                    </Button>
                                  </div>
                                )}

                                {order.isPacked && order.deliveryMethod === 'Third-Party' && !order.deliveryAgent && (
                                  <div className="d-flex flex-column gap-1">
                                    <div className="d-flex gap-2 align-items-center">
                                      <Form.Select size="sm" id={`agent-select-${order._id}`} style={{ width: '130px', fontSize: '0.75rem' }}>
                                        <option value="">Select Agent...</option>
                                        {agents.filter(a => a.isAvailable).map(a => (
                                          <option key={a._id} value={a._id}>{a.name}</option>
                                        ))}
                                      </Form.Select>
                                      <Button size="sm" variant="primary" onClick={() => assignAgentHandler(order._id, document.getElementById(`agent-select-${order._id}`).value)}>
                                        <FaUserTie className="me-1"/> Assign
                                      </Button>
                                    </div>
                                    {agentAssignmentError && <div className="text-danger mt-1" style={{ fontSize: '0.7rem' }}>{agentAssignmentError}</div>}
                                  </div>
                                )}

                                {order.isPacked && order.deliveryMethod === 'Third-Party' && order.deliveryAgent && (
                                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                                    <FaRoute className="me-1"/> Handed over to Agent.
                                  </div>
                                )}

                                {order.isPacked && order.deliveryMethod === 'Self' && (
                                  <Button size="sm" variant="success" className="fw-bold" onClick={() => markDeliveredHandler(order._id)}>
                                    <FaCheckCircle className="me-1"/> Mark as Delivered
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Tab>

            {/* ══ Deploy New Product ══ */}
            <Tab eventKey="add-product" title="➕ Deploy New Product">
              <div style={{ maxWidth: 860, margin: '24px auto 0' }}>
                {stats.isApproved === false || stats.isApproved === undefined ? (
                  <div className="vd-restriction">
                    <h5 style={{ color: '#c0392b', fontWeight: 800, marginBottom: 10 }}>🔒 Vendor Access Restricted</h5>
                    <p style={{ color: '#7d1010', marginBottom: 0, fontSize: '0.9rem' }}>
                      Your vendor account is pending verification by an Administrator. You cannot list products until your account is approved.
                    </p>
                  </div>
                ) : (
                  <div className="vd-form-card">
                    <div className="vd-section-title" style={{ marginBottom: 24 }}>Deploy New Product to FreshMart</div>
                    <Form onSubmit={addProductHandler}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-4">
                            <Form.Label>Product Name</Form.Label>
                            <Form.Control type="text" required placeholder="e.g. Organic Alphonso Mangoes"
                              value={productDetails.name}
                              onChange={(e) => setProductDetails({ ...productDetails, name: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-4">
                            <Form.Label>Retail Price (₹)</Form.Label>
                            <Form.Control type="number" required min="1" placeholder="0.00"
                              value={productDetails.price}
                              onChange={(e) => setProductDetails({ ...productDetails, price: Number(e.target.value) })} />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-4">
                            <Form.Label>Cost Price (â‚¹)</Form.Label>
                            <Form.Control type="number" min="0" placeholder="0.00"
                              value={productDetails.costPrice}
                              onChange={(e) => setProductDetails({ ...productDetails, costPrice: Number(e.target.value) })} />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-4">
                            <Form.Label>Category</Form.Label>
                            <Form.Select required value={productDetails.category}
                              onChange={(e) => setProductDetails({ ...productDetails, category: e.target.value })}>
                              <option value="">Select a Category</option>
                              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group className="mb-4">
                            <Form.Label>Brand</Form.Label>
                            <Form.Control type="text" required value={productDetails.brand}
                              onChange={(e) => setProductDetails({ ...productDetails, brand: e.target.value })} />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group className="mb-4">
                            <Form.Label>Stock Quantity</Form.Label>
                            <Form.Control type="number" required min="0" value={productDetails.countInStock}
                              onChange={(e) => setProductDetails({ ...productDetails, countInStock: Number(e.target.value) })} />
                          </Form.Group>
                        </Col>
                        <Col md={2}>
                          <Form.Group className="mb-4">
                            <Form.Label>Unit</Form.Label>
                            <Form.Select value={productDetails.unit}
                              onChange={(e) => setProductDetails({ ...productDetails, unit: e.target.value })}>
                              <option value="kilogram">kilogram</option>
                              <option value="litre">litre</option>
                              <option value="pieces">pieces</option>
                              <option value="bundle">bundle</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Form.Group className="mb-4">
                        <Form.Label>Upload Product Image</Form.Label>
                        <Form.Control type="file" required={!productDetails.image} onChange={uploadFileHandler} />
                        {productDetails.image && (
                          <div style={{ marginTop: 8, color: '#1aab5e', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FaCheckCircle size={12} /> Image uploaded successfully.
                          </div>
                        )}
                      </Form.Group>
                      <Form.Group className="mb-5">
                        <Form.Label>Product Description</Form.Label>
                        <Form.Control as="textarea" rows={4} required
                          placeholder="Describe your product — freshness, origin, storage tips..."
                          value={productDetails.description}
                          onChange={(e) => setProductDetails({ ...productDetails, description: e.target.value })} />
                      </Form.Group>
                      <button type="submit" className="vd-submit-btn" id="submit-product-btn">
                        <FaPlus size={13} /> Publish to Marketplace
                      </button>
                    </Form>
                  </div>
                )}
              </div>
            </Tab>

          </Tabs>
        </div>
      </Container>

      {/* ── Stock Update Modal ── */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <Modal.Title style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1a1a2e' }}>
            Update Inventory Stock
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>New Stock Quantity</Form.Label>
            <Form.Control 
              type="number" 
              value={editStockValue}
              onChange={(e) => setEditStockValue(e.target.value)}
              min="0"
              style={{ borderRadius: '8px', border: '1.5px solid #e2e8f0', padding: '10px 14px' }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: 'none', paddingTop: 0 }}>
          <Button variant="light" onClick={() => setShowStockModal(false)} style={{ borderRadius: '8px', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button variant="success" onClick={() => saveStockHandler(editStockId)} style={{ borderRadius: '8px', fontWeight: 600, background: '#1aab5e', border: 'none' }}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default VendorDashboard;
