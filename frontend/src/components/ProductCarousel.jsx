import React, { useEffect, useState } from 'react';
import { Carousel, Form, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const HERO_CAPTIONS = [
  { headline: 'Fresh Groceries Delivered Fast', sub: 'Farm-fresh produce straight to your door' },
  { headline: 'Organic & Healthy Picks', sub: 'Handpicked for quality and freshness' },
  { headline: 'Best Deals Every Day', sub: 'Save big on your favourite products' },
  { headline: 'Stock Up & Save', sub: 'Exclusive discounts on bulk orders' },
  { headline: 'New Arrivals Are Here!', sub: 'Discover the latest seasonal produce' },
];

const ProductCarousel = () => {
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        setCategories(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  const submitHandler = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/product/search?keyword=${keyword}`);
    } else {
      navigate('/product/search');
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="position-relative hero-container mb-5">
      <Carousel
        pause="hover"
        className="hero-carousel mb-0"
        interval={3000}
        fade
        controls={false}
        indicators={false}
      >
        {categories.slice(0, 5).map((category, idx) => {
          return (
            <Carousel.Item key={category._id} className="hero-carousel-item">
              <Link to={`/product/search?category=${category._id}`} style={{ display: 'block' }}>
                <div style={{ background: '#000' }}>
                  <img
                    src={category.image}
                    alt={category.name}
                    className="d-block w-100 opacity-50"
                    style={{ height: '420px', objectFit: 'cover' }}
                  />
                </div>
              </Link>
            </Carousel.Item>
          );
        })}
      </Carousel>
      
      {/* Absolute Overlay Layer */}
      <div className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center" style={{ top: 0, left: 0, zIndex: 10, pointerEvents: 'none' }}>
         <h1 className="text-white fw-bold mb-4 text-center" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', fontSize: '2.5rem' }}>What are you craving today?</h1>
         
         {/*<Form onSubmit={submitHandler} className="d-flex bg-white rounded-pill p-1 shadow-lg" style={{ width: '85%', maxWidth: '650px', pointerEvents: 'auto' }}>
             <Form.Control 
              type="text" 
              name="q" 
              onChange={(e) => setKeyword(e.target.value)} 
              placeholder="Search for fresh groceries..." 
              className="hero-search-input border-0 shadow-none px-4 rounded-pill flex-grow-1 fw-bold text-secondary" 
              style={{ fontSize: '1.1rem' }}
            />
            <Button type="submit" variant="success" className="rounded-pill px-4 fw-bold fs-5">Search</Button>
         </Form> */}
         
         <div className="d-flex gap-2 mt-4 flex-wrap justify-content-center" style={{ pointerEvents: 'auto' }}>
           {categories.slice(0, 5).map(c => (
              <Button 
                key={c._id} 
                variant="light" 
                className="rounded-pill px-3 py-1 fw-bold border-0 shadow-sm category-chip bg-white bg-opacity-75"
                style={{ fontSize: '0.85rem' }} 
                onClick={() => navigate(`/product/search?category=${c._id}`)}
              >
                {c.name}
              </Button>
           ))}
         </div>
      </div>
    </div>
  );
};

export default ProductCarousel;
