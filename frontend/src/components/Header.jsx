import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Navbar, Nav, Container, Badge, Form, Button, NavDropdown, Row, Col } from 'react-bootstrap';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaLeaf, FaSearch } from 'react-icons/fa';
import { LinkContainer } from 'react-router-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { logout } from '../slices/authSlice';
import logo from "../../logo/green_leaf_logo_transparent.png";

const Header = () => {
  const [categories, setCategories] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const wrapperRef = useRef(null);
  
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const dispatch = useDispatch();

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

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
  const navigate = useNavigate();
  const location = useLocation();

  const logoutHandler = async () => {
    try {
      await axios.post('/api/users/logout');
      dispatch(logout());
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };
  const { cartItems } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.auth);

  const cartCount = cartItems.reduce((a, c) => a + c.qty, 0);

  return (
    <header className="sticky-top shadow-sm" style={{ zIndex: 1040 }}>
      <Navbar variant="dark" expand="lg" collapseOnSelect className="navbar-custom-bg py-3 mb-4">
        <Container fluid className="flex-column px-4 px-lg-5">
          {/* Top Row: Brand, Nav Links, User section */}
          <div className="d-flex justify-content-between align-items-center w-100">
            <LinkContainer to="/">
              <Navbar.Brand className="brand-text fs-3 text-white">
                 {/* <img src={logo} alt="Logo" className="nav-logo me-2" onError={(e) => { e.target.style.display = 'none'; }} /> */}
                 <FaLeaf className="me-2 text-warning"/>
                 Green Leaf Grocers
              </Navbar.Brand>
            </LinkContainer>
            
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            
            <Navbar.Collapse id="basic-navbar-nav" className="w-100 flex-grow-1">
               <Nav className="mx-auto gap-4 align-items-center mt-3 mt-lg-0">
                 <LinkContainer to="/">
                   <Nav.Link className={`fw-bold main-nav-link ${location.pathname === '/' ? 'active-link' : ''}`}>Home</Nav.Link>
                 </LinkContainer>
                 <NavDropdown 
                   title={<span onClick={() => navigate('/product')} className="fw-bold">Products</span>} 
                   id="products-dropdown"
                   className={`main-nav-dropdown ${location.pathname.startsWith('/product') ? 'active-link' : ''}`}
                 >
                    <NavDropdown.Item as={Link} to="/product" className="fw-bold text-success">All Products</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item as={Link} to="/product?sort=newest">New Arrivals</NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/product?sort=rating">Recommended for You</NavDropdown.Item>
                 </NavDropdown>

                 {userInfo && (
                    <LinkContainer to={userInfo.role === 'admin' ? '/admin/dashboard' : userInfo.role === 'vendor' ? '/vendor/dashboard' : '/profile'}>
                      <Nav.Link className={`fw-bold main-nav-link ${location.pathname.includes('dashboard') || location.pathname === '/profile' ? 'active-link' : ''}`}>Dashboard</Nav.Link>
                    </LinkContainer>
                 )}
               </Nav>

               <Nav className="ms-auto align-items-center mt-3 mt-lg-0">
                 {(!userInfo || userInfo.role === 'user') && (
                  <LinkContainer to="/cart">
                    <Nav.Link className="d-flex align-items-center me-3 text-white">
                      <FaShoppingCart className="me-1" /> Cart
                      {cartCount > 0 && (
                        <Badge pill bg="warning" text="dark" className="ms-1">
                          {cartCount}
                        </Badge>
                      )}
                    </Nav.Link>
                  </LinkContainer>
                 )}
                 {userInfo ? (
                    <NavDropdown title={<><FaUser className="me-1"/> {userInfo.name}</>} id="username-dropdown" className="fw-bold main-nav-dropdown text-white">
                      <NavDropdown.Item onClick={logoutHandler} className="text-danger fw-bold">
                        <FaSignOutAlt className="me-1" /> Logout
                      </NavDropdown.Item>
                    </NavDropdown>
                  ) : (
                    <>
                      <LinkContainer to="/login">
                        <Nav.Link className="d-flex align-items-center main-nav-link text-white"><FaUser className="me-1" /> Sign In</Nav.Link>
                      </LinkContainer>
                      <LinkContainer to="/register">
                        <Nav.Link className="d-flex align-items-center ms-lg-3 btn btn-success rounded-pill px-4 py-2 mt-3 mt-lg-0 text-white shadow-sm fw-bold border-0 hover-lift">Register Now</Nav.Link>
                      </LinkContainer>
                    </>
                 )}
               </Nav>
            </Navbar.Collapse>
          </div>

          {/* Bottom Row: Separator & Search Bar */}
          <div className="w-100 mt-3 position-relative d-flex justify-content-center">
            <div className="search-separator position-absolute w-100" style={{ top: '-10px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}></div>
            <div ref={wrapperRef} className="w-100 position-relative" style={{ maxWidth: '650px' }}>
               <Form onSubmit={(e) => { 
                   e.preventDefault(); 
                   let q = `?`;
                   if (keyword) q += `keyword=${keyword}&`;
                   if (category) q += `category=${category}&`;
                   if (minPrice) q += `minPrice=${minPrice}&`;
                   if (maxPrice) q += `maxPrice=${maxPrice}&`;
                   navigate(`/product/search${q}`);
                   setShowFilter(false); 
                 }} 
                 className="bg-white rounded-pill d-flex p-1 search-bar-wrapper shadow-lg"
               >
                  <div className="d-flex align-items-center ps-3 text-secondary">
                     <FaSearch size={18} />
                  </div>
                  <Form.Control
                    type="search"
                    name="search"
                    placeholder="Search for groceries, fruits, vegetables.."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="border-0 shadow-none bg-transparent px-3 py-2 flex-grow-1 text-dark fw-medium"
                    style={{ fontSize: '0.95rem' }}
                    aria-label="Search"
                    onFocus={() => setShowFilter(true)}
                  />
                  <Button type="submit" className="px-4 fw-bold search-btn-custom rounded-pill">Search</Button>
               </Form>
               {showFilter && (
                 <div 
                   className="position-absolute bg-white shadow-lg rounded-4 w-100 mt-3 p-4 border" 
                   style={{top: '100%', left: 0, zIndex: 1050}}
                 >
                   <h5 className="text-success fw-bold border-bottom pb-2 mb-3">Filter Search</h5>
                   
                   <Form.Group className="mb-3">
                     <Form.Label className="fw-bold small text-secondary">Search Keyword</Form.Label>
                     <Form.Control autoFocus type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. Organic Bananas" className="shadow-sm border-success-subtle" />
                   </Form.Group>
                   
                   <Form.Group className="mb-3">
                     <Form.Label className="fw-bold small text-secondary">Category Group</Form.Label>
                     <Form.Select value={category} onChange={(e) => setCategory(e.target.value)} className="shadow-sm border-success-subtle">
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                     </Form.Select>
                   </Form.Group>
                   
                   <Row>
                     <Col>
                       <Form.Group className="mb-4">
                         <Form.Label className="fw-bold small text-secondary">Min Price (Rs)</Form.Label>
                         <Form.Control type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="shadow-sm border-success-subtle" />
                       </Form.Group>
                     </Col>
                     <Col>
                       <Form.Group className="mb-4">
                         <Form.Label className="fw-bold small text-secondary">Max Price (Rs)</Form.Label>
                         <Form.Control type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="shadow-sm border-success-subtle" />
                       </Form.Group>
                     </Col>
                   </Row>
                   
                   <Button 
                     type="button" 
                     variant="success" 
                     className="w-100 rounded-pill shadow-sm fw-bold py-2 mt-2"
                     onClick={() => {
                        let q = `?`;
                        if (keyword) q += `keyword=${keyword}&`;
                        if (category) q += `category=${category}&`;
                        if (minPrice) q += `minPrice=${minPrice}&`;
                        if (maxPrice) q += `maxPrice=${maxPrice}&`;
                        navigate(`/product/search${q}`);
                        setShowFilter(false); 
                     }}
                   >
                     Apply Filters & Browse Market
                   </Button>
                 </div>
               )}
            </div>
          </div>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
