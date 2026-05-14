import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
  getRecommendations,
} from '../controllers/productController.js';
import { protect, vendor, approvedVendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/').get(getProducts).post(protect, approvedVendor, createProduct);
router.get('/recommendations', getRecommendations);
router.get('/top', getTopProducts);
router.route('/:id').get(getProductById).put(protect, approvedVendor, updateProduct).delete(protect, approvedVendor, deleteProduct);
router.route('/:id/reviews').post(protect, createProductReview);

export default router;
