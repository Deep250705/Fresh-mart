import React, { useCallback, useEffect, useState } from 'react';
import { Container, Row, Col, Table, Button, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaTruck, FaMapMarkerAlt, FaBoxOpen, FaCheckCircle, FaRoute, FaArrowRight, FaSignOutAlt, FaUserTie } from 'react-icons/fa';
import { confirmAction, notifyError, notifySuccess } from '../utils/notify';

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/delivery/orders', {
        withCredentials: true 
      });
      setOrders(data);
      setLoading(false);
    } catch (error) {
       if (error.response && error.response.status === 401) {
          localStorage.removeItem('agentInfo');
          navigate('/delivery/login');
       }
       console.error(error);
       setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const rawAgent = localStorage.getItem('agentInfo');
    if (!rawAgent) {
      navigate('/delivery/login');
    } else {
      const parsed = JSON.parse(rawAgent);
      setAgent(parsed);
      fetchOrders();
    }
  }, [fetchOrders, navigate]);

  const logoutHandler = async () => {
    try {
      await axios.post('/api/delivery/logout');
      localStorage.removeItem('agentInfo');
      navigate('/delivery/login');
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    let proceed = true;
    if (newStatus === 'Picked') {
      const result = await confirmAction('Confirm Pickup', 'Are you sure you have picked up this order?');
      proceed = result.isConfirmed;
    }

    if (proceed) {
      try {
        await axios.put(`/api/delivery/orders/${orderId}/status`, { status: newStatus }, {
          withCredentials: true
        });
        fetchOrders();
        if (newStatus === 'Delivered') {
          notifySuccess('Product Delivered successfully');
        } else {
          notifySuccess(`Status updated to ${newStatus}`);
        }
      } catch (err) {
        notifyError('Network Error mapping status: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  if (!agent) return <h4 className="text-center mt-5">Loading Fleet ID...</h4>;

  const activeOrders = orders.filter(o => !o.isDelivered);
  const completedOrders = orders.filter(o => o.isDelivered);

  return (
    <>
      <style>{`
        .fleet-bg { background-color: #f8fafc; min-height: 100vh; padding-bottom: 40px; }
        .fleet-header { 
          background: linear-gradient(135deg, #1e293b, #0f172a); 
          border-radius: 0 0 24px 24px; padding: 30px 40px; color: #fff;
          box-shadow: 0 10px 30px rgba(15,23,42,0.15); margin-bottom: 30px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .fleet-header h2 { font-weight: 800; font-size: 1.6rem; letter-spacing: -0.5px; margin: 0; }
        .fleet-header p { margin: 6px 0 0; color: #94a3b8; font-size: 0.9rem; }
        
        .driver-badge { 
          background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3);
          border-radius: 50px; padding: 8px 18px; color: #60a5fa; font-weight: 700; font-size: 0.85rem;
          display: flex; align-items: center; gap: 8px;
        }
        
        .fleet-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); margin-bottom: 24px; }
        .card-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .card-title.active { color: #2563eb; }
        .card-title.history { color: #10b981; }

        .job-card { 
          border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; 
          transition: all 0.2s; position: relative; overflow: hidden;
        }
        .job-card:hover { border-color: #cbd5e1; box-shadow: 0 8px 20px rgba(0,0,0,0.04); transform: translateY(-2px); }
        .job-card.next { border-left: 6px solid #3b82f6; }
        .job-card.transit { border-left: 6px solid #f59e0b; }
        
        .job-id { font-family: monospace; font-size: 0.8rem; color: #64748b; font-weight: 600; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; }
        .customer-name { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 12px 0 4px; }
        .address-box { display: flex; align-items: flex-start; gap: 8px; color: #475569; font-size: 0.85rem; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
        
        .fleet-btn { border-radius: 8px; padding: 10px 18px; font-weight: 700; font-size: 0.85rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; transition: 0.2s; }
        .btn-pickup { background: #eff6ff; color: #2563eb; }
        .btn-pickup:hover { background: #dbeafe; transform: translateY(-1px); }
        .btn-in-transit { background: #fffbeb; color: #d97706; }
        .btn-in-transit:hover { background: #fef3c7; transform: translateY(-1px); }
        .btn-deliver { background: #10b981; color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,0.3); }
        .btn-deliver:hover { background: #059669; box-shadow: 0 6px 20px rgba(16,185,129,0.4); transform: translateY(-1px); }
      `}</style>
      
      <div className="fleet-bg">
        <Container>
          <div className="fleet-header">
            <div>
              <h2>Hello, {agent.name.split(' ')[0]}</h2>
              <p>Fleet Route Command Center &bull; Agent #{agent._id.substring(0,6)}</p>
            </div>
            <div className="d-flex align-items-center gap-4">
              <div className="driver-badge">
                <FaUserTie /> Active Duty
              </div>
              <Button variant="link" onClick={logoutHandler} className="text-white text-decoration-none p-0" style={{ opacity: 0.7 }}>
                <FaSignOutAlt size={20} />
              </Button>
            </div>
          </div>

          <Row>
            <Col lg={8}>
              <div className="fleet-card">
                <div className="card-title active"><FaRoute size={20} /> Active Queue ({activeOrders.length})</div>
                
                {activeOrders.length === 0 ? (
                  <div className="text-center py-5">
                    <FaBoxOpen size={40} color="#cbd5e1" className="mb-3" />
                    <h5 className="text-muted fw-bold">Queue is empty</h5>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>You have no assigned orders waiting. Grab a coffee!</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {activeOrders.map(order => (
                      <div key={order._id} className={`job-card ${order.status === 'Assigned' || order.status === 'Packed' ? 'next' : 'transit'}`}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="job-id">ORDER #{order._id.substring(0, 10)}</span>
                          <Badge bg={order.status === 'Picked' ? 'warning' : 'info'} className="px-3 py-2 rounded-pill">
                            {order.status === 'Picked' ? 'In Transit' : 'Awaiting Pickup'}
                          </Badge>
                        </div>
                        
                        <div className="customer-name">{order.user?.name || 'Customer'}</div>
                        
                        <div className="address-box">
                          <FaMapMarkerAlt size={16} className="text-danger mt-1 flex-shrink-0" />
                          <div>
                            <strong>Delivery Address:</strong><br />
                            {order.shippingAddress.street}, {order.shippingAddress.city}<br />
                            {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                          </div>
                        </div>

                        {/* Workflow Controller */}
                        <div className="mt-3">
                          {order.status === 'Assigned' && (
                            <button className="fleet-btn btn-pickup" onClick={() => updateStatus(order._id, 'Picked')}>
                              <FaBoxOpen /> Scan & Pick Up <FaArrowRight style={{ marginLeft: 'auto' }} />
                            </button>
                          )}
                          {order.status === 'Picked' && (
                            <button className="fleet-btn btn-deliver" onClick={() => updateStatus(order._id, 'Delivered')}>
                              <FaCheckCircle /> Handover to Customer (Mark Delivered)
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Col>

            <Col lg={4}>
              <div className="fleet-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="card-title history"><FaCheckCircle size={18} /> Delivery Log</div>
                
                {completedOrders.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>No deliveries logged today.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {completedOrders.map((order, index) => (
                      <div key={index} style={{ padding: '12px', background: '#fff', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{order.user?.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{order._id.substring(0, 8)}</div>
                        </div>
                        <FaCheckCircle color="#10b981" size={18} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default DeliveryDashboard
