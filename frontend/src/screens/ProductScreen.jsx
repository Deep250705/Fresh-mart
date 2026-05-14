import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Row, Col, Image, ListGroup, Card, Button, Form } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../slices/cartSlice';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { notifyError, notifySuccess } from '../utils/notify';
import { apiClient } from '../utils/apiClient';
import { formatINR } from '../utils/format';

/* ---------- Helper: render 5-star rating ---------- */
const StarRating = ({ rating = 0, count = 0 }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<FaStar key={i} className="star text-warning" />);
    } else if (rating >= i - 0.5) {
      stars.push(<FaStarHalfAlt key={i} className="star text-warning" />);
    } else {
      stars.push(<FaRegStar key={i} className="star empty text-warning" />);
    }
  }
  return (
    <div className="product-rating d-flex align-items-center">
      <div className="me-2">{stars}</div>
      {count > 0 && <span className="rating-count text-muted fw-bold">({count} reviews)</span>}
    </div>
  );
};

const InteractiveStarRating = ({ rating, setRating }) => {
  const [hover, setHover] = useState(null);

  return (
    <div className="d-flex align-items-center mb-3">
      {[...Array(5)].map((star, index) => {
        const currentRating = index + 1;
        return (
          <label key={index} style={{ cursor: 'pointer', marginRight: '4px' }}>
            <input
              type="radio"
              name="rating"
              value={currentRating}
              onClick={() => setRating(currentRating)}
              style={{ display: 'none' }}
            />
            <FaStar
              size={28}
              color={currentRating <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
              onMouseEnter={() => setHover(currentRating)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: 'color 200ms' }}
            />
          </label>
        );
      })}
    </div>
  );
};

const ProductScreen = () => {
  const { id: productId } = useParams();
  const [product, setProduct] = useState({});
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const dispatch = useDispatch();
  const location = useLocation();
  
  const { userInfo } = useSelector((state) => state.auth);
  
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await apiClient.get(`/api/products/${productId}`);
        setProduct(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (product.name && location.hash === '#reviews') {
      setTimeout(() => {
        const el = document.getElementById('reviews');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [product.name, location.hash]);

  const { cartItems } = useSelector((state) => state.cart);

  const displayVariants = product.pricingOptions?.length > 0 
     ? product.pricingOptions 
     : [];

  const addVariantToCart = (variant) => {
      dispatch(addToCart({ 
         ...product, 
         qty: 1, 
         price: variant.price, 
         weight: variant.weight,
         unit: variant.weight,
         countInStock: variant.countInStock || 0,
      }));
  };

  const updateVariantCart = (variant, newQty) => {
      if (newQty === 0) {
         dispatch(removeFromCart({ id: product._id, weight: variant.weight }));
      } else {
         dispatch(addToCart({
            ...product,
            qty: newQty,
            price: variant.price,
            weight: variant.weight,
            unit: variant.weight,
            countInStock: variant.countInStock || 0,
         }));
      }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setReviewError('');
    if (rating === 0) {
      setReviewError('Please select a rating.');
      return;
    }
    setSubmittingReview(true);
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      await apiClient.post(`/api/products/${productId}/reviews`, { rating, comment }, config);
      notifySuccess('Review submitted successfully');
      setRating(0);
      setComment('');
      // refetch product to show new review
      const { data } = await apiClient.get(`/api/products/${productId}`);
      setProduct(data);
    } catch (error) {
      console.error(error);
      notifyError(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
      <Link className="btn btn-outline-secondary my-3 rounded shadow-sm" to="/">
        &larr; Go Back
      </Link>
      {product.name ? (
        <Row className="fade-in">
          <Col md={5}>
            <Image src={product.image} alt={product.name} fluid className="rounded shadow-sm border" />
          </Col>
          <Col md={4}>
            <ListGroup variant="flush" className="bg-transparent shadow-sm border rounded">
              <ListGroup.Item className="bg-transparent border-bottom d-flex justify-content-between align-items-center">
                <h3>{product.name}</h3>

              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom">
                <StarRating rating={product.rating} count={product.numReviews} />
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom text-success fs-4 fw-bold">
                {product?.discountInfo?.percent > 0 ? (
                  <div className="d-flex align-items-end gap-2">
                    <span className="text-muted fs-5 fw-normal">Starting from</span>
                    <span>{formatINR(product.discountInfo.finalPrice)}</span>
                    <span className="text-muted fs-5 fw-normal text-decoration-line-through">{formatINR(product.discountInfo.originalPrice)}</span>
                  </div>
                ) : (
                  <><span className="text-muted fs-5 fw-normal">Starting from</span> {formatINR(product?.pricingOptions?.[0]?.price || 0)}</>
                )}
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent border-bottom">
                <span className="fw-bold">Brand:</span> {product.brand}
              </ListGroup.Item>
              <ListGroup.Item className="bg-transparent">
                <span className="fw-bold">Description:</span> {product.description}
              </ListGroup.Item>
            </ListGroup>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border rounded bg-body">
              <ListGroup variant="flush" className="bg-transparent">
                <ListGroup.Item className="bg-transparent border-bottom">
                  <Row>
                    <Col>Price:</Col>
                    <Col className="fw-bold text-success">
                      {product?.discountInfo?.percent > 0 ? (
                        <div className="d-flex align-items-end gap-2 justify-content-end">
                          <span className="text-muted fs-6 fw-normal">Starting</span>
                          <span>{formatINR(product.discountInfo.finalPrice)}</span>
                          <span className="text-muted fs-6 fw-normal text-decoration-line-through">{formatINR(product.discountInfo.originalPrice)}</span>
                        </div>
                      ) : (
                        <><span className="text-muted fs-6 fw-normal">Starting</span> {formatINR(product?.pricingOptions?.[0]?.price || 0)}</>
                      )}
                    </Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item className="bg-transparent border-bottom">
                  <Row>
                    <Col>Status:</Col>
                    <Col>
                      {(product.pricingOptions && product.pricingOptions.some(v => v.countInStock > 0)) ? (
                        <span className="text-success"><i className="bi bi-check-circle-fill me-1"></i>In Stock</span>
                      ) : (
                        <span className="text-danger"><i className="bi bi-x-circle-fill me-1"></i>Out Of Stock</span>
                      )}
                    </Col>
                  </Row>
                </ListGroup.Item>
                
                <ListGroup.Item className="bg-transparent border-0 mt-3 p-0 pb-3">
                  <h6 className="fw-bold px-3 mb-2 text-dark">Available Options</h6>
                  {displayVariants.map((variant, idx) => {
                    const cartRec = cartItems.find(x => x._id === product._id && x.weight === variant.weight);
                    const vQty = cartRec ? cartRec.qty : 0;
                    
                    return (
                      <div key={idx} className="d-flex align-items-center bg-white border border-success-subtle rounded p-3 mx-2 mb-2 shadow-sm justify-content-between">
                         <div className="d-flex flex-column">
                            <span className="fw-bold text-dark fs-6">{variant.weight}</span>
                            <span className="text-success fw-bold">{formatINR(variant.price)}</span>
                         </div>
                         <div style={{ width: '110px' }}>
                            {vQty === 0 ? (
                               <Button variant="success" className="w-100 rounded fw-bold py-2 shadow-sm" onClick={() => addVariantToCart(variant)}>
                                 ADD
                               </Button>
                            ) : (
                               <div className="d-flex align-items-center justify-content-between stepper-container border-success bg-success-subtle rounded py-1 px-1">
                                 <Button variant="link" className="text-success fw-bold p-0 px-2 text-decoration-none fs-5" onClick={() => updateVariantCart(variant, vQty - 1)}>-</Button>
                                 <span className="fw-bold fs-5 px-2">{vQty}</span>
                                 <Button
                                   variant="link"
                                   className="text-success fw-bold p-0 px-2 text-decoration-none fs-5"
                                   onClick={() => updateVariantCart(variant, Math.min(vQty + 1, variant.countInStock || vQty + 1))}
                                   disabled={vQty >= (variant.countInStock || 0)}
                                 >
                                   +
                                 </Button>
                               </div>
                            )}
                         </div>
                      </div>
                    );
                  })}
                </ListGroup.Item>
              </ListGroup>
            </Card>
          </Col>
        </Row>
      ) : (
        <h2 className="mt-5 text-center text-muted">Loading product...</h2>
      )}

      {/* REVIEWS SECTION */}
      {product.name && (
        <Row className="mt-5 fade-in" id="reviews">
          <Col md={6}>
            <h3 className="mb-4">Customer Reviews</h3>
            {product.reviews && product.reviews.length === 0 && <div className="alert alert-info">No Reviews</div>}
            <ListGroup variant="flush" className="mb-4">
              {product.reviews && product.reviews.map((review) => (
                <ListGroup.Item key={review._id} className="bg-transparent border-bottom pb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>{review.name}</strong>
                    <small className="text-muted">{review.createdAt?.substring(0, 10)}</small>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="mt-2 text-secondary mb-0">{review.comment}</p>
                </ListGroup.Item>
              ))}
            </ListGroup>

            {userInfo && userInfo.role === 'user' ? (
              <Card className="shadow-sm border rounded bg-body p-4">
                <h4 className="mb-3">Write a Customer Review</h4>
                <Form onSubmit={submitHandler}>
                  <Form.Group className="mb-3" controlId="rating">
                    <Form.Label className="fw-bold fs-5 text-secondary">Your Rating</Form.Label>
                    <InteractiveStarRating rating={rating} setRating={setRating} />
                    {reviewError && <div className="text-danger mt-1 fs-6">{reviewError}</div>}
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="comment">
                    <Form.Label>Comment</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                      placeholder="Share your thoughts about this product..."
                    ></Form.Control>
                  </Form.Group>
                  <Button type="submit" variant="success" className="px-4 fw-bold shadow-sm" disabled={submittingReview}>
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </Form>
              </Card>
            ) : (
              <div className="alert alert-info py-3">
                Please <Link to="/login" className="fw-bold text-decoration-none">sign in</Link> as a user to write a review.
              </div>
            )}
          </Col>
        </Row>
      )}
    </>
  );
};

export default ProductScreen;
