import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../slices/cartSlice';
import { FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar, FaEye } from 'react-icons/fa';
import { apiClient } from '../utils/apiClient';
import { formatINR } from '../utils/format';
import { Modal } from 'react-bootstrap';

/* ---------- Helper: render interactive 5-star rating ---------- */
const InteractiveStarRating = ({ rating = 0, count = 0, onRate }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isFull = (hoverRating || rating) >= i;
    const isHalf = !hoverRating && !isFull && rating >= i - 0.5;

    stars.push(
      <button
        key={i}
        type="button"
        className="star-btn p-0 m-0"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          outline: 'none',
          color: '#ffc107',
          display: 'flex',
          alignItems: 'center'
        }}
        onMouseEnter={() => setHoverRating(i)}
        onMouseLeave={() => setHoverRating(0)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRate(i);
        }}
        title={`Rate ${i} stars`}
      >
        {isFull ? (
          <FaStar size={16} />
        ) : isHalf ? (
          <FaStarHalfAlt size={16} />
        ) : (
          <FaRegStar size={16} />
        )}
      </button>
    );
  }

  return (
    <div 
       className="product-rating d-flex align-items-center mb-1"
       onClick={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="me-2 d-flex align-items-center">{stars}</div>
      {count > 0 && <span className="rating-count text-muted fw-bold" style={{ fontSize: '0.8rem' }}>({count})</span>}
    </div>
  );
};

const getBadgeVariant = (percent) => {
  if (percent > 15) return 'badge-red';
  if (percent >= 10) return 'badge-orange';
  return 'badge-green';
};

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [localRating, setLocalRating] = useState(product.rating || 0);
  const [localReviewsCount, setLocalReviewsCount] = useState(product.numReviews || 0);
  const [showQuickView, setShowQuickView] = useState(false);

  useEffect(() => {
    setLocalRating(product.rating || 0);
    setLocalReviewsCount(product.numReviews || 0);
  }, [product]);

  const handleRate = async (newRating) => {
    if (!userInfo || userInfo.role !== 'user') {
      alert('Only registered users can rate products.');
      return;
    }
    const previousRating = localRating;
    const previousCount = localReviewsCount;
    setLocalRating(newRating);
    
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      const { data } = await apiClient.post(`/api/products/${product._id}/reviews`, { rating: newRating }, config);
      setLocalRating(data.rating);
      setLocalReviewsCount(data.numReviews);
      
      // Redirect to the reviews section of the product details
      navigate(`/product/${product._id}#reviews`);
      
    } catch (error) {
      console.error(error);
      setLocalRating(previousRating);
      setLocalReviewsCount(previousCount);
      alert(error.response?.data?.message || 'Failed to submit rating');
    }
  };

  const discountPercent = product?.discountInfo?.percent || 0;
  const finalPrice = product?.discountInfo?.finalPrice ?? (product.pricingOptions?.[0]?.price || 0);
  const originalPrice = product?.discountInfo?.originalPrice ?? (product.pricingOptions?.[0]?.price || 0);

  const { cartItems } = useSelector((state) => state.cart);
  const cartItemsForProduct = cartItems.filter(x => x._id === product._id);
  const totalQty = cartItemsForProduct.reduce((acc, curr) => acc + curr.qty, 0);

  const hasMultipleVariants = product.pricingOptions && product.pricingOptions.length > 0;
  const displayVariants = hasMultipleVariants 
     ? product.pricingOptions 
     : [];

  // Stepper logic strictly for single-variant fallback behavior on the Grid
  const singleFallbackLabel = displayVariants.length > 0 ? displayVariants[0].weight : 'pc';
  const legacyCartItem = cartItems.find(x => x._id === product._id && x.weight === singleFallbackLabel);
  const qty = legacyCartItem ? legacyCartItem.qty : 0;

  const addToSingleCartHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasMultipleVariants) {
        setShowQuickView(true);
        return;
    }
    dispatch(addToCart({
      ...product,
      qty: 1,
      price: displayVariants[0]?.price || 0,
      weight: singleFallbackLabel,
      unit: singleFallbackLabel,
      countInStock: displayVariants[0]?.countInStock || 0,
    }));
  };

  const updateSingleCartHandler = (e, newQty) => {
    e.preventDefault();
    e.stopPropagation();
    if (newQty === 0) {
      dispatch(removeFromCart({ id: product._id, weight: singleFallbackLabel }));
    } else {
      dispatch(addToCart({
        ...product,
        qty: newQty,
        price: displayVariants[0]?.price || 0,
        weight: singleFallbackLabel,
        unit: singleFallbackLabel,
        countInStock: displayVariants[0]?.countInStock || 0,
      }));
    }
  };

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

  return (
    <div className="product-card h-100">
      {/* ── Image Section ── */}
        <div className="product-image-wrapper position-relative">
          <Link to={`/product/${product._id}`} className="text-decoration-none" tabIndex={-1}>
             <img
               src={product.image}
               alt={product.name}
               className="product-image"
             />
          </Link>

          {/* Quick View Button overlaying the image */}
          <button 
            className="btn btn-light rounded-circle shadow quick-view-btn scale-on-hover d-flex align-items-center justify-content-center"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '45px', height: '45px', opacity: 0, transition: 'all 0.3s' }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }}
            title="Quick View"
          >
             <FaEye size={20} className="text-success" />
          </button>

          {/* Discount badge */}
          {discountPercent > 0 && (
            <span
              className={`discount-badge ${getBadgeVariant(discountPercent)}`}
            >
              {discountPercent}% OFF
            </span>
          )}
        </div>

      {/* ── Card Body ── */}
      <div className="card-body">
        {/* Product name */}
        <Link to={`/product/${product._id}`} className="text-decoration-none">
          <div className="product-title text-dark fw-bolder mb-1" style={{ fontSize: '1.05rem', lineHeight: '1.2' }}>{product.name}</div>
        </Link>

        {/* Brand / unit */}
        <div className="product-brand mb-2 fw-medium">{product.brand || product.unit || ''}</div>

        {/* Rating */}
        <div style={{ opacity: 0.85 }}>
          <InteractiveStarRating
            rating={localRating}
            count={localReviewsCount}
            onRate={handleRate}
          />
        </div>

        {/* Price */}
        <div className="mt-1">
          {discountPercent > 0 ? (
            <div className="d-flex align-items-end gap-2">
              <span className="small fw-semibold text-muted">Starting</span>
              <div className="fs-5 fw-bold text-success">{formatINR(finalPrice)}</div>
              <div className="small fw-bold text-muted text-decoration-line-through">{formatINR(originalPrice)}</div>
            </div>
          ) : (
            <div className="product-price">
              <span className="small fw-semibold text-muted me-1">Starting from</span>
              {formatINR(product.pricingOptions?.[0]?.price || 0)}
            </div>
          )}
        </div>

        {/* Add to Cart logic */}
        {hasMultipleVariants ? (
           <button
             className="btn-add-cart mt-2"
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }}
             aria-label={`View variants for ${product.name}`}
           >
             {totalQty > 0 ? (
                <span className="fw-bold">{totalQty} in Cart <span className="ms-1" style={{fontSize:'0.8rem'}}>▼</span></span>
             ) : (
                <span><FaShoppingCart style={{ marginRight: '6px', marginBottom: '2px' }} /> ADD</span>
             )}
           </button>
        ) : (
           qty === 0 ? (
             <button
               className="btn-add-cart mt-2"
               onClick={addToSingleCartHandler}
               id={`add-cart-${product._id}`}
               aria-label={`Add ${product.name} to cart`}
             >
               <FaShoppingCart style={{ marginRight: '6px', marginBottom: '2px' }} />
               ADD
             </button>
           ) : (
             <div className="d-flex align-items-center justify-content-between mt-2 w-100 stepper-container" onClick={(e) => e.preventDefault()}>
               <button className="btn btn-sm btn-success fw-bold flex-shrink-0 stepper-btn" onClick={(e) => updateSingleCartHandler(e, qty - 1)}>-</button>
               <span className="fw-bold px-2 flex-grow-1 text-center" style={{ fontSize: '0.95rem' }}>{qty}</span>
               <button
                 className="btn btn-sm btn-success fw-bold flex-shrink-0 stepper-btn"
                 onClick={(e) => updateSingleCartHandler(e, Math.min(qty + 1, displayVariants[0]?.countInStock || qty + 1))}
                 disabled={qty >= (displayVariants[0]?.countInStock || 0)}
               >
                 +
               </button>
             </div>
           )
        )}
      </div>

      {/* ── Quick View Modal ── */}
      <Modal show={showQuickView} onHide={() => setShowQuickView(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0"></Modal.Header>
        <Modal.Body className="pt-0 pb-4 px-4">
          <div className="row">
            <div className="col-md-5">
              <div className="rounded-4 overflow-hidden shadow-sm" style={{ height: '300px', background: '#f8f9fa' }}>
                 <img src={product.image} alt={product.name} className="w-100 h-100 object-fit-contain" />
              </div>
            </div>
            <div className="col-md-7 d-flex flex-column py-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill align-self-start mb-2 px-3 tracking-wide">{product.category?.name || 'Various'}</span>
              <h2 className="fw-bolder text-dark mb-1">{product.name}</h2>
              <div className="text-muted fw-bold mb-3">{product.brand || product.unit}</div>
              
              <InteractiveStarRating rating={localRating} count={localReviewsCount} onRate={handleRate} />
              
              <div className="my-3">
                 {discountPercent > 0 ? (
                   <div className="d-flex align-items-center gap-3">
                     <span className="text-secondary fw-semibold">Starting from</span>
                     <h3 className="fw-bold text-success m-0">{formatINR(finalPrice)}</h3>
                     <span className="fs-5 text-muted text-decoration-line-through fw-semibold">{formatINR(originalPrice)}</span>
                   </div>
                 ) : (
                   <div className="d-flex align-items-center gap-2">
                     <span className="text-secondary fw-semibold">Starting from</span>
                     <h3 className="fw-bold text-success m-0">{formatINR(product?.pricingOptions?.[0]?.price || 0)}</h3>
                   </div>
                 )}
               </div>
              
              <p className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto' }}>
                 {product.description || 'This product is fresh and brought directly from reliable sources. Perfectly packaged for preserving quality.'}
              </p>

              <div className="mt-auto pt-3 border-top w-100">
                <h6 className="fw-bold mb-3 text-dark">Available Options</h6>
                {displayVariants.map((variant, idx) => {
                  const cartRec = cartItems.find(x => x._id === product._id && x.weight === variant.weight);
                  const vQty = cartRec ? cartRec.qty : 0;
                  
                  return (
                    <div key={idx} className="d-flex align-items-center bg-white border rounded p-2 mb-2 shadow-sm justify-content-between">
                       <div className="d-flex flex-column">
                          <span className="fw-bold text-dark">{variant.weight}</span>
                          <span className="text-success fw-bold">{formatINR(variant.price)}</span>
                       </div>
                       <div style={{ width: '100px' }}>
                          {vQty === 0 ? (
                             <button className="btn btn-outline-success fw-bold w-100 rounded btn-sm py-1" onClick={() => addVariantToCart(variant)}>
                               ADD
                             </button>
                          ) : (
                             <div className="d-flex align-items-center justify-content-between stepper-container border-success bg-success-subtle rounded py-1 px-1">
                               <button className="btn text-success fw-bold p-0 px-2 border-0" onClick={() => updateVariantCart(variant, vQty - 1)}>-</button>
                               <span className="fw-bold fs-6">{vQty}</span>
                               <button
                                 className="btn text-success fw-bold p-0 px-2 border-0"
                                 onClick={() => updateVariantCart(variant, Math.min(vQty + 1, variant.countInStock || vQty + 1))}
                                 disabled={vQty >= (variant.countInStock || 0)}
                               >
                                 +
                               </button>
                             </div>
                          )}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ProductCard;
