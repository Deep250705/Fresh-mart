import asyncHandler from '../utils/asyncHandler.js';
import { getReportAnalyticsDataset } from '../services/reportAnalyticsService.js';
import { buildAnalyticsReportWorkbook } from '../services/excelReportService.js';
import PDFDocument from 'pdfkit';

const buildReportFilename = () => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `analytics-report-${stamp}.xlsx`;
};

const buildPdfFilename = () => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `analytics-report-${stamp}.pdf`;
};

const projectDatasetByRole = ({ user, rawData, analytics }) => {
  if (user.role === 'admin') {
    return { rawData, analytics };
  }

  if (user.role === 'vendor') {
    return {
      rawData: rawData.map((row) => ({
        ...row,
        platformProfit: undefined,
        deliveryProfit: undefined,
        deliveryEarnings: undefined,
      })),
      analytics: {
        ...analytics,
        totals: {
          revenue: analytics.totals.revenue,
          vendorEarnings: analytics.totals.vendorEarnings,
          items: analytics.totals.items,
          orders: analytics.totals.orders,
        },
        salesByDate: analytics.salesByDate.map((row) => ({
          date: row.date,
          revenue: row.revenue,
          vendorEarnings: row.vendorEarnings,
          quantity: row.quantity,
        })),
        salesByCategory: analytics.salesByCategory.map((row) => ({
          category: row.category,
          revenue: row.revenue,
          vendorEarnings: row.vendorEarnings,
          quantity: row.quantity,
        })),
        salesByVendor: analytics.salesByVendor.map((row) => ({
          vendorId: row.vendorId,
          vendor: row.vendor,
          revenue: row.revenue,
          vendorEarnings: row.vendorEarnings,
          quantity: row.quantity,
        })),
        salesByProduct: analytics.salesByProduct.map((row) => ({
          productId: row.productId,
          product: row.product,
          category: row.category,
          revenue: row.revenue,
          vendorEarnings: row.vendorEarnings,
          quantity: row.quantity,
        })),
      },
    };
  }

  return { rawData: [], analytics: { totals: {}, salesByDate: [], salesByCategory: [], salesByVendor: [], salesByProduct: [] } };
};

const downloadAnalyticsReport = asyncHandler(async (req, res) => {
  const { filters, rawData, analytics } = await getReportAnalyticsDataset({
    user: req.user,
    query: req.query,
  });

  const scoped = projectDatasetByRole({ user: req.user, rawData, analytics });
  const workbookBuffer = await buildAnalyticsReportWorkbook({
    rawData: scoped.rawData,
    analytics: scoped.analytics,
    filters,
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${buildReportFilename()}"`
  );

  res.send(workbookBuffer);
});

const downloadAnalyticsReportPdf = asyncHandler(async (req, res) => {
  const { analytics } = await getReportAnalyticsDataset({
    user: req.user,
    query: req.query,
  });
  const scoped = projectDatasetByRole({ user: req.user, rawData: [], analytics });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${buildPdfFilename()}"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text('Marketplace Analytics Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown();

  const totals = scoped.analytics.totals || {};
  Object.entries(totals).forEach(([key, value]) => {
    doc.text(`${key}: ${Number(value || 0).toFixed(2)}`);
  });

  doc.moveDown().fontSize(14).text('Sales by Date');
  (scoped.analytics.salesByDate || []).slice(0, 20).forEach((row) => {
    doc.fontSize(10).text(
      `${row.date} | Revenue: ${Number(row.revenue || 0).toFixed(2)} | Vendor Earnings: ${Number(row.vendorEarnings || 0).toFixed(2)}`
      + (req.user.role === 'admin'
        ? ` | Platform Profit: ${Number(row.platformProfit || 0).toFixed(2)} | Delivery Profit: ${Number(row.deliveryProfit || 0).toFixed(2)}`
        : '')
    );
  });

  doc.end();
});

export { downloadAnalyticsReport, downloadAnalyticsReportPdf };
