import express from 'express';
import {
  authAgent,
  logoutAgent,
  createAgent,
  getAgents,
  getMyOrders,
  updateAgentOrderStatus,
  getAgentStats
} from '../controllers/deliveryAgentController.js';
import { protect, admin, vendor, protectAgent } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', authAgent);
router.post('/logout', logoutAgent);
router.post('/', protect, admin, createAgent);
router.get('/', protect, vendor, getAgents);
router.get('/orders', protectAgent, getMyOrders);
router.get('/stats', protectAgent, getAgentStats);
router.put('/orders/:id/status', protectAgent, updateAgentOrderStatus);

export default router;
