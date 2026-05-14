import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Row, Col, Form, Card, Pagination, Modal } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaTruck, FaClock, FaShoppingBag, FaRupeeSign, FaEye, FaDownload, FaSearch, FaFilter, FaSort, FaRoute, FaStore } from 'react-icons/fa';
import { notifyError } from '../utils/notify';

const StatCard = ({ title, value, icon: Icon, gradient, sub }) => (
  <div className="vd-stat-card user-stat-card" style={{ background: gradient }}>
    <div className="vd-stat-icon"><Icon size={22} /></div>
    <div className="vd-stat-body">
      <div className="vd-stat-label">{title}</div>
      <div className="vd-stat-value">{value}</div>
      {sub && (
        <div className="vd-stat-sub">
          {sub}
        </div>
      )}
    </div>
  </div>
);

const UserDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('DateLatest');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Tracking State
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackOrder, setTrackOrder] = useState(null);

  const { userInfo } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
    } else {
      const fetchOrders = async () => {
        try {
          const { data } = await axios.get('/api/orders/mine', {
            headers: { Authorization: `Bearer ${userInfo.token}` }
          });
          setOrders(data);
          setLoading(false);
        } catch (error) {
          console.error(error);
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [userInfo, navigate]);

  // Derived Summary Stats
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((acc, order) => acc + (order.isPaid ? order.totalPrice : 0), 0);
  const pendingCount = orders.filter(o => !o.isDelivered).length;

  // Processed Orders (Filter -> Search -> Sort)
  let processedOrders = [...orders];

  // Filtering
  if (filterType === 'Paid') {
    processedOrders = processedOrders.filter(o => o.isPaid);
  } else if (filterType === 'Pending') {
    processedOrders = processedOrders.filter(o => !o.isDelivered);
  } else if (filterType === 'Delivered') {
    processedOrders = processedOrders.filter(o => o.isDelivered);
  }

  // Searching
  if (searchTerm) {
    processedOrders = processedOrders.filter(o => o._id.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  // Sorting
  processedOrders.sort((a, b) => {
    if (sortBy === 'DateLatest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'DateOldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'AmountHigh') return b.totalPrice - a.totalPrice;
    if (sortBy === 'AmountLow') return a.totalPrice - b.totalPrice;
    return 0;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = processedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedOrders.length / itemsPerPage);

  const downloadInvoice = async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      notifyError('Failed to download invoice: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <>
      <style>{`
        .user-dashboard-page { background-color: #f1f5f4; min-height: 100vh; padding-bottom: 40px; }
        
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
        
        .modern-table-container { background: #fff; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; }
        .modern-table-header { padding: 24px 24px 0 24px; }
        .modern-table-wrapper { border-radius: 12px; overflow: hidden; margin: 0 24px 24px 24px; border: 1px solid #f0f4f2; }
        
        .modern-table { margin-bottom: 0; }
        .modern-table thead tr { background: linear-gradient(90deg, #0a5c33, #1aab5e) !important; color: #fff; }
        .modern-table th { background-color: transparent !important; color: #fff !important; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px 16px; border: none !important; white-space: nowrap; }
        .modern-table td { padding: 16px 16px; vertical-align: middle; color: #374151; font-size: 0.9rem; border-bottom: 1px solid #f0f4f2; }
        .modern-table tbody tr { transition: background-color 0.2s ease; }
        .modern-table tbody tr:hover { background-color: #f0fff7 !important; }
        
        .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-pill.success { background-color: #e6f9ef; color: #128247; }
        .status-pill.danger { background-color: #fff0f0; color: #c0392b; }
        .status-pill.warning { background-color: #fff8e1; color: #6d4c00; }
        .status-pill.info { background-color: #eff6ff; color: #1e429f; }
        
        .action-btn { transition: all 0.2s ease; border-radius: 8px; font-weight: 600; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; }
        .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(26,171,94,0.25); color: #fff; background-color: #148f4b !important; }
        
        .filter-control { border-radius: 10px; border: 1.5px solid #e5e7eb; padding: 10px 16px; font-size: 0.9rem; font-weight: 600; color: #4b5563; transition: all 0.2s; box-shadow: none !important; background-color: #f9fafb; }
        .filter-control:focus { border-color: #1aab5e; box-shadow: 0 0 0 3px rgba(26,171,94,0.1) !important; background-color: #fff; }
        
        .vendor-groups-wrapper {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          padding-bottom: 16px;
        }
        @media (max-width: 991px) {
          .vendor-groups-wrapper { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 767px) {
          .vendor-groups-wrapper { grid-template-columns: 1fr; }
        }
        
        .vendor-column {
          min-width: 250px;
          flex: 0 0 250px;
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e5e7eb;
        }

        .vertical-timeline { 
          display: flex; 
          flex-direction: column; 
          position: relative;
          gap: 20px;
          padding-left: 12px;
        }
        .vertical-timeline::before {
          content: ''; 
          position: absolute; 
          left: 27px; /* 12px padding + 15px half-circle */
          top: 15px; 
          bottom: 15px;
          width: 2px;
          background: #e5e7eb; 
          z-index: 1;
        }
        .v-timeline-step { 
          display: flex; 
          flex-direction: row; 
          align-items: flex-start; 
          gap: 12px; 
          position: relative; 
          z-index: 2; 
        }
        .v-timeline-icon {
          width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0; background: #fff; border: 2px solid #e5e7eb; color: #9ca3af; transition: all 0.3s;
        }
        .v-timeline-step.completed .v-timeline-icon { background: #1aab5e; border-color: #1aab5e; color: #fff; }
        .v-timeline-step.active .v-timeline-icon { background: #3b82f6; border-color: #3b82f6; color: #fff; box-shadow: 0 0 0 4px rgba(59,130,246,0.2); }
        .v-timeline-content h5 { font-size: 0.85rem; font-weight: 700; color: #1f2937; margin: 0 0 4px; }
        .v-timeline-content p { font-size: 0.72rem; color: #6b7280; margin: 0; line-height: 1.3; }
      `}</style>
      
      <div className="user-dashboard-page">
        <Container fluid className="pt-4 px-4 fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
            <h2 className="mb-0 fw-bold" style={{ color: '#1a1a2e' }}>My Order History</h2>
          </div>

          {loading ? (
            <h4 className="text-center text-muted my-5">Loading your orders...</h4>
          ) : (
            <>
              {/* Summary Metrics */}
              <Row>
                <Col xs={12} sm={4}>
                  <StatCard title="Total Orders" value={totalOrders} icon={FaShoppingBag} 
                    gradient="linear-gradient(135deg,#3b82f6,#2563eb)" sub="Lifetime historical" />
                </Col>
                <Col xs={12} sm={4}>
                  <StatCard title="Amount Spent" value={`₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} icon={FaRupeeSign} 
                    gradient="linear-gradient(135deg,#1aab5e,#00c16e)" sub="Total gross value" />
                </Col>
                <Col xs={12} sm={4}>
                  <StatCard title="Pending Shipments" value={pendingCount} icon={FaClock} 
                    gradient="linear-gradient(135deg,#f59e0b,#d97706)" sub="Awaiting delivery" />
                </Col>
              </Row>

              <div className="modern-table-container mt-2">
                {/* Filters & Search */}
                <div className="modern-table-header">
                  <Row className="mb-4 g-3 align-items-center">
                    <Col md={4} lg={5}>
                      <div className="position-relative">
                        <FaSearch className="position-absolute text-muted" style={{ left: '16px', top: '15px' }} />
                        <Form.Control 
                          type="text" 
                          placeholder="Search by Order ID..." 
                          className="filter-control ps-5"
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                      </div>
                    </Col>
                    <Col md={4} lg={3} className="ms-auto">
                      <div className="d-flex align-items-center gap-2">
                        <FaFilter className="text-muted" />
                        <Form.Select className="filter-control py-2" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                          <option value="All">All Statuses</option>
                          <option value="Paid">Paid Orders</option>
                          <option value="Pending">Pending Delivery</option>
                          <option value="Delivered">Delivered</option>
                        </Form.Select>
                      </div>
                    </Col>
                    <Col md={4} lg={3}>
                      <div className="d-flex align-items-center gap-2">
                        <FaSort className="text-muted" />
                        <Form.Select className="filter-control py-2" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}>
                          <option value="DateLatest">Latest First</option>
                          <option value="DateOldest">Oldest First</option>
                          <option value="AmountHigh">Amount (High to Low)</option>
                          <option value="AmountLow">Amount (Low to High)</option>
                        </Form.Select>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Orders Table */}
                {currentOrders.length === 0 ? (
                  <div className="text-center py-5">
                    <h5 className="text-muted mb-0">No orders match your criteria.</h5>
                  </div>
                ) : (
                  <div className="modern-table-wrapper">
                    <Table hover borderless className="modern-table mb-0">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date Placed</th>
                          <th>Total Amount</th>
                          <th>Payment Status</th>
                          <th>Delivery Status</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentOrders.map((order) => (
                          <tr key={order._id}>
                            <td>
                              <span className="fw-bold text-secondary" style={{ fontFamily: 'monospace' }}>
                                #{order._id.substring(0, 10)}...
                              </span>
                            </td>
                            <td>{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td className="fw-bold text-success">
                              ₹{order.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td>
                              {order.isPaid ? (
                                <span className="status-pill success"><FaCheckCircle /> Paid</span>
                              ) : (
                                <span className="status-pill danger"><FaTimesCircle /> Pending</span>
                              )}
                            </td>
                            <td>
                              {order.isDelivered ? (
                                <span className="status-pill info"><FaTruck /> Delivered</span>
                              ) : (
                                <span className="status-pill warning"><FaClock /> Processing</span>
                              )}
                            </td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <LinkContainer to={`/order/${order._id}`}>
                                  <Button variant="success" className="action-btn text-white" style={{ background: '#1aab5e', border: 'none' }}>
                                    <FaEye /> Details
                                  </Button>
                                </LinkContainer>
                                <Button 
                                  variant="primary" 
                                  className="action-btn text-white shadow-sm" 
                                  style={{ background: '#3b82f6', border: 'none' }} 
                                  onClick={() => { setTrackOrder(order); setShowTrackModal(true); }}
                                >
                                  <FaRoute /> Track
                                </Button>
                                {order.isPaid && (
                                  <Button variant="light" className="action-btn border text-secondary shadow-sm" onClick={() => downloadInvoice(order._id)}>
                                    <FaDownload />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-end mb-4 me-4">
                    <Pagination className="mb-0">
                      <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} />
                      {[...Array(totalPages).keys()].map(x => (
                        <Pagination.Item key={x + 1} active={x + 1 === currentPage} onClick={() => setCurrentPage(x + 1)}>
                          {x + 1}
                        </Pagination.Item>
                      ))}
                      <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} />
                    </Pagination>
                  </div>
                )}
              </div>
            </>
          )}
        </Container>
      </div>

      {/* ── Track Order Modal ── */}
      <Modal show={showTrackModal} onHide={() => setShowTrackModal(false)} centered size="xl">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontWeight: 800, color: '#1a1a2e', fontSize: '1.2rem' }}>
            Live Order Tracking
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 pb-4 px-4">
          {trackOrder && (() => {
            const getVendorGroups = (items, order) => {
              const groups = {};
              items.forEach(item => {
                const vendorId = item.vendor?._id || item.vendor;
                if (!groups[vendorId]) {
                  groups[vendorId] = {
                    vendor: item.vendor,
                    items: [],
                    isPacked: true,
                    isDelivered: true,
                  };
                }
                groups[vendorId].items.push(item);
                if (!order.isPacked && !item.isPacked) groups[vendorId].isPacked = false;
                if (!order.isDelivered && !item.isDelivered) groups[vendorId].isDelivered = false;
              });
              return Object.values(groups);
            };

            return (
              <>
                <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Order ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{trackOrder._id}</span></p>
                
                <div className="vendor-groups-wrapper">
                  {getVendorGroups(trackOrder.orderItems, trackOrder).map((group, index) => (
                    <div key={index} className="vendor-column shadow-sm">
                      <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: '#1a1a2e' }}>
                        <FaStore className="text-success" /> 
                        <span className="text-truncate">{group.vendor?.vendorDetails?.storeName || group.vendor?.name || 'Third-Party Vendor'}</span>
                      </h6>
                      <div className="mb-4 px-2 py-2 bg-white border rounded shadow-sm" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        <strong>Items:</strong> {group.items.slice(0, 3).map(i => i.name).join(', ')}
                        {group.items.length > 3 && ` + ${group.items.length - 3} more`}
                      </div>
                      
                      <div className="vertical-timeline">
                        {/* Step 1: Ordered */}
                        <div className="v-timeline-step completed">
                          <div className="v-timeline-icon"><FaCheckCircle /></div>
                          <div className="v-timeline-content">
                            <h5>Order Placed</h5>
                            <p>{new Date(trackOrder.createdAt).toLocaleDateString('en-US')}</p>
                          </div>
                        </div>
                        
                        {/* Step 2: Packed */}
                        <div className={`v-timeline-step ${group.isPacked ? 'completed' : 'pending'}`}>
                          <div className="v-timeline-icon">{group.isPacked ? <FaCheckCircle /> : <FaClock />}</div>
                          <div className="v-timeline-content">
                            <h5>Order Packed</h5>
                            <p>{group.isPacked ? 'Vendor packed' : 'Preparing items'}</p>
                          </div>
                        </div>

                        {/* Step 3: Picked */}
                        <div className={`v-timeline-step ${trackOrder.isPicked ? 'completed' : (group.isPacked ? 'active' : 'pending')}`}>
                           <div className="v-timeline-icon">{trackOrder.isPicked ? <FaCheckCircle /> : <FaTruck />}</div>
                           <div className="v-timeline-content">
                             <h5>{trackOrder.deliveryMethod === 'Third-Party' ? 'Agent Picked Up' : 'Out for Delivery'}</h5>
                             <p>{trackOrder.isPicked 
                                   ? `Picked up ${new Date(trackOrder.pickedAt).toLocaleDateString('en-US')}` 
                                   : 'Awaiting dispatch'}</p>
                           </div>
                        </div>

                        {/* Step 4: In Transit (If Third-Party) */}
                        {trackOrder.deliveryMethod === 'Third-Party' && (
                          <div className={`v-timeline-step ${trackOrder.isInTransit ? 'completed' : (trackOrder.isPicked ? 'active' : 'pending')}`}>
                             <div className="v-timeline-icon">{trackOrder.isInTransit ? <FaCheckCircle /> : <FaRoute />}</div>
                             <div className="v-timeline-content">
                               <h5>In Transit</h5>
                               <p>{trackOrder.isInTransit ? 'Agent is on the way' : 'Pending'}</p>
                             </div>
                          </div>
                        )}
                        
                        {/* Step 5: Delivered */}
                        <div className={`v-timeline-step ${group.isDelivered ? 'completed' : 'pending'} mt-auto`}>
                           <div className="v-timeline-icon">{group.isDelivered ? <FaCheckCircle /> : <FaClock />}</div>
                           <div className="v-timeline-content">
                             <h5>Delivered</h5>
                             <p>{group.isDelivered ? 'Delivered successfully' : 'Arriving soon'}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" className="w-100 fw-bold" style={{ borderRadius: '8px' }} onClick={() => setShowTrackModal(false)}>
            Close Tracking
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UserDashboard;
