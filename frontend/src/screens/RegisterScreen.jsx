import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Row, Col, InputGroup } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../slices/authSlice';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import { notifyError } from '../utils/notify';

const getStrength = (pass) => {
  let score = 0;
  if (!pass) return 0;
  if (pass.length > 5) score += 1;
  if (pass.length > 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;
  return Math.min(score, 4);
};
const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['#ff4d4f', '#ff4d4f', '#faad14', '#52c41a', '#52c41a'];

const RegisterScreen = () => {
  // Core user fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  
  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [inlineError, setInlineError] = useState('');
  const [loading, setLoading] = useState(false);

  // Vendor flag & fields
  const [isVendor, setIsVendor] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

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
    setInlineError('');
    if (password !== confirmPassword) {
      setInlineError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const role = isVendor ? 'vendor' : 'user';
      const vendorDetails = isVendor ? { storeName, businessAddress } : undefined;
      
      const payload = {
        name,
        username,
        phone,
        gender,
        dob,
        email,
        password,
        role,
        vendorDetails
      };

      const res = await axios.post('/api/users', payload);
      dispatch(setCredentials({ ...res.data }));
      navigate(redirect);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const passStrength = getStrength(password);

  return (
    <div className="d-flex justify-content-center mt-5 mb-5">
      <div className="w-100 p-4 border rounded shadow-sm bg-body" style={{ maxWidth: '700px' }}>
        <h2 className="mb-4 text-center">Create an Account</h2>
        <Form onSubmit={submitHandler}>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="name">
                <Form.Label>Full Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="username">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="phone">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="dob">
                <Form.Label>Date of Birth</Form.Label>
                <Form.Control
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="gender">
                <Form.Label>Gender <span className="text-muted fs-6 fw-normal">(Optional)</span></Form.Label>
                <Form.Select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
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
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="password">
                <Form.Label>Password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </InputGroup>
                {password && (
                  <div className="mt-2 d-flex align-items-center" style={{ fontSize: '0.85rem' }}>
                    <div style={{ flex: 1, height: '4px', backgroundColor: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${(passStrength / 4) * 100}%`, 
                        backgroundColor: strengthColors[passStrength],
                        transition: 'all 0.3s'
                      }}></div>
                    </div>
                    <span className="ms-2" style={{ color: strengthColors[passStrength], minWidth: '65px' }}>
                      {strengthLabels[passStrength]}
                    </span>
                  </div>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="confirmPassword">
                <Form.Label>Confirm Password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button variant="outline-secondary" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4 mt-2 px-1 border-top pt-3" controlId="isVendor">
            <Form.Check 
              type="checkbox" 
              label={<span className="fw-bold text-success fs-5">Register as a Vendor</span>} 
              checked={isVendor}
              onChange={(e) => setIsVendor(e.target.checked)}
            />
          </Form.Group>

          {isVendor && (
            <div className="p-3 mb-4 bg-light border rounded fade-in">
              <h5 className="mb-3 text-secondary">Vendor Details</h5>
              <Form.Group className="mb-3" controlId="storeName">
                <Form.Label>Store Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="E.g., Fresh Grocers"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required={isVendor}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="businessAddress">
                <Form.Label>Business Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Enter full physical address of your business"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  required={isVendor}
                />
              </Form.Group>
            </div>
          )}

          {inlineError && <p className="text-danger mb-2 text-center">{inlineError}</p>}

          <Button type="submit" variant="success" className="w-100 mt-2 rounded-pill shadow-sm fw-bold p-2 fs-5" disabled={loading}>
            {loading ? 'Processing...' : (isVendor ? 'Create Vendor Account' : 'Register')}
          </Button>
        </Form>

        <Row className="py-3 mt-3 text-center border-top">
          <Col>
            Already have an account? <Link to={`/login?redirect=${redirect}`} className="text-success text-decoration-none fw-bold ms-1">Sign In</Link>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default RegisterScreen;
