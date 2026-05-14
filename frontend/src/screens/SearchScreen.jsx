import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Form, Button, Card } from 'react-bootstrap';
import ProductCard from '../components/ProductCard';
import axios from 'axios';

const SearchScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const kw = queryParams.get('keyword');
  const min = queryParams.get('minPrice');
  const max = queryParams.get('maxPrice');
  const cat = queryParams.get('category');
  const sort = queryParams.get('sort');

  let pageTitle = "All Products";
  if (kw || min || max || cat) {
    pageTitle = "Search Results";
  } else if (sort === 'newest') {
    pageTitle = "New Arrivals";
  } else if (sort === 'rating') {
    pageTitle = "Recommended for You";
  }

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        setCategories(data);
      } catch (err) {
        console.error('Failed to fetch categories');
      }
    };
    fetchCats();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [kw, min, max, cat, sort]);

  useEffect(() => {
    const fetchSearch = async () => {
      setLoading(true);
      try {
        let q = `/api/products?page=${currentPage}&limit=20&`;
        
        if (kw) q += `keyword=${kw}&`;
        if (min) q += `minPrice=${min}&`;
        if (max) q += `maxPrice=${max}&`;
        if (cat) q += `category=${cat}&`;

        const { data } = await axios.get(q);
        let fetchedProducts = data.products || [];
        
        if (sort === 'rating') {
           fetchedProducts.sort((a, b) => b.rating - a.rating);
        }
        
        setProducts(fetchedProducts);
        setTotalPages(data.pages || 1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, currentPage]);

  const removeFilter = (keyToRemove) => {
    const params = new URLSearchParams(location.search);
    params.delete(keyToRemove);
    navigate(`/product/search?${params.toString()}`);
  }

  // Smooth scroll up on page turn
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <Row className="mt-4 fade-in">
      <Col md={12}>
        <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
          <h2 className="text-success m-0">{pageTitle}</h2>
          
          {/* Active Filter Chips */}
          <div className="d-flex gap-2">
            {kw && <Button variant="light" size="sm" onClick={() => removeFilter('keyword')} className="rounded-pill border shadow-sm fw-bold">&quot; {kw} &quot; &times;</Button>}
            {cat && <Button variant="light" size="sm" onClick={() => removeFilter('category')} className="rounded-pill border shadow-sm fw-bold">Category Filter &times;</Button>}
            {min && <Button variant="light" size="sm" onClick={() => removeFilter('minPrice')} className="rounded-pill border shadow-sm fw-bold">Min: ₹{min} &times;</Button>}
            {max && <Button variant="light" size="sm" onClick={() => removeFilter('maxPrice')} className="rounded-pill border shadow-sm fw-bold">Max: ₹{max} &times;</Button>}
            {(kw || cat || min || max) && (
               <Button variant="link" size="sm" onClick={() => navigate('/product/search')} className="text-danger fw-bold text-decoration-none">Clear All</Button>
            )}
          </div>
        </div>
        
        {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              {[...Array(12)].map((_, i) => (
                 <div key={i} className="skeleton-card" style={{ height: '360px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeletonPulse 1.5s infinite', borderRadius: '14px', border: '1px solid #e8ede9' }}></div>
              ))}
            </div>
        ) : products.length === 0 ? (
           <div className="alert alert-info border shadow-sm text-center py-5 rounded-4">
              <h4 className="fw-bold mb-3">No delicious products found!</h4>
              <p className="text-secondary">Try removing some of your active filters to see more results.</p>
           </div>
        ) : (
           <>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
               {products.map((product) => (
                  <div key={product._id} className="mb-4">
                     <ProductCard product={product} />
                  </div>
               ))}
             </div>
             
             {/* Pagination Controls */}
             {totalPages > 1 && (
               <div className="d-flex justify-content-center align-items-center mt-5 mb-5 gap-2">
                 <Button 
                   variant="outline-success" 
                   disabled={currentPage === 1}
                   onClick={() => setCurrentPage(prev => prev - 1)}
                   className="fw-bold px-3 rounded-pill"
                 >
                   Prev
                 </Button>
                 
                 <div className="d-flex gap-2 mx-2">
                    {[...Array(totalPages)].map((_, i) => (
                      <Button 
                        key={i+1} 
                        variant={currentPage === i+1 ? "success" : "outline-success"} 
                        onClick={() => setCurrentPage(i+1)}
                        className="fw-bold d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '38px', height: '38px', borderRadius: '10px' }}
                      >
                        {i+1}
                      </Button>
                    ))}
                 </div>
                 
                 <Button 
                   variant="outline-success" 
                   disabled={currentPage === totalPages || totalPages === 0}
                   onClick={() => setCurrentPage(prev => prev + 1)}
                   className="fw-bold px-3 rounded-pill"
                 >
                   Next
                 </Button>
               </div>
             )}
           </>
        )}
      </Col>
    </Row>
  );
};

export default SearchScreen;
