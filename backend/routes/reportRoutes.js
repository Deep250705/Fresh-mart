import express from 'express';
import { downloadAnalyticsReport, downloadAnalyticsReportPdf } from '../controllers/reportController.js';
import { protect, vendor } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/analytics', protect, vendor, downloadAnalyticsReport);
router.get('/analytics/pdf', protect, vendor, downloadAnalyticsReportPdf);

export default router;
