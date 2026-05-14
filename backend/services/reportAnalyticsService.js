import mongoose from 'mongoose';
import Order from '../models/orderModel.js';

const RANGE_IN_DAYS = {
  '7days': 7,
  '30days': 30,
};

const formatDecimal = (value) => Number((value || 0).toFixed(2));

const formatDateKey = (value) => {
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
};

const buildDateFilter = ({ range = '30days', startDate, endDate }) => {
  if (range === 'custom') {
    const from = startDate ? new Date(startDate) : null;
    const to = endDate ? new Date(endDate) : null;

    if (!from || Number.isNaN(from.getTime()) || !to || Number.isNaN(to.getTime())) {
      const error = new Error('Custom range requires valid startDate and endDate values.');
      error.statusCode = 400;
      throw error;
    }

    if (from > to) {
      const error = new Error('startDate cannot be after endDate.');
      error.statusCode = 400;
      throw error;
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    return { $gte: from, $lte: to };
  }

  const days = RANGE_IN_DAYS[range] || RANGE_IN_DAYS['30days'];
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  return { $gte: from, $lte: new Date() };
};

const normalizeFilters = ({ user, query }) => {
  const isAdmin = user?.role === 'admin';
  const isVendor = user?.role === 'vendor';

  if (!isAdmin && !isVendor) {
    const error = new Error('Not authorized to access analytics reports.');
    error.statusCode = 403;
    throw error;
  }

  const requestedVendorId = isAdmin ? query.vendorId : user._id.toString();
  const requestedCategoryId = query.categoryId;

  if (requestedVendorId && !mongoose.Types.ObjectId.isValid(requestedVendorId)) {
    const error = new Error('Invalid vendorId.');
    error.statusCode = 400;
    throw error;
  }

  if (requestedCategoryId && !mongoose.Types.ObjectId.isValid(requestedCategoryId)) {
    const error = new Error('Invalid categoryId.');
    error.statusCode = 400;
    throw error;
  }

  return {
    role: isAdmin ? 'admin' : 'vendor',
    vendorId: requestedVendorId || null,
    categoryId: requestedCategoryId || null,
    range: query.range || '30days',
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    dateFilter: buildDateFilter({
      range: query.range || '30days',
      startDate: query.startDate,
      endDate: query.endDate,
    }),
  };
};

const buildRawDataPipeline = (filters) => {
  const baseMatch = {
    isDelivered: true,
    createdAt: filters.dateFilter,
  };

  if (filters.vendorId) {
    baseMatch['orderItems.vendor'] = new mongoose.Types.ObjectId(filters.vendorId);
  }

  const pipeline = [{ $match: baseMatch }];

  if (filters.vendorId) {
    pipeline.push({ $match: { 'orderItems.vendor': new mongoose.Types.ObjectId(filters.vendorId) } });
  }

  pipeline.push(
    {
      $addFields: {
        orderRevenue: {
          $sum: {
            $map: {
              input: '$orderItems',
              as: 'item',
              in: { $multiply: ['$$item.price', '$$item.qty'] },
            },
          },
        },
      },
    }
  );

  const stages = [
    { $unwind: '$orderItems' },
    filters.vendorId
      ? {
          $match: { 'orderItems.vendor': new mongoose.Types.ObjectId(filters.vendorId) },
        }
      : null,
    {
      $lookup: {
        from: 'users',
        localField: 'orderItems.vendor',
        foreignField: '_id',
        as: 'vendorDoc',
      },
    },
    {
      $unwind: {
        path: '$vendorDoc',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        lineRevenue: { $multiply: ['$orderItems.price', '$orderItems.qty'] },
      },
    },
    {
      $project: {
        _id: 0,
        orderId: '$_id',
        createdAt: '$createdAt',
        date: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        vendorId: '$orderItems.vendor',
        vendor: {
          $ifNull: ['$vendorDoc.vendorDetails.storeName', '$vendorDoc.name'],
        },
        productId: '$orderItems.product',
        product: '$orderItems.name',
        categoryId: null,
        category: 'N/A',
        quantity: '$orderItems.qty',
        sellingPrice: '$orderItems.price',
        commissionRate: { $ifNull: ['$orderItems.commissionRate', 0] },
        revenue: '$lineRevenue',
        platformProfit: {
          $multiply: [
            '$lineRevenue',
            { $ifNull: ['$orderItems.commissionRate', 0] },
          ],
        },
        vendorEarnings: {
          $subtract: [
            '$lineRevenue',
            {
              $multiply: [
                '$lineRevenue',
                { $ifNull: ['$orderItems.commissionRate', 0] },
              ],
            },
          ],
        },
        deliveryFeeShare: {
          $cond: [
            { $gt: ['$orderRevenue', 0] },
            {
              $multiply: [
                { $ifNull: ['$deliveryFee', 0] },
                { $divide: ['$lineRevenue', '$orderRevenue'] },
              ],
            },
            0,
          ],
        },
        deliveryAgentPayoutShare: {
          $cond: [
            { $gt: ['$orderRevenue', 0] },
            {
              $multiply: [
                { $ifNull: ['$deliveryAgentPayout', 0] },
                { $divide: ['$lineRevenue', '$orderRevenue'] },
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $sort: {
        createdAt: 1,
        vendor: 1,
        product: 1,
      },
    }
  ].filter(Boolean);
  pipeline.push(...stages);

  return pipeline;
};

const incrementBucket = (map, key, seed, reducer) => {
  const current = map.get(key) || { ...seed };
  reducer(current);
  map.set(key, current);
};

const buildAnalyticsSummary = (rows) => {
  const totals = {
    revenue: 0,
    platformProfit: 0,
    vendorEarnings: 0,
    deliveryProfit: 0,
    deliveryEarnings: 0,
    items: 0,
    orders: 0,
  };

  const orderIds = new Set();
  const byDate = new Map();
  const byCategory = new Map();
  const byVendor = new Map();
  const byProduct = new Map();

  for (const row of rows) {
    const revenue = Number(row.revenue || 0);
    const platformProfit = Number(row.platformProfit || 0);
    const vendorEarnings = Number(row.vendorEarnings || 0);
    const deliveryProfit = Number(row.deliveryProfit || 0);
    const deliveryEarnings = Number(row.deliveryEarnings || 0);
    const quantity = Number(row.quantity || 0);
    const dateKey = row.date || formatDateKey(row.createdAt);
    const categoryKey = row.category || 'Uncategorized';
    const vendorKey = String(row.vendorId);
    const productKey = String(row.productId);

    totals.revenue += revenue;
    totals.platformProfit += platformProfit;
    totals.vendorEarnings += vendorEarnings;
    totals.deliveryProfit += deliveryProfit;
    totals.deliveryEarnings += deliveryEarnings;
    totals.items += quantity;
    orderIds.add(String(row.orderId));

    incrementBucket(
      byDate,
      dateKey,
      { date: dateKey, revenue: 0, platformProfit: 0, vendorEarnings: 0, deliveryProfit: 0, deliveryEarnings: 0, quantity: 0 },
      (bucket) => {
        bucket.revenue += revenue;
        bucket.platformProfit += platformProfit;
        bucket.vendorEarnings += vendorEarnings;
        bucket.deliveryProfit += deliveryProfit;
        bucket.deliveryEarnings += deliveryEarnings;
        bucket.quantity += quantity;
      }
    );

    incrementBucket(
      byCategory,
      categoryKey,
      { category: categoryKey, revenue: 0, platformProfit: 0, vendorEarnings: 0, deliveryProfit: 0, deliveryEarnings: 0, quantity: 0 },
      (bucket) => {
        bucket.revenue += revenue;
        bucket.platformProfit += platformProfit;
        bucket.vendorEarnings += vendorEarnings;
        bucket.deliveryProfit += deliveryProfit;
        bucket.deliveryEarnings += deliveryEarnings;
        bucket.quantity += quantity;
      }
    );

    incrementBucket(
      byVendor,
      vendorKey,
      { vendorId: vendorKey, vendor: row.vendor, revenue: 0, platformProfit: 0, vendorEarnings: 0, quantity: 0 },
      (bucket) => {
        bucket.revenue += revenue;
        bucket.platformProfit += platformProfit;
        bucket.vendorEarnings += vendorEarnings;
        bucket.quantity += quantity;
      }
    );

    incrementBucket(
      byProduct,
      productKey,
      {
        productId: productKey,
        product: row.product,
        category: row.category || 'Uncategorized',
        revenue: 0,
        platformProfit: 0,
        vendorEarnings: 0,
        quantity: 0,
      },
      (bucket) => {
        bucket.revenue += revenue;
        bucket.platformProfit += platformProfit;
        bucket.vendorEarnings += vendorEarnings;
        bucket.quantity += quantity;
      }
    );
  }

  totals.orders = orderIds.size;
  totals.revenue = formatDecimal(totals.revenue);
  totals.platformProfit = formatDecimal(totals.platformProfit);
  totals.vendorEarnings = formatDecimal(totals.vendorEarnings);
  totals.deliveryProfit = formatDecimal(totals.deliveryProfit);
  totals.deliveryEarnings = formatDecimal(totals.deliveryEarnings);

  const finalizeEntry = (entry) => ({
    ...entry,
    revenue: formatDecimal(entry.revenue),
    platformProfit: formatDecimal(entry.platformProfit || 0),
    vendorEarnings: formatDecimal(entry.vendorEarnings || 0),
    deliveryProfit: formatDecimal(entry.deliveryProfit || 0),
    deliveryEarnings: formatDecimal(entry.deliveryEarnings || 0),
    quantity: Number(entry.quantity || 0),
  });

  return {
    totals,
    salesByDate: [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(finalizeEntry),
    salesByCategory: [...byCategory.values()]
      .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category))
      .map(finalizeEntry),
    salesByVendor: [...byVendor.values()]
      .sort(
        (a, b) =>
          b.revenue - a.revenue
          || String(a.vendor || '').localeCompare(String(b.vendor || ''))
      )
      .map(finalizeEntry),
    salesByProduct: [...byProduct.values()]
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
      .map(finalizeEntry),
  };
};

export const getReportAnalyticsDataset = async ({ user, query = {} }) => {
  const filters = normalizeFilters({ user, query });
  const rawData = await Order.aggregate(buildRawDataPipeline(filters));
  const analytics = buildAnalyticsSummary(rawData);

  return {
    filters,
    rawData: rawData.map((rawRow) => {
      const row = {
        ...rawRow,
        deliveryProfit: Number(rawRow.deliveryFeeShare || 0) - Number(rawRow.deliveryAgentPayoutShare || 0),
        deliveryEarnings: Number(rawRow.deliveryAgentPayoutShare || 0),
      };
      return ({
      ...row,
      orderId: String(row.orderId),
      vendorId: String(row.vendorId),
      productId: String(row.productId),
      categoryId: row.categoryId ? String(row.categoryId) : null,
      createdAt: new Date(row.createdAt),
      revenue: formatDecimal(row.revenue),
      platformProfit: formatDecimal(row.platformProfit),
      vendorEarnings: formatDecimal(row.vendorEarnings),
      deliveryProfit: formatDecimal(row.deliveryProfit),
      deliveryEarnings: formatDecimal(row.deliveryEarnings),
      commissionRate: formatDecimal(row.commissionRate),
      sellingPrice: formatDecimal(row.sellingPrice),
      quantity: Number(row.quantity || 0),
    });
    }),
    analytics,
  };
};
