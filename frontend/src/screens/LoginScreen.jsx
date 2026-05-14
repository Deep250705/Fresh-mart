import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../slices/authSlice';
import axios from 'axios';
import { notifyError } from '../utils/notify';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get('redirect') || '/';

  useEffect(() => {
    if (userInfo) navigate(redirect);
  }, [navigate, redirect, userInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/users/auth', { email, password });
      dispatch(setCredentials({ ...res.data }));
      navigate(redirect);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center mt-5 mb-5">
      <div className="w-100 p-4 border rounded shadow-sm bg-body" style={{ maxWidth: '400px' }}>
        <h2 className="mb-4 text-center">Sign In</h2>
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button type="submit" variant="success" className="w-100 mt-2 rounded-pill shadow-sm" disabled={loading}>
            {loading ? 'Processing...' : 'Sign In'}
          </Button>
        </Form>

        <Row className="py-3">
          <Col className="text-center">
            New Customer? <Link to={`/register?redirect=${redirect}`} className="text-success text-decoration-none fw-bold">Register</Link>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default LoginScreen;
