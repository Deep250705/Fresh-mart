import express from 'express';
import { getAdminStats, getVendorStats } from '../controllers/dashboardController.js';
import { protect, admin, vendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/admin').get(protect, admin, getAdminStats);
router.route('/vendor').get(protect, vendor, getVendorStats);

export default router;
