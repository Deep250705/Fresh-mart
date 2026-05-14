import express from 'express';
import {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  createRazorpayOrder,
  downloadInvoice,
  packOrder,
  assignDeliveryAgent
} from '../controllers/orderController.js';
import { protect, admin, vendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, addOrderItems).get(protect, vendor, getOrders);
router.route('/mine').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/razorpay').post(protect, createRazorpayOrder);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/pack').put(protect, vendor, packOrder);
router.route('/:id/assign').put(protect, vendor, assignDeliveryAgent);
router.route('/:id/deliver').put(protect, vendor, updateOrderToDelivered);
router.route('/:id/invoice').get(protect, downloadInvoice);

export default router;
