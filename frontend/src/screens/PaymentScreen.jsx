import React, { useState, useEffect } from 'react';
import { Form, Button, Col } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { savePaymentMethod } from '../slices/cartSlice';
import CheckoutSteps from '../components/CheckoutSteps';

const PaymentScreen = () => {
  const [paymentMethod, setPaymentMethod] = useState('Razorpay');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cart = useSelector((state) => state.cart);
  const { shippingAddress } = cart;

  useEffect(() => {
    if (!shippingAddress.street) {
      navigate('/shipping');
    }
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(savePaymentMethod(paymentMethod));
    navigate('/placeorder');
  };

  return (
    <div className="d-flex justify-content-center mt-3 mb-5 fade-in">
      <div className="w-100 p-4 border rounded shadow-sm bg-body" style={{ maxWidth: '600px' }}>
        <CheckoutSteps step1 step2 step3 />
        <h2 className="mb-4 text-center">Payment Method</h2>
        <Form onSubmit={submitHandler}>
          <Form.Group>
            <Form.Label as="legend" className="fw-bold">Select Method</Form.Label>
            <Col className="my-3 border p-3 rounded">
              <Form.Check
                type="radio"
                className="mb-2"
                label={
                  <span><i className="bi bi-credit-card me-2 text-success"></i>Razorpay (Credit Card / UPI)</span>
                }
                id="Razorpay"
                name="paymentMethod"
                value="Razorpay"
                checked={paymentMethod === 'Razorpay'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              ></Form.Check>
              <Form.Check
                type="radio"
                label={
                  <span><i className="bi bi-wallet2 me-2 text-secondary"></i>Cash on Delivery (COD)</span>
                }
                id="COD"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === 'COD'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              ></Form.Check>
            </Col>
          </Form.Group>

          <Button type="submit" variant="success" className="w-100 mt-3 rounded-pill shadow-sm py-2 fw-bold">
            Continue To Order
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default PaymentScreen;
