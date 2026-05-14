import React, { useCallback, useEffect, useState } from "react";
import { Container, Row, Col, Form, Tab, Tabs, Button } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaUsers, FaBoxOpen, FaShoppingCart, FaChartLine,
  FaArrowUp, FaArrowDown, FaCheckCircle, FaTimesCircle,
  FaStore, FaExternalLinkAlt, FaShieldAlt, FaUserCheck, FaUserMinus,
  FaPlus, FaTags, FaTruck, FaIdCard,
} from "react-icons/fa";
import { confirmAction, notifyError, notifySuccess } from "../utils/notify";
import AdminCategories from "./AdminCategories";
import ExcelReportDownloadCard from "../components/ExcelReportDownloadCard";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

/* ── Shared inline th style ── */
const thStyle = {
  padding: "13px 16px",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#fff",
  border: "none",
  whiteSpace: "nowrap",
  background: "transparent",
};

/* ── Custom chart tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: "10px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", fontSize: "0.82rem",
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#374151" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: "2px 0", color: p.color, fontWeight: 600 }}>
          {p.name}: ₹{Number(p.value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
};

/* ── Stat Card ── */
const StatCard = ({ title, value, icon: Icon, gradient, delta, deltaUp, sub }) => (
  <div className="ad-stat-card" style={{ background: gradient }}>
    <div className="ad-stat-icon"><Icon size={20} /></div>
    <div className="ad-stat-body">
      <div className="ad-stat-label">{title}</div>
      <div className="ad-stat-value">{value}</div>
      {sub && <div className="ad-stat-sub">{sub}</div>}
    </div>
    {delta && (
      <div className="ad-stat-delta" style={{ color: deltaUp ? "#a7f3d0" : "#fca5a5" }}>
        {deltaUp ? <FaArrowUp size={9} /> : <FaArrowDown size={9} />}
        {" "}{delta}
      </div>
    )}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryImage, setCategoryImage] = useState("");
  const [reportFilter, setReportFilter] = useState("monthly");

  // Fleet Management States
  const [agents, setAgents] = useState([]);
  const [agentForm, setAgentForm] = useState({ name: "", email: "", password: "", phone: "" });

  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/dashboard/admin", {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setStats(data);
    } catch (error) { console.error(error); }
  }, [userInfo?.token]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/users", {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setUsers(data);
    } catch (error) { console.error(error); }
  }, [userInfo?.token]);

  const fetchAgents = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/delivery", {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setAgents(data);
    } catch (error) { console.error(error); }
  }, [userInfo?.token]);

  useEffect(() => {
    if (!userInfo || userInfo.role !== "admin") {
      navigate("/login");
    } else {
      fetchStats();
      fetchUsers();
      fetchAgents();
    }
  }, [fetchAgents, fetchStats, fetchUsers, navigate, userInfo]);

  const getHeaders = () => ({ headers: { Authorization: `Bearer ${userInfo.token}` } });

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const { data } = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${userInfo.token}` },
      });
      setCategoryImage(data.image);
    } catch (error) {
      notifyError("Error uploading image: " + (error.response?.data?.message || error.message));
    }
  };

  const deactivateHandler = async (id) => {
    const result = await confirmAction('Update Status', 'Are you sure you want to change this user\'s status?');
    if (result.isConfirmed) {
      try {
        await axios.put(`/api/users/${id}/deactivate`, {}, getHeaders());
        fetchUsers();
        notifySuccess("User status updated successfully.");
      } catch (err) {
        notifyError("Failed to update status: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const verifyVendorHandler = async (id) => {
    const result = await confirmAction('Verify Vendor', 'Are you sure you want to change this vendor\'s verification status?');
    if (result.isConfirmed) {
      try {
        await axios.put(`/api/users/${id}/verify`, {}, getHeaders());
        fetchUsers();
        notifySuccess("Vendor status updated successfully.");
      } catch (err) {
        notifyError("Failed to verify vendor: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const createCategoryHandler = async (e) => {
    e.preventDefault();
    if (!categoryName) return;
    try {
      await axios.post("/api/categories", { name: categoryName, image: categoryImage }, getHeaders());
      notifySuccess("Category created successfully!");
      setCategoryName("");
      setCategoryImage("");
    } catch (err) {
      notifyError("Failed to create category: " + (err.response?.data?.message || err.message));
    }
  };

  const createAgentHandler = async (e) => {
    e.preventDefault();
    if (!agentForm.name || !agentForm.email || !agentForm.password || !agentForm.phone) return;
    try {
      await axios.post("/api/delivery", agentForm, getHeaders());
      notifySuccess("Delivery Agent correctly registered to Fleet!");
      setAgentForm({ name: "", email: "", password: "", phone: "" });
      fetchAgents();
    } catch (err) {
      notifyError("Failed to onboard agent: " + (err.response?.data?.message || err.message));
    }
  };

  const getFilteredSales = () => {
    if (!stats.salesByDate) return [];
    const now = new Date();
    let diffDays = 30;
    if (reportFilter === "daily") diffDays = 1;
    else if (reportFilter === "weekly") diffDays = 7;
    else if (reportFilter === "quarterly") diffDays = 90;
    else if (reportFilter === "6months") diffDays = 180;
    else if (reportFilter === "yearly") diffDays = 365;
    return stats.salesByDate
      .filter((d) => {
        const dDays = Math.ceil(Math.abs(now - new Date(d._id)) / (1000 * 60 * 60 * 24));
        return dDays <= diffDays;
      })
      .map((d) => ({ date: d._id, Sales: d.sales, Profit: d.sales * 0.25 }));
  };

  return (
    <>
      <style>{`
        /* ── PAGE ── */
        .ad-page { background: #f0f2f5; min-height: 100vh; }

        /* ── HEADER ── */
        .ad-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f4c75 100%);
          border-radius: 18px; padding: 26px 32px; color: #fff;
          margin-bottom: 28px; box-shadow: 0 6px 24px rgba(15,23,42,0.3);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .ad-header h2 {
          font-size: 1.5rem; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px;
        }
        .ad-header p { margin: 0; font-size: 0.85rem; opacity: 0.7; }
        .ad-header-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25);
          border-radius: 20px; padding: 4px 14px; font-size: 0.75rem; font-weight: 700; color: #fff;
        }

        /* ── STAT CARDS ── */
        .ad-stat-card {
          border-radius: 16px; padding: 22px 20px 18px;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 3px 14px rgba(0,0,0,0.10);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          position: relative; overflow: hidden; margin-bottom: 20px; min-height: 116px;
        }
        .ad-stat-card::after {
          content: ''; position: absolute; bottom: -18px; right: -18px;
          width: 70px; height: 70px; border-radius: 50%; background: rgba(255,255,255,0.10);
        }
        .ad-stat-card:hover { transform: translateY(-5px); box-shadow: 0 14px 30px rgba(0,0,0,0.16); }
        .ad-stat-icon {
          background: rgba(255,255,255,0.20); border-radius: 12px; width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0;
        }
        .ad-stat-body { flex: 1; }
        .ad-stat-label { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.72); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .ad-stat-value { font-size: 1.8rem; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 4px; letter-spacing: -0.5px; }
        .ad-stat-sub   { font-size: 0.7rem; color: rgba(255,255,255,0.6); font-weight: 500; }
        .ad-stat-delta { position: absolute; top: 12px; right: 12px; font-size: 0.68rem; font-weight: 700; display: flex; align-items: center; gap: 3px; }

        /* ── TABS ── */
        .ad-tabs .nav-tabs { border-bottom: 2px solid #e2e8f0; gap: 4px; margin-bottom: 24px; }
        .ad-tabs .nav-tabs .nav-link { border: none !important; border-radius: 10px 10px 0 0; padding: 10px 22px; font-size: 0.85rem; font-weight: 600; color: #6b7280; background: transparent; transition: all 0.2s ease; }
        .ad-tabs .nav-tabs .nav-link:hover { color: #1e40af; background: #eff6ff; }
        .ad-tabs .nav-tabs .nav-link.active { color: #1e40af !important; background: #fff !important; border-bottom: 3px solid #1e40af !important; margin-bottom: -2px; }

        /* ── CHART CARDS ── */
        .ad-chart-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 14px rgba(0,0,0,0.07); }
        .ad-chart-title { font-size: 0.95rem; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        .ad-chart-title::before { content: ''; display: block; width: 4px; height: 1.1rem; background: linear-gradient(180deg, #1e40af, #3b82f6); border-radius: 4px; }

        /* ── TABLES ── */
        .ad-table-wrap { border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .ad-table-wrap table { margin-bottom: 0; background: #fff; }
        .ad-table-wrap thead tr { background: linear-gradient(90deg, #0f172a, #1e3a5f); }
        .ad-table-wrap tbody tr { transition: background 0.15s; border-bottom: 1px solid #f1f5f9; }
        .ad-table-wrap tbody tr:nth-child(even) { background: #f8fafc; }
        .ad-table-wrap tbody tr:hover { background: #eff6ff !important; }
        .ad-table-wrap tbody td { padding: 13px 16px; font-size: 0.84rem; color: #374151; vertical-align: middle; border: none !important; }

        .ad-txn-id { font-family: 'Courier New', monospace; font-size: 0.73rem; color: #64748b; background: #f1f5f9; padding: 3px 8px; border-radius: 5px; display: inline-block; }
        .ad-amount  { color: #16a34a; font-weight: 700; }
        .ad-badge-paid       { background: #dcfce7; color: #15803d; border-radius: 20px; padding: 3px 12px; font-size: 0.7rem; font-weight: 700; display: inline-block; }
        .ad-badge-processing { background: #fef9c3; color: #92400e; border-radius: 20px; padding: 3px 12px; font-size: 0.7rem; font-weight: 700; display: inline-block; }

        .ad-role-admin  { background: #fee2e2; color: #991b1b; border-radius: 10px; padding: 2px 10px; font-size: 0.7rem; font-weight: 700; }
        .ad-role-vendor { background: #fef9c3; color: #854d0e; border-radius: 10px; padding: 2px 10px; font-size: 0.7rem; font-weight: 700; }
        .ad-role-user   { background: #dbeafe; color: #1e40af; border-radius: 10px; padding: 2px 10px; font-size: 0.7rem; font-weight: 700; }

        .ad-action-btn { border-radius: 8px; padding: 5px 14px; font-size: 0.75rem; font-weight: 700; cursor: pointer; border: 1.5px solid; transition: all 0.18s; margin: 0 3px; }
        .ad-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.12); }
        .ad-btn-deactivate { background: #fff0f0; border-color: #fca5a5; color: #c0392b; }
        .ad-btn-reactivate { background: #f0fff4; border-color: #86efac; color: #15803d; }
        .ad-btn-verify     { background: #eff6ff; border-color: #93c5fd; color: #1e40af; }
        .ad-btn-revoke     { background: #f5f5f5; border-color: #d1d5db; color: #6b7280; }

        /* ── SECTION TITLE ── */
        .ad-section-title { display: flex; align-items: center; gap: 10px; font-size: 1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
        .ad-section-title::before { content: ''; display: block; width: 4px; height: 1.1rem; background: linear-gradient(180deg, #1e40af, #3b82f6); border-radius: 4px; }

        /* ── FORM CARD ── */
        .ad-form-card { background: #fff; border-radius: 16px; padding: 28px 32px; box-shadow: 0 2px 14px rgba(0,0,0,0.07); max-width: 540px; }
        .ad-form-card .form-control, .ad-form-card .form-select { border-radius: 9px; border: 1.5px solid #e2e8f0; font-size: 0.88rem; padding: 10px 13px; transition: border-color 0.2s, box-shadow 0.2s; }
        .ad-form-card .form-control:focus, .ad-form-card .form-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .ad-form-card .form-label { font-size: 0.78rem; font-weight: 700; color: #4b5563; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
        .ad-submit-btn { background: linear-gradient(135deg, #1e40af, #3b82f6); border: none; border-radius: 10px; padding: 11px 32px; font-size: 0.88rem; font-weight: 700; color: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(59,130,246,0.3); transition: all 0.22s; display: inline-flex; align-items: center; gap: 8px; width: 100%; justify-content: center; }
        .ad-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(59,130,246,0.35); }

        /* ── FILTER SELECT ── */
        .ad-filter-select { border-radius: 8px; border: 1.5px solid #e2e8f0; font-size: 0.8rem; font-weight: 600; padding: 6px 10px; color: #374151; background: #f8fafc; min-width: 180px; }
        .ad-filter-select:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
      `}</style>

      <Container fluid className="mt-4 px-4 fade-in mb-5 ad-page">

        {/* ── Header ── */}
        <div className="ad-header">
          <div>
            <h2>
              Admin Control Panel
              <span style={{ display: "inline-block", marginLeft: 12 }}>
                <span className="ad-header-badge"><FaShieldAlt size={10} /> Superuser</span>
              </span>
            </h2>
            <p>FreshMart Platform · System-wide analytics and management</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>Signed in as</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>{userInfo?.name}</div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="ad-tabs">
          <Tabs defaultActiveKey="overview" id="admin-tabs" className="mb-0">

            {/* ══ Financial Overview ══ */}
            <Tab eventKey="overview" title="📊 Financial Overview">

              <ExcelReportDownloadCard
                authToken={userInfo?.token}
                role="admin"
                vendorOptions={users.filter((user) => user.role === "vendor")}
              />

              {/* Stat Cards */}
              <Row className="mt-4 g-3">
                <Col xs={12} sm={6} md={3}>
                  <StatCard
                    title="Total Users"
                    value={stats.usersCount || 0}
                    icon={FaUsers}
                    gradient="linear-gradient(135deg,#1e40af,#3b82f6)"
                    delta="8.4% this month"
                    deltaUp={true}
                    sub="Registered accounts"
                  />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <StatCard
                    title="Mapped Products"
                    value={stats.productsCount || 0}
                    icon={FaBoxOpen}
                    gradient="linear-gradient(135deg,#15803d,#22c55e)"
                    delta="12 new today"
                    deltaUp={true}
                    sub="Active listings"
                  />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <StatCard
                    title="Gross Orders"
                    value={stats.ordersCount || 0}
                    icon={FaShoppingCart}
                    gradient="linear-gradient(135deg,#b45309,#f59e0b)"
                    delta="3.1% vs last week"
                    deltaUp={false}
                    sub="Total transactions"
                  />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <StatCard
                    title="System Net Sales"
                    value={`₹${(stats.totalSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                    icon={FaChartLine}
                    gradient="linear-gradient(135deg,#9f1239,#e11d48)"
                    delta="+18.6% revenue"
                    deltaUp={true}
                    sub="Platform lifetime GMV"
                  />
                </Col>
              </Row>

              {/* Charts Row */}
              <Row className="g-3 mt-1">
                <Col md={8}>
                  <div className="ad-chart-card h-100">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                      <div className="ad-chart-title" style={{ marginBottom: 0 }}>
                        Sales vs Profit (Last 30 Days)
                      </div>
                      <select
                        className="ad-filter-select"
                        value={reportFilter}
                        onChange={(e) => setReportFilter(e.target.value)}
                      >
                        <option value="daily">Daily (1 Day)</option>
                        <option value="weekly">Weekly (7 Days)</option>
                        <option value="monthly">Monthly (30 Days)</option>
                        <option value="quarterly">Quarterly (3 Months)</option>
                        <option value="6months">Bi-Annual (6 Months)</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getFilteredSales()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: "0.82rem", fontWeight: 600, paddingTop: 12 }} />
                        <Line type="linear" dataKey="Sales" stroke="#16a34a" strokeWidth={3}
                          dot={{ r: 5, fill: "#16a34a", strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 7 }} />
                        <Line type="linear" dataKey="Profit" stroke="#3b82f6" strokeWidth={2.5}
                          strokeDasharray="5 3"
                          dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="ad-chart-card h-100">
                    <div className="ad-chart-title">Vendor Contribution / Volume</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={stats.vendorSales || []}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="sales" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Sales (₹)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
              </Row>

              {/* Recent Transactions Table */}
              <div className="ad-section-title mt-4">Recent Transaction Log</div>
              <div className="ad-table-wrap">
                <table className="table table-borderless mb-0">
                  <thead>
                    <tr>
                      <th style={thStyle}>🔖 Order ID</th>
                      <th style={thStyle}>👤 Customer</th>
                      <th style={thStyle}>💰 Amount</th>
                      <th style={thStyle}>✅ Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders?.map((order, i) => (
                      <tr key={i}>
                        <td>
                          <span className="ad-txn-id">{order._id.substring(0, 16)}…</span>
                        </td>
                        <td style={{ fontWeight: 600, color: "#1e293b" }}>{order.user?.name}</td>
                        <td className="ad-amount">₹{Number(order.totalPrice).toLocaleString("en-IN")}</td>
                        <td>
                          {order.isPaid
                            ? <span className="ad-badge-paid"><FaCheckCircle size={9} style={{ marginRight: 4 }} />Paid</span>
                            : <span className="ad-badge-processing">⏳ Processing</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tab>

            {/* ══ User Access Control ══ */}
            <Tab eventKey="users" title="👥 User Access Control">
              <div style={{ marginTop: 20 }}>
                <div className="ad-section-title">
                  Platform User Management
                  <span style={{ marginLeft: "auto", background: "#dbeafe", color: "#1e40af", borderRadius: 20, padding: "2px 12px", fontSize: "0.7rem", fontWeight: 700 }}>
                    {users.length} Users
                  </span>
                </div>
                <div className="ad-table-wrap">
                  <table className="table table-borderless mb-0">
                    <thead>
                      <tr>
                        <th style={thStyle}>User ID</th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Email</th>
                        <th style={thStyle}>Role</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Vendor Accred.</th>
                        <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td>
                            <span className="ad-txn-id">{user._id.substring(0, 10)}…</span>
                          </td>
                          <td style={{ fontWeight: 600, color: "#1e293b" }}>{user.name}</td>
                          <td style={{ color: "#64748b", fontSize: "0.82rem" }}>{user.email}</td>
                          <td>
                            <span className={
                              user.role === "admin" ? "ad-role-admin"
                                : user.role === "vendor" ? "ad-role-vendor"
                                  : "ad-role-user"
                            }>
                              {user.role.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {user.isActive
                              ? <span style={{ color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.8rem", fontWeight: 600 }}><FaCheckCircle size={12} /> Active</span>
                              : <span style={{ color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.8rem", fontWeight: 600 }}><FaTimesCircle size={12} /> Inactive</span>
                            }
                          </td>
                          <td>
                            {user.role === "vendor"
                              ? (user.vendorDetails?.isApproved
                                ? <span style={{ color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.8rem", fontWeight: 600 }}><FaUserCheck size={12} /> Verified</span>
                                : <span style={{ color: "#e11d48", display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.8rem", fontWeight: 600 }}><FaUserMinus size={12} /> Pending</span>)
                              : <span style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>—</span>
                            }
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {userInfo._id !== user._id && (
                              <button
                                className={`ad-action-btn ${user.isActive ? "ad-btn-deactivate" : "ad-btn-reactivate"}`}
                                onClick={() => deactivateHandler(user._id)}
                                id={`toggle-user-${user._id}`}
                              >
                                {user.isActive ? "Deactivate" : "Reactivate"}
                              </button>
                            )}
                            {user.role === "vendor" && (
                              <button
                                className={`ad-action-btn ${user.vendorDetails?.isApproved ? "ad-btn-revoke" : "ad-btn-verify"}`}
                                onClick={() => verifyVendorHandler(user._id)}
                                id={`verify-vendor-${user._id}`}
                              >
                                {user.vendorDetails?.isApproved
                                  ? <><FaStore size={10} style={{ marginRight: 4 }} />Revoke</>
                                  : <><FaShieldAlt size={10} style={{ marginRight: 4 }} />Verify</>}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Tab>

            {/* ══ Store Categories ══ */}
            <Tab eventKey="categories" title="🏷️ Store Categories">
              <div style={{ padding: "24px 0" }}>
                <AdminCategories />
              </div>
            </Tab>

            {/* ══ Fleet Management ══ */}
            <Tab eventKey="fleet" title="🚚 Fleet Management">
              <Row className="mt-4 gx-5">
                <Col md={5}>
                  <div className="ad-section-title">Register New Agent</div>
                  <div className="ad-form-card" style={{ maxWidth: "100%" }}>
                    <Form onSubmit={createAgentHandler}>
                      <Form.Group className="mb-3">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control type="text" placeholder="Driver's Name" required value={agentForm.name} onChange={(e) => setAgentForm({...agentForm, name: e.target.value})} />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control type="email" placeholder="example@logistics.com" required value={agentForm.email} onChange={(e) => setAgentForm({...agentForm, email: e.target.value})} />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Mobile Phone</Form.Label>
                        <Form.Control type="text" placeholder="+1..." required value={agentForm.phone} onChange={(e) => setAgentForm({...agentForm, phone: e.target.value})} />
                      </Form.Group>
                      <Form.Group className="mb-4">
                        <Form.Label>Initial Password</Form.Label>
                        <Form.Control type="password" required value={agentForm.password} onChange={(e) => setAgentForm({...agentForm, password: e.target.value})} />
                      </Form.Group>
                      <button type="submit" className="ad-submit-btn">
                        <FaIdCard size={14} /> Onboard Delivery Agent
                      </button>
                    </Form>
                  </div>
                </Col>
                <Col md={7}>
                  <div className="ad-section-title">
                    Active Delivery Agents 
                    <span style={{ marginLeft: "auto", background: "#fef9c3", color: "#854d0e", borderRadius: 20, padding: "2px 12px", fontSize: "0.7rem", fontWeight: 700 }}>
                      {agents.length} Online
                    </span>
                  </div>
                  <div className="ad-table-wrap">
                    <table className="table table-borderless mb-0">
                      <thead>
                        <tr>
                          <th style={thStyle}>Agent Name</th>
                          <th style={thStyle}>Contact</th>
                          <th style={thStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.map((agent) => (
                          <tr key={agent._id}>
                            <td style={{ fontWeight: 700, color: "#1e293b" }}><FaTruck size={12} className="me-2 text-primary" />{agent.name}</td>
                            <td>
                              <div style={{ fontSize: "0.8rem", color: "#374151" }}>{agent.phone}</div>
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{agent.email}</div>
                            </td>
                            <td>
                              {agent.isAvailable 
                                ? <span style={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: 700 }}><FaCheckCircle className="me-1"/> Available</span>
                                : <span style={{ color: "#f59e0b", fontSize: "0.75rem", fontWeight: 700 }}><FaTimesCircle className="me-1"/> Busy</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Col>
              </Row>
            </Tab>

          </Tabs>
        </div>
      </Container>
    </>
  );
};

export default AdminDashboard;
