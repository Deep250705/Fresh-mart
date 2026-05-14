import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Row, Col, ListGroup, Image, Card } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { clearCartItems } from '../slices/cartSlice';
import CheckoutSteps from '../components/CheckoutSteps';
import axios from 'axios';
import { notifyError } from '../utils/notify';

const PlaceOrderScreen = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);

  const itemsPrice = cart.cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingPrice = itemsPrice > 1000 ? 0 : 50;
  const taxPrice = Number((0.18 * itemsPrice).toFixed(2));
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  useEffect(() => {
    if (!cart.shippingAddress.street) {
      navigate('/shipping');
    } else if (!cart.paymentMethod) {
      navigate('/payment');
    }
  }, [cart.paymentMethod, cart.shippingAddress.street, navigate]);

  const placeOrderHandler = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/orders', {
        orderItems: cart.cartItems,
        shippingAddress: cart.shippingAddress,
        paymentMethod: cart.paymentMethod,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
      });

      dispatch(clearCartItems());
      navigate(`/order/${data._id}`);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CheckoutSteps step1 step2 step3 step4 />
      <Row className="fade-in">
        <Col md={8}>
          <ListGroup variant="flush" className="shadow-sm border rounded">
            <ListGroup.Item className="p-4 bg-body border-bottom">
              <h3 className="mb-3 text-success">Shipping</h3>
              <p className="mb-0">
                <strong>Address: </strong>
                {cart.shippingAddress.street}, {cart.shippingAddress.city}{' '}
                {cart.shippingAddress.postalCode}, {cart.shippingAddress.country}
              </p>
            </ListGroup.Item>

            <ListGroup.Item className="p-4 bg-body border-bottom">
              <h3 className="mb-3 text-success">Payment Method</h3>
              <strong className="text-secondary fw-bold">Method: </strong>
              {cart.paymentMethod}
            </ListGroup.Item>

            <ListGroup.Item className="p-4 bg-body">
              <h3 className="mb-3 text-success">Order Items</h3>
              {cart.cartItems.length === 0 ? (
                <div>Your cart is empty</div>
              ) : (
                <ListGroup variant="flush">
                  {cart.cartItems.map((item, index) => (
                    <ListGroup.Item key={index} className="px-0 pt-3 border-bottom bg-transparent">
                      <Row className="align-items-center">
                        <Col md={2}>
                          <Image src={item.image} alt={item.name} fluid rounded className="border shadow-sm" />
                        </Col>
                        <Col>
                          <Link to={`/product/${item._id}`} className="text-decoration-none fw-bold text-body">
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

        <Col md={4} className="mt-4 mt-md-0">
          <Card className="shadow-sm border rounded bg-body">
            <ListGroup variant="flush">
              <ListGroup.Item className="bg-body border-bottom">
                <h3 className="text-success text-center">Order Summary</h3>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom">
                <Row>
                  <Col>Items</Col>
                  <Col className="text-end fw-bold">Rs {itemsPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom">
                <Row>
                  <Col>Shipping</Col>
                  <Col className="text-end fw-bold">Rs {shippingPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom">
                <Row>
                  <Col>Tax (GST 18%)</Col>
                  <Col className="text-end fw-bold">Rs {taxPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom">
                <Row>
                  <Col className="fw-bold fs-5 text-success">Total</Col>
                  <Col className="text-end fw-bold fs-5 text-success">Rs {totalPrice.toFixed(2)}</Col>
                </Row>
              </ListGroup.Item>

              <ListGroup.Item className="bg-body py-3">
                <Button
                  type="button"
                  className="w-100 rounded-pill btn-success fw-bold p-2 shadow-sm"
                  disabled={cart.cartItems.length === 0 || loading}
                  onClick={placeOrderHandler}
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </Button>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PlaceOrderScreen;
