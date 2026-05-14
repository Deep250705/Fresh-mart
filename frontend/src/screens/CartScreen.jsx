import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, ListGroup, Image, Form, Button, Card } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';
import { addToCart, removeFromCart } from '../slices/cartSlice';
import { confirmAction, notifySuccess } from '../utils/notify';
import { apiClient } from '../utils/apiClient';
import { formatINR } from '../utils/format';

const CartScreen = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((state) => state.cart);
  const { cartItems } = cart;

  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const getPricingKey = (productId, weight) => `${productId}::${weight || ''}`;

  const pricingByProductId = useMemo(() => {
    const map = new Map();
    if (pricing?.items) {
      for (const it of pricing.items) {
        map.set(getPricingKey(String(it.productId), it.weight), it);
      }
    }
    return map;
  }, [pricing]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setPricingLoading(true);
      try {
        const standardItems = cartItems.filter(i => !i.isSmartBundle);
        const bundleItems = cartItems.filter(i => i.isSmartBundle);

        const items = standardItems.map((i) => ({
          productId: i._id,
          qty: i.qty,
          weight: i.weight || i.variantLabel || null,
        }));
        const { data } = await apiClient.post('/api/cart/calculate', { items });

        // Frontend augmentation injecting random bundle discount computations natively into pricing mapping
        if (bundleItems.length > 0) {
           const bundleSubtotalOrig = bundleItems.reduce((acc, it) => acc + (it.originalPrice || it.price) * it.qty, 0);
           const bundleSubtotalFinal = bundleItems.reduce((acc, it) => acc + it.price * it.qty, 0);
           const bundleDisc = bundleSubtotalOrig - bundleSubtotalFinal;
           
           data.subtotal += bundleSubtotalOrig;
           data.total += bundleSubtotalFinal;
           data.itemDiscountTotal += bundleDisc;
           data.totalDiscount += bundleDisc;
        }

        if (mounted) setPricing(data);
      } catch (e) {
        // keep UI functional even if pricing endpoint fails
        if (mounted) setPricing(null);
      } finally {
        if (mounted) setPricingLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [cartItems]);

  const addToCartHandler = async (product, qty) => {
    dispatch(addToCart({ ...product, qty }));
  };

  const removeFromCartHandler = async (id, weight) => {
    const result = await confirmAction('Remove Item', 'Are you sure you want to remove this item from the cart?');
    if (result.isConfirmed) {
      dispatch(removeFromCart({ id, weight }));
      notifySuccess('Item removed');
    }
  };

  const checkoutHandler = () => {
    navigate('/login?redirect=/shipping');
  };

  return (
    <Row className="mt-4 fade-in">
      <Col md={8}>
        <h2 className="mb-4">Shopping Cart</h2>
        {cartItems.length === 0 ? (
          <div className="alert alert-info shadow-sm">
            Your cart is empty <Link to="/" className="text-decoration-none fw-bold text-success ms-2">Go Back</Link>
          </div>
        ) : (
          <ListGroup variant="flush" className="shadow-sm border rounded">
            {cartItems.map((item) => (
              <ListGroup.Item key={item._id + (item.weight || item.variantLabel || '')} className="py-3 bg-body border-bottom">
                <Row className="align-items-center">
                  <Col md={2}>
                    <Image src={item.image} alt={item.name} fluid rounded className="border shadow-sm" />
                  </Col>
                  <Col md={3}>
                    <Link to={`/product/${item._id}`} className="text-decoration-none text-body fw-bold">{item.name}</Link>
                    {(item.weight || item.variantLabel) && <div className="text-secondary small fw-bold mt-1 bg-light d-inline-block px-2 py-1 rounded border">{item.weight || item.variantLabel}</div>}
                  </Col>
                  <Col md={2} className="text-success fw-bold">
                    {(() => {
                      if (item.isSmartBundle) {
                         return (
                           <div className="d-flex flex-column">
                             <div className="text-success">{formatINR(item.price)}</div>
                             <div className="small text-muted text-decoration-line-through">{formatINR(item.originalPrice)}</div>
                             <span className="badge bg-warning text-dark mt-1" style={{ fontSize: '0.65rem' }}>Smart Bundle Deal</span>
                           </div>
                         );
                      }

                      const it = pricingByProductId.get(getPricingKey(String(item._id), item.weight || item.variantLabel));
                      const hasDiscount = (it?.discount?.percent || 0) > 0;
                      if (hasDiscount) {
                        return (
                          <div className="d-flex flex-column">
                            <div className="text-success">{formatINR(it.finalUnitPrice)}</div>
                            <div className="small text-muted text-decoration-line-through">{formatINR(it.unitPrice)}</div>
                            <div className="text-muted fs-6 fw-normal">/ {item.weight || item.unit || 'pc'}</div>
                          </div>
                        );
                      }
                      return (
                        <>
                          {formatINR(item.price)} <span className="text-muted fs-6 fw-normal">/ {item.weight || item.variantLabel || item.unit || 'pc'}</span>
                        </>
                      );
                    })()}
                  </Col>
                  <Col md={2}>
                    <div className="d-flex align-items-center justify-content-between border rounded px-1 py-1 bg-body shadow-sm">
                      <Button 
                        variant="light" 
                        size="sm" 
                        className="bg-transparent border-0 fw-bold fs-6 text-secondary p-0 px-2"
                        onClick={() => addToCartHandler(item, item.qty > 1 ? item.qty - 1 : 1)}
                        disabled={item.qty <= 1}
                      >
                        &minus;
                      </Button>
                      <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{item.qty}</span>
                      {(() => {
                        const pricingItem = pricingByProductId.get(getPricingKey(String(item._id), item.weight || item.variantLabel));
                        const availableStock = pricingItem?.countInStock ?? item.countInStock ?? 0;
                        return (
                      <Button 
                        variant="light" 
                        size="sm" 
                        className="bg-transparent border-0 fw-bold fs-6 text-secondary p-0 px-2"
                        onClick={() => addToCartHandler(item, Math.min(item.qty + 1, availableStock))}
                        disabled={availableStock <= 0 || item.qty >= availableStock}
                      >
                        +
                      </Button>
                        );
                      })()}
                    </div>
                  </Col>
                  <Col md={2}>
                    <Button type="button" variant="light" onClick={() => removeFromCartHandler(item._id, item.weight || item.variantLabel)} className="shadow-sm border">
                      <FaTrash className="text-danger" />
                    </Button>
                  </Col>
                </Row>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Col>
      <Col md={4}>
        <Card className="shadow-sm border rounded mt-5 mt-md-0">
          <ListGroup variant="flush">
            <ListGroup.Item className="bg-body border-bottom">
              <h3>
                Subtotal ({cartItems.reduce((acc, item) => acc + item.qty, 0)}) items
              </h3>
              <h4 className="text-success fw-bold mt-2">
                {pricing ? formatINR(pricing.subtotal) : formatINR(cartItems.reduce((acc, item) => acc + item.qty * item.price, 0))}
              </h4>
              {pricing && (
                <div className="mt-3" style={{ fontSize: '0.9rem' }}>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Item discounts</span>
                    <span className="fw-semibold">- {formatINR(pricing.itemDiscountTotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-secondary mb-1">
                    <span>Cart discount ({pricing.cartDiscountPercent}%)</span>
                    <span className="fw-semibold">- {formatINR(pricing.cartDiscountAmount)}</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2 mt-2 border-top">
                    <span className="fw-bold text-dark">Total</span>
                    <span className="fw-bold text-dark">{formatINR(pricing.total)}</span>
                  </div>
                  <div className="mt-2 rounded px-3 py-2 fw-bold" style={{ background: '#ecfdf5', color: '#065f46' }}>
                    You saved {formatINR(pricing.totalDiscount)}
                  </div>
                </div>
              )}
            </ListGroup.Item>
            <ListGroup.Item className="bg-body py-3">
              <Button
                type="button"
                className="w-100 rounded-pill btn-success fw-bold p-2 shadow-sm"
                disabled={cartItems.length === 0}
                onClick={checkoutHandler}
              >
                {pricingLoading ? 'Calculating...' : 'Proceed To Checkout'}
              </Button>
            </ListGroup.Item>
          </ListGroup>
        </Card>
      </Col>
    </Row>
  );
};

export default CartScreen;
