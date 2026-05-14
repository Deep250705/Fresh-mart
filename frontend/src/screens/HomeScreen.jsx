import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FaTruck, FaLeaf, FaTags, FaUndo } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import ProductCarousel from '../components/ProductCarousel';
import DailySmartBundles from '../components/DailySmartBundles';
import { apiClient } from '../utils/apiClient';
import { addToCart } from '../slices/cartSlice';
import { formatINR } from '../utils/format';

const HomeScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector(state => state.auth);

  const [categories, setCategories] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        const { data: latest } = await apiClient.get('/api/products');
        setLatestProducts(latest.products);

        const { data: top } = await apiClient.get('/api/products/top');
        setTopProducts(top);

        const { data: recs } = await apiClient.get('/api/products/recommendations');
        setRecommended(recs);

        const { data: cats } = await apiClient.get('/api/categories');
        setCategories(cats);
      } catch (err) {
        setError(err.message || 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="home-screen-wrapper fade-in" style={{ backgroundColor: '#f9fbf9' }}>
      <ProductCarousel />

      {/* ── Value & Trust Section ── */}
      <section className="container-fluid bg-white py-4 shadow-sm border-bottom mb-4">
        <div className="container-fluid">
           <div className="row g-3 text-center justify-content-center">
             <div className="col-6 col-md-3">
               <div className="d-flex flex-column align-items-center">
                 <FaTruck className="text-success mb-2" size={28} />
                 <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>Fast Delivery</span>
               </div>
             </div>
             <div className="col-6 col-md-3">
               <div className="d-flex flex-column align-items-center">
                 <FaLeaf className="text-success mb-2" size={28} />
                 <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>Fresh Products</span>
               </div>
             </div>
             <div className="col-6 col-md-3">
               <div className="d-flex flex-column align-items-center">
                 <FaTags className="text-success mb-2" size={28} />
                 <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>Best Prices</span>
               </div>
             </div>
             <div className="col-6 col-md-3">
               <div className="d-flex flex-column align-items-center">
                 <FaUndo className="text-success mb-2" size={28} />
                 <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>Easy Returns</span>
               </div>
             </div>
           </div>
        </div>
      </section>

      <div className="container-fluid">
        {error && (
          <div className="alert alert-danger shadow-sm border w-100 mt-3">
            {error}
          </div>
        )}

        {userInfo && (
          <div className="welcome-banner mb-5 text-center mt-3">
            <h2 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>Welcome back, {userInfo.name.split(' ')[0]} 👋</h2>
            <p className="text-secondary fw-semibold">We found some great items for you today!</p>
          </div>
        )}

        {/* ── Shop by Category ── */}
        {categories.length > 0 && (
          <section className="home-section mb-5">
            <div className="d-flex overflow-auto gap-4 pb-3 hide-scrollbar" style={{ paddingLeft: '10px' }}>
              {categories.map((cat) => (
                <div 
                  key={cat._id} 
                  onClick={() => navigate(`/product/search?category=${cat._id}`)}
                  className="d-flex flex-column align-items-center text-decoration-none category-circle-item flex-shrink-0"
                  style={{ cursor: 'pointer', minWidth: '95px' }}
                >
                  <div 
                    className="rounded-circle overflow-hidden mb-2 shadow-sm border border-2 border-white d-flex align-items-center justify-content-center" 
                    style={{ width: '85px', height: '85px', background: '#f3f6f4', transition: 'all 0.3s' }}
                  >
                    <img src={cat.image} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span className="fw-bold text-center text-dark" style={{ fontSize: '0.85rem' }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Daily Smart Bundles Engine ── */}
      <DailySmartBundles products={latestProducts} />

      {/* ── Best Sellers (Grid Breaker) ── */}
      <section className="container-fluid bg-white py-5 mb-4">
        <div className="container-fluid">
          <h2 className="section-title mb-1">
            🔥 Best Sellers
            <span className="title-badge">Most Loved</span>
          </h2>
          <p className="text-muted fw-bold mb-4" style={{ paddingLeft: '17px' }}>Highest rated by local customers.</p>
          
          {topProducts.length === 0 ? (
            <div className="alert alert-info shadow-sm border w-100">
              No products mapped yet.
            </div>
          ) : (
            <div className="products-grid">
              {topProducts.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── New Arrivals ── */}
      <section className="container-fluid py-5 bg-transparent mb-4">
        <div className="container-fluid">
          <h2 className="section-title mb-1">
            🆕 New Arrivals
            <span className="title-badge">Just In</span>
          </h2>
          <p className="text-muted fw-bold mb-4" style={{ paddingLeft: '17px' }}>Recently added seasonal produce.</p>
          
          {latestProducts.length === 0 ? (
            <p className="text-muted">No items listed.</p>
          ) : (
            <div className="products-grid">
              {latestProducts.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Recommended For You ── */}
      {recommended.length > 0 && (
        <section className="container-fluid bg-white py-5 mb-5 border-top shadow-sm">
          <div className="container-fluid">
            <h2 className="section-title mb-1">
              ✨ Recommended For You
              <span className="title-badge bg-warning text-dark">Personalized</span>
            </h2>
            <p className="text-muted fw-bold mb-4" style={{ paddingLeft: '17px' }}>Handpicked selections matching your taste.</p>
            
            <div className="products-grid">
              {recommended.map((product) => (
                <ProductCard key={`rec-${product._id}`} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomeScreen;