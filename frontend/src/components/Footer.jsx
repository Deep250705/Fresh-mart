import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white pt-5 pb-3">
      <Container fluid className="px-5">
        <Row>
          <Col className="text-center">
            <p className="mb-0">Green Leaf Grocers &copy; {currentYear}</p>
            <small className="text-muted">Fresh & Organic Groceries at Your Doorstep</small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
