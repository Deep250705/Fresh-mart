import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaTruck, FaLock, FaEnvelope } from 'react-icons/fa';
import { notifyError } from '../utils/notify';

const DeliveryLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/delivery/login', { email, password });
      // Saving agent session entirely isolated from standard redux
      localStorage.setItem('agentInfo', JSON.stringify(data));
      navigate('/delivery/dashboard');
    } catch (err) {
      notifyError('Authentication Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container>
        <Row className="justify-content-md-center">
          <Col md={5} lg={4}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <div className="text-center mb-4">
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff' }}>
                  <FaTruck size={28} />
                </div>
                <h3 style={{ fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Fleet Portal</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Secure access for authorized Delivery Agents</p>
              </div>

              <Form onSubmit={submitHandler}>
                <Form.Group className="mb-4">
                  <Form.Label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>Fleet Email</Form.Label>
                  <div className="position-relative">
                    <FaEnvelope className="position-absolute text-muted" style={{ left: '14px', top: '14px' }} />
                    <Form.Control
                      type="email"
                      required
                      placeholder="driver@logistics.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: '40px', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }}
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-5">
                  <Form.Label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>Passcode</Form.Label>
                  <div className="position-relative">
                    <FaLock className="position-absolute text-muted" style={{ left: '14px', top: '14px' }} />
                    <Form.Control
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: '40px', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem' }}
                    />
                  </div>
                </Form.Group>

                <Button 
                  type="submit" 
                  className="w-100" 
                  style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 700, fontSize: '0.95rem' }}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Authorize Identity'}
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default DeliveryLogin;
