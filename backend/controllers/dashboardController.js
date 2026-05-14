import asyncHandler from '../utils/asyncHandler.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';

const MONEY_PRECISION = 100;
const roundMoney = (value) => Math.round((Number(value) || 0) * MONEY_PRECISION) / MONEY_PRECISION;

const getAdminStats = asyncHandler(async (req, res) => {
  const usersCount = await User.countDocuments({});
  const productsCount = await Product.countDocuments({});
  const ordersCount = await Order.countDocuments({});
  
  const sales = await Order.aggregate([
    { $match: { isPaid: true } },
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
      },
    },
  ]);
  const totalSales = sales.length > 0 ? sales[0].totalSales : 0;

  const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'name');

  const salesByDate = await Order.aggregate([
    { $match: { isPaid: true } },
    { $unwind: '$orderItems' },
    { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        sales: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
        platformProfit: {
          $sum: {
            $multiply: [
              '$orderItems.price',
              '$orderItems.qty',
              { $ifNull: ['$orderItems.commissionRate', 0] },
            ],
          },
        },
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const vendorSales = await Order.aggregate([
    { $match: { isPaid: true } },
    { $unwind: '$orderItems' },
    { $group: {
        _id: "$orderItems.vendor",
        totalSales: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
        platformProfit: {
          $sum: {
            $multiply: [
              '$orderItems.price',
              '$orderItems.qty',
              { $ifNull: ['$orderItems.commissionRate', 0] },
            ],
          },
        },
      }
    },
    { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'vendorData'
      }
    },
    { $unwind: {
        path: '$vendorData',
        preserveNullAndEmptyArrays: true
      }
    },
    { $project: {
        _id: 0,
        vendorId: '$_id',
        name: '$vendorData.name',
        store: '$vendorData.vendorDetails.storeName',
        sales: '$totalSales',
        platformProfit: '$platformProfit',
        vendorEarnings: { $subtract: ['$totalSales', '$platformProfit'] },
      }
    },
    { $sort: { sales: -1 } }
  ]);

  const platformProfitAgg = await Order.aggregate([
    { $match: { isPaid: true } },
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: null,
        amount: {
          $sum: {
            $multiply: [
              '$orderItems.price',
              '$orderItems.qty',
              { $ifNull: ['$orderItems.commissionRate', 0] },
            ],
          },
        },
      },
    },
  ]);

  const deliveryAgg = await Order.aggregate([
    { $match: { isPaid: true, deliveryMethod: 'Third-Party' } },
    {
      $group: {
        _id: null,
        deliveryFee: { $sum: { $ifNull: ['$deliveryFee', 0] } },
        deliveryAgentPayout: { $sum: { $ifNull: ['$deliveryAgentPayout', 0] } },
      },
    },
  ]);

  const platformProfit = roundMoney(platformProfitAgg[0]?.amount || 0);
  const deliveryFee = roundMoney(deliveryAgg[0]?.deliveryFee || 0);
  const deliveryAgentPayout = roundMoney(deliveryAgg[0]?.deliveryAgentPayout || 0);
  const deliveryProfit = roundMoney(deliveryFee - deliveryAgentPayout);

  res.json({
    usersCount,
    productsCount,
    ordersCount,
    totalSales: roundMoney(totalSales),
    platformProfit,
    deliveryProfit,
    deliveryFee,
    deliveryAgentPayout,
    recentOrders,
    salesByDate: salesByDate.map((row) => ({
      ...row,
      sales: roundMoney(row.sales),
      platformProfit: roundMoney(row.platformProfit),
    })),
    vendorSales: vendorSales.map((row) => ({
      ...row,
      sales: roundMoney(row.sales),
      platformProfit: roundMoney(row.platformProfit),
      vendorEarnings: roundMoney(row.vendorEarnings),
    })),
  });
});

const getVendorStats = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  const productsCount = await Product.countDocuments({ vendor: vendorId });

  const vendorOrdersCount = await Order.countDocuments({ 'orderItems.vendor': vendorId });

  // Pending orders for this vendor (based on overall order state)
  const pendingOrdersCount = await Order.countDocuments({
    'orderItems.vendor': vendorId,
    isDelivered: false,
  });

  // Total sales for this vendor (paid orders only, sum vendor's line items)
  const totalSalesAgg = await Order.aggregate([
    { $match: { isPaid: true, 'orderItems.vendor': vendorId } },
    { $unwind: '$orderItems' },
    { $match: { 'orderItems.vendor': vendorId } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
        platformProfit: {
          $sum: {
            $multiply: [
              '$orderItems.price',
              '$orderItems.qty',
              { $ifNull: ['$orderItems.commissionRate', 0] },
            ],
          },
        },
      },
    },
  ]);
  const totalSales = totalSalesAgg[0]?.totalSales || 0;
  const platformCommission = totalSalesAgg[0]?.platformProfit || 0;
  const vendorEarnings = totalSales - platformCommission;

  // Sales by date (vendor's items only)
  const salesByDate = await Order.aggregate([
    { $match: { isPaid: true, 'orderItems.vendor': vendorId } },
    { $unwind: '$orderItems' },
    { $match: { 'orderItems.vendor': vendorId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
        platformCommission: {
          $sum: {
            $multiply: [
              '$orderItems.price',
              '$orderItems.qty',
              { $ifNull: ['$orderItems.commissionRate', 0] },
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const recentOrders = await Order.find({ 'orderItems.vendor': vendorId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'name');

  const isApproved = req.user.vendorDetails && req.user.vendorDetails.isApproved;

  res.json({
    productsCount,
    vendorOrdersCount,
    totalSales: roundMoney(totalSales),
    vendorEarnings: roundMoney(vendorEarnings),
    pendingOrdersCount,
    recentOrders,
    isApproved,
    salesByDate: salesByDate.map((row) => ({
      ...row,
      sales: roundMoney(row.sales),
      earnings: roundMoney((row.sales || 0) - (row.platformCommission || 0)),
    })),
  });
});

export { getAdminStats, getVendorStats };
