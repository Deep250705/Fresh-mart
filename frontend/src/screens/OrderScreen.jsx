import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Card, Button } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { io } from 'socket.io-client';
import { confirmAction, notifyError, notifySuccess } from '../utils/notify';

const OrderScreen = () => {
  const { id: orderId } = useParams();
  const [order, setOrder] = useState({});
  const [loading, setLoading] = useState(true);
  const socketUrl = import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : undefined);
  
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await axios.get(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setOrder(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    if (userInfo) {
       fetchOrder();
    }

    const socket = io(socketUrl, { withCredentials: true });
    socket.emit('joinOrderUpdates', orderId);

    socket.on('orderStatusUpdated', (updatedOrder) => {
      setOrder(updatedOrder);
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, socketUrl, userInfo]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async () => {
    try {
      const res = await loadRazorpayScript();

      if (!res) {
        notifyError('Razorpay SDK failed to load. Are you online?');
        return;
      }

      const { data: { clientId } } = await axios.get('/api/config/razorpay');

      const { data: orderDetails } = await axios.post(`/api/orders/${orderId}/razorpay`, {}, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });

      const options = {
        key: clientId,
        amount: orderDetails.amount,
        currency: orderDetails.currency,
        name: 'FreshMart',
        description: 'Payment for your order',
        order_id: orderDetails.id,
        handler: async function (response) {
          try {
            const { data } = await axios.put(`/api/orders/${orderId}/pay`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }, {
              headers: { Authorization: `Bearer ${userInfo.token}` }
            });
            setOrder(data);
            notifySuccess('Payment Successful!');
          } catch (err) {
            notifyError('Payment Verification Failed!');
            console.error(err);
          }
        },
        prefill: {
          name: order.user.name,
          email: order.user.email,
        },
        theme: {
          color: '#198754'
        }
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response) {
        console.error("Razorpay Checkout Error:", response.error);
        notifyError(`Razorpay Error: ${response.error.description} (Reason: ${response.error.reason})`);
      });

      paymentObject.open();

    } catch (err) {
      console.error(err);
      notifyError(`Failed to initiate payment: ${err.response?.data?.message || err.message}`);
    }
  };

  const deliverHandler = async () => {
    try {
      const { data } = await axios.put(`/api/orders/${orderId}/deliver`, { status: 'Delivered' }, {
         headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setOrder(data);
      notifySuccess('Product Delivered successfully');
    } catch (err) {
      notifyError('Failed to update delivery status');
    }
  };

  const downloadInvoice = async () => {
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
      notifyError('Failed to download invoice');
    }
  };

  return loading ? (
    <h2 className="text-center mt-5">Loading Order...</h2>
  ) : (
    <div className="fade-in mt-4">
      <h2 className="mb-4 text-success">Order {order._id}</h2>
      <Row>
        <Col md={8}>
          <ListGroup variant="flush" className="shadow-sm border rounded mb-4 mb-md-0">
            <ListGroup.Item className="p-4 bg-body border-bottom">
              <h3 className="mb-3 text-success">Shipping Details</h3>
              <p className="mb-1">
                <strong>Name: </strong> {order.user.name}
              </p>
              <p className="mb-1">
                <strong>Email: </strong> <a href={`mailto:${order.user.email}`} className="text-success text-decoration-none">{order.user.email}</a>
              </p>
              <p className="mb-1">
                <strong>Address: </strong>
                {order.shippingAddress.street}, {order.shippingAddress.city}{' '}
                {order.shippingAddress.postalCode}, {order.shippingAddress.country}
              </p>
              {order.isDelivered ? (
                <div className="alert alert-success mt-3 shadow-sm rounded-3">Delivered on {new Date(order.deliveredAt).toLocaleString()}</div>
              ) : (
                <div className="alert alert-danger mt-3 shadow-sm rounded-3">Not Delivered</div>
              )}
            </ListGroup.Item>

            <ListGroup.Item className="p-4 bg-body border-bottom">
              <h3 className="mb-3 text-success">Payment Method</h3>
              <p className="mb-1">
                <strong className="text-secondary fw-bold">Method: </strong>
                {order.paymentMethod}
              </p>
              {order.isPaid ? (
                <div className="alert alert-success mt-3 shadow-sm rounded-3">Paid on {new Date(order.paidAt).toLocaleString()}</div>
              ) : (
                <div className="alert alert-danger mt-3 shadow-sm rounded-3">Not Paid</div>
              )}
            </ListGroup.Item>

            <ListGroup.Item className="p-4 bg-body">
              <h3 className="mb-3 text-success">Order Items</h3>
              {order.orderItems.length === 0 ? (
                <div className="alert alert-info">Order is empty</div>
              ) : (
                <ListGroup variant="flush">
                  {order.orderItems.map((item, index) => (
                    <ListGroup.Item key={index} className="px-0 py-3 border-bottom bg-transparent">
                      <Row className="align-items-center">
                        <Col md={2}>
                          <Image src={item.image} alt={item.name} fluid rounded className="border shadow-sm" />
                        </Col>
                        <Col>
                          <Link to={`/product/${item.product}`} className="text-decoration-none fw-bold text-body">
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={4} className="fw-bold text-end">
                          {item.qty} {item.unit || 'pc'} x Rs {item.price} = Rs {item.qty * item.price}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm border rounded bg-body">
            <ListGroup variant="flush">
              <ListGroup.Item className="bg-body border-bottom">
                <h3 className="text-success text-center">Order Summary</h3>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom p-3">
                <Row>
                  <Col>Items</Col>
                  <Col className="text-end fw-bold">Rs {order.itemsPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom p-3">
                <Row>
                  <Col>Shipping</Col>
                  <Col className="text-end fw-bold">Rs {order.shippingPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom p-3">
                <Row>
                  <Col>Tax (GST)</Col>
                  <Col className="text-end fw-bold">Rs {order.taxPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom p-3">
                <Row>
                  <Col className="fw-bold fs-5 text-success">Total</Col>
                  <Col className="text-end fw-bold fs-5 text-success">Rs {order.totalPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>

              {!order.isPaid && order.paymentMethod !== 'COD' && (
                <ListGroup.Item className="bg-body py-3">
                  <Button type="button" className="w-100 rounded-pill btn-success fw-bold p-2 shadow-sm" onClick={initiatePayment}>
                    <i className="bi bi-credit-card me-2"></i> Pay Now (Razorpay)
                  </Button>
                </ListGroup.Item>
              )}

              {!order.isPaid && order.paymentMethod === 'COD' && (
                <ListGroup.Item className="bg-body py-3 text-center">
                  <div className="alert alert-warning mb-0 border-warning d-inline-block shadow-sm">
                    <i className="bi bi-info-circle-fill me-2 text-warning"></i>
                    <strong>Cash on Delivery (COD):</strong> You will pay cash to the delivery agent when your order arrives.
                  </div>
                </ListGroup.Item>
              )}

              {userInfo && (userInfo.role === 'admin' || userInfo.role === 'vendor') && !order.isDelivered && (order.isPaid || order.paymentMethod === 'COD') && (
                <ListGroup.Item className="bg-body py-3">
                  <Button type="button" className="w-100 rounded-pill btn-primary fw-bold p-2 shadow-sm" onClick={deliverHandler}>
                    <i className="bi bi-truck me-2"></i> Mark As Delivered
                  </Button>
                </ListGroup.Item>
              )}

              {order.isPaid && (
                <ListGroup.Item className="bg-body py-3">
                  <Button type="button" variant="outline-success" className="w-100 rounded-pill fw-bold p-2 shadow-sm border" onClick={downloadInvoice}>
                    <i className="bi bi-file-earmark-pdf-fill me-2"></i> Download Invoice
                  </Button>
                </ListGroup.Item>
              )}

            </ListGroup>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderScreen;
