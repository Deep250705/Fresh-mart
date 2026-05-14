import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { saveShippingAddress } from '../slices/cartSlice';
import CheckoutSteps from '../components/CheckoutSteps';

const ShippingScreen = () => {
  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;

  const [street, setAddress] = useState(shippingAddress?.street || '');
  const [city, setCity] = useState(shippingAddress?.city || '');
  const [postalCode, setPostalCode] = useState(shippingAddress?.postalCode || '');
  const [stateName, setStateName] = useState(shippingAddress?.state || '');
  const [country, setCountry] = useState(shippingAddress?.country || '');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(saveShippingAddress({ street, city, postalCode, state: stateName, country }));
    navigate('/payment');
  };

  return (
    <div className="d-flex justify-content-center mt-3 mb-5 fade-in">
      <div className="w-100 p-4 border rounded shadow-sm bg-body" style={{ maxWidth: '600px' }}>
        <CheckoutSteps step1 step2 />
        <h2 className="mb-4 text-center">Shipping Details</h2>
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-3" controlId="street">
            <Form.Label>Street Address</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter address"
              value={street}
              required
              onChange={(e) => setAddress(e.target.value)}
            />
          </Form.Group>

          <Row>
             <Col md={6}>
               <Form.Group className="mb-3" controlId="city">
                 <Form.Label>City</Form.Label>
                 <Form.Control
                   type="text"
                   placeholder="Enter city"
                   value={city}
                   required
                   onChange={(e) => setCity(e.target.value)}
                 />
               </Form.Group>
             </Col>
             <Col md={6}>
               <Form.Group className="mb-3" controlId="stateName">
                 <Form.Label>State</Form.Label>
                 <Form.Control
                   type="text"
                   placeholder="Enter state"
                   value={stateName}
                   required
                   onChange={(e) => setStateName(e.target.value)}
                 />
               </Form.Group>
             </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="postalCode">
                <Form.Label>Postal Code</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter postal code"
                  value={postalCode}
                  required
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="country">
                <Form.Label>Country</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter country"
                  value={country}
                  required
                  onChange={(e) => setCountry(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-4 g-2">
            <Col xs={12} sm={6}>
              <Button type="button" variant="outline-secondary" className="w-100 rounded-pill shadow-sm py-2 fw-bold" onClick={() => navigate('/cart')}>
                Back to Cart
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button type="submit" variant="success" className="w-100 rounded-pill shadow-sm py-2 fw-bold">
                Continue
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
};

export default ShippingScreen;
