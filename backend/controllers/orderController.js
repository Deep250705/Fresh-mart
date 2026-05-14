import asyncHandler from '../utils/asyncHandler.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { calculateFinalPrice, resolveItemDiscount } from '../utils/discounts.js';
import { generateOrderInvoicePdf } from '../services/invoice/invoicePdfService.js';

const vendorOwnsAnyItemInOrder = (order, vendorId) => {
  if (!order?.orderItems?.length) return false;
  return order.orderItems.some((it) => {
    const itemVendorId = it.vendor?._id || it.vendor;
    return String(itemVendorId) === String(vendorId);
  });
};

const ensureOrderAccess = (req, order) => {
  // Admin can access everything
  if (req.user?.role === 'admin') return;

  // Vendors can only access orders that contain their items
  if (req.user?.role === 'vendor') {
    if (!vendorOwnsAnyItemInOrder(order, req.user._id)) {
      const err = new Error('Not authorized to access this order');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  // Regular users can only access their own orders
  const ownerId = order.user?._id || order.user;
  if (String(ownerId) !== String(req.user?._id)) {
    const err = new Error('Not authorized to access this order');
    err.statusCode = 403;
    throw err;
  }
};

const validateAndBuildOrder = async (
  rawOrderItems,
  {
    deliveryMethod = 'Self',
    deliveryFee: requestedDeliveryFee = 0,
    deliveryAgentPayout: requestedDeliveryAgentPayout = 0,
  } = {}
) => {
  if (!Array.isArray(rawOrderItems) || rawOrderItems.length === 0) {
    const error = new Error('No order items');
    error.statusCode = 400;
    throw error;
  }

  const productIds = rawOrderItems.map((item) => item?._id).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })
    .populate('category', 'categoryDiscount');

  const productById = new Map(products.map((product) => [String(product._id), product]));
  const vendorIds = [...new Set(products.map((product) => String(product.vendor)).filter(Boolean))];
  const vendors = await User.find({ _id: { $in: vendorIds } }).select('_id vendorDetails.commissionRate');
  const vendorCommissionById = new Map(
    vendors.map((vendor) => [String(vendor._id), Number(vendor.vendorDetails?.commissionRate ?? 0.1)])
  );
  const inventoryUpdates = [];
  let itemsPrice = 0;

  const orderItems = rawOrderItems.map((item) => {
    const product = productById.get(String(item?._id));
    if (!product) {
      const error = new Error(`Product not found: ${item?.name || item?._id || 'unknown'}`);
      error.statusCode = 400;
      throw error;
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      const error = new Error(`Invalid quantity for ${product.name}`);
      error.statusCode = 400;
      throw error;
    }

    const requestedWeight = item.weight || item.unit || product.pricingOptions?.[0]?.weight;
    const variantIndex = product.pricingOptions.findIndex((option) => option.weight === requestedWeight);
    if (variantIndex === -1) {
      const error = new Error(`Invalid product variant for ${product.name}`);
      error.statusCode = 400;
      throw error;
    }

    const variant = product.pricingOptions[variantIndex];
    if (variant.countInStock < qty) {
      const error = new Error(`Insufficient stock for ${product.name} (${variant.weight})`);
      error.statusCode = 400;
      throw error;
    }

    const resolved = resolveItemDiscount({
      price: variant.price,
      productDiscount: product.discount,
      categoryDiscount: product.category?.categoryDiscount ?? 0,
    });
    const pricing = calculateFinalPrice(variant.price, resolved.percent);
    const lineTotal = +(pricing.finalPrice * qty).toFixed(2);
    itemsPrice = +(itemsPrice + lineTotal).toFixed(2);

    inventoryUpdates.push({ product, variantIndex, qty });
    const vendorId = String(product.vendor);
    const itemCommissionRate = Number.isFinite(Number(product.commissionRate))
      ? Number(product.commissionRate)
      : Number(vendorCommissionById.get(vendorId) ?? 0.1);

    return {
      name: product.name,
      qty,
      image: product.image,
      price: pricing.finalPrice,
      costPrice: Number(variant.costPrice || 0),
      weight: variant.weight,
      unit: variant.weight,
      vendor: product.vendor,
      product: product._id,
      commissionRate: Math.min(Math.max(itemCommissionRate, 0), 1),
    };
  });

  const shippingPrice = itemsPrice > 1000 ? 0 : 50;
  const taxPrice = +(itemsPrice * 0.18).toFixed(2);
  const parsedDeliveryFee = Number(requestedDeliveryFee || 0);
  const parsedAgentPayout = Number(requestedDeliveryAgentPayout || 0);
  const isThirdParty = deliveryMethod === 'Third-Party';
  const deliveryFee = isThirdParty ? +Math.max(parsedDeliveryFee, 0).toFixed(2) : 0;
  const deliveryAgentPayout = isThirdParty ? +Math.max(parsedAgentPayout, 0).toFixed(2) : 0;
  const totalPrice = +(itemsPrice + shippingPrice + taxPrice + deliveryFee).toFixed(2);

  return {
    orderItems,
    pricing: {
      itemsPrice,
      shippingPrice,
      taxPrice,
      deliveryFee,
      deliveryAgentPayout,
      totalPrice,
    },
    inventoryUpdates,
  };
};

const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems: rawOrderItems,
    shippingAddress,
    paymentMethod,
    deliveryMethod = 'Self',
    deliveryFee = 0,
    deliveryAgentPayout = 0,
  } = req.body;

  const { orderItems, pricing, inventoryUpdates } = await validateAndBuildOrder(rawOrderItems, {
    deliveryMethod,
    deliveryFee,
    deliveryAgentPayout,
  });

  const order = new Order({
    orderItems,
    user: req.user._id,
    shippingAddress,
    paymentMethod,
    deliveryMethod,
    ...pricing,
  });

  for (const { product, variantIndex, qty } of inventoryUpdates) {
    product.pricingOptions[variantIndex].countInStock -= qty;
    product.sold = (product.sold || 0) + qty;
    await product.save();
  }

  const createdOrder = await order.save();

  req.io.emit('newOrder', createdOrder);
  res.status(201).json(createdOrder);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('orderItems.vendor', 'name email vendorDetails.storeName');

  if (order) {
    ensureOrderAccess(req, order);
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

const createRazorpayOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  
  if (order) {
    // Only admin or the order owner can initiate payment
    const ownerId = order.user?._id || order.user;
    if (req.user?.role !== 'admin' && String(ownerId) !== String(req.user?._id)) {
      res.status(403);
      throw new Error('Not authorized to pay for this order');
    }
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'test',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'test',
    });

    const options = {
      amount: Math.round(order.totalPrice * 100),
      currency: "INR",
      receipt: `receipt_order_${order._id}`,
    };

    try {
      const razorpayOrder = await instance.orders.create(options);
      res.json(razorpayOrder);
    } catch (error) {
      console.error("Razorpay Order Creation Error:", error);
      res.status(500);
      throw new Error(
        error?.error?.description || 
        error?.description || 
        error?.message || 
        'Razorpay order creation failed. Please check your API keys inside .env'
      );
    }
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    // Only admin or the order owner can mark paid
    const ownerId = order.user?._id || order.user;
    if (req.user?.role !== 'admin' && String(ownerId) !== String(req.user?._id)) {
      res.status(403);
      throw new Error('Not authorized to update payment for this order');
    }
    if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature !== expectedSign) {
        res.status(400);
        throw new Error("Invalid signature");
      }
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = 'Processing';
    order.paymentResult = {
      id: razorpay_payment_id || `mock_pay_${Date.now()}`,
      status: 'success',
      update_time: Date.now().toString(),
      email_address: req.user.email,
    };

    const updatedOrder = await order.save();

    req.io.to(`order_${order._id}`).emit('orderStatusUpdated', updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  const { status } = req.body;

  if (order) {
    // vendor access must be scoped to their own order items
    ensureOrderAccess(req, order);

    if (status === 'Delivered') {
      // 1. Mark vendor-specific items as delivered
      order.orderItems.forEach(item => {
        if (req.user?.role === 'vendor') {
          const itemVendorId = item.vendor?._id || item.vendor;
          if (String(itemVendorId) === String(req.user._id)) {
            item.isDelivered = true;
          }
        } else {
          // Admins or other roles confirming delivery will confirm all implicitly
          item.isDelivered = true;
        }
      });

      // 2. Check if all items in the order are confirmed delivered
      const allConfirmed = order.orderItems.every(item => item.isDelivered);

      if (allConfirmed) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.status = 'Delivered';
        
        if (order.paymentMethod === 'COD' && !order.isPaid) {
          order.isPaid = true;
          order.paidAt = Date.now();
        }
      }
    } else {
      order.status = status || order.status;
    }

    const updatedOrder = await order.save();
    
    req.io.to(`order_${order._id}`).emit('orderStatusUpdated', updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

const packOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  const { deliveryMethod } = req.body;

  if (order) {
    ensureOrderAccess(req, order);

    // 1. Mark vendor-specific items as packed
    order.orderItems.forEach(item => {
      if (req.user?.role === 'vendor') {
        const itemVendorId = item.vendor?._id || item.vendor;
        if (String(itemVendorId) === String(req.user._id)) {
          item.isPacked = true;
        }
      } else {
        // Admins or other roles will confirm all implicitly
        item.isPacked = true;
      }
    });

    // 2. Check if all items in the order are confirmed packed
    const allPacked = order.orderItems.every(item => item.isPacked);

    if (allPacked) {
      order.isPacked = true;
      order.packedAt = Date.now();
      order.deliveryMethod = deliveryMethod || 'Self';
      order.status = 'Packed';
    }

    const updatedOrder = await order.save();
    req.io.to(`order_${order._id}`).emit('orderStatusUpdated', updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

const assignDeliveryAgent = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  const { deliveryAgentId } = req.body;

  if (order) {
    ensureOrderAccess(req, order);
    if (order.deliveryMethod !== 'Third-Party') {
      res.status(400);
      throw new Error('Order must be Third-Party delivery to assign an agent');
    }

    order.deliveryAgent = deliveryAgentId;
    order.status = 'Assigned';

    const updatedOrder = await order.save();
    req.io.to(`order_${order._id}`).emit('orderStatusUpdated', updatedOrder);
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('orderItems.vendor', 'name vendorDetails.storeName');
  res.json(orders);
});

const getOrders = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'vendor') {
     query = { 'orderItems.vendor': req.user._id };
  }
  const pageSize = Number(req.query.pageSize) || 25;
  const page = Number(req.query.pageNumber) || 1;
  const count = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('user', 'id name')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
  res.json({ orders, page, pages: Math.ceil(count / pageSize), count });
});

const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('orderItems.product', 'name');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // allow vendor to view invoice only if the order contains vendor's items
  ensureOrderAccess(req, order);

  const invoiceName = 'invoice-' + order._id + '.pdf';
  const pdfBuffer = await generateOrderInvoicePdf(order);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="' + invoiceName + '"');
  res.send(pdfBuffer);
});

export {
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
};
