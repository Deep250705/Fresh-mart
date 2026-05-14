import asyncHandler from '../utils/asyncHandler.js';
import DeliveryAgent from '../models/deliveryAgentModel.js';
import Order from '../models/orderModel.js';
import jwt from 'jsonwebtoken';

const generateToken = (res, agentId) => {
  const token = jwt.sign({ agentId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.cookie('jwt_delivery', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// @desc    Auth agent & get token
// @route   POST /api/delivery/login
// @access  Public
const authAgent = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const agent = await DeliveryAgent.findOne({ email });

  if (agent && (await agent.matchPassword(password))) {
    generateToken(res, agent._id);
    res.status(200).json({
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      isAvailable: agent.isAvailable,
      role: 'delivery'
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Logout agent / clear cookie
// @route   POST /api/delivery/logout
// @access  Private (Agent)
const logoutAgent = asyncHandler(async (req, res) => {
  res.cookie('jwt_delivery', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc    Create a new delivery agent
// @route   POST /api/delivery
// @access  Private/Admin
const createAgent = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const agentExists = await DeliveryAgent.findOne({ email });
  if (agentExists) {
    res.status(400);
    throw new Error('Agent already exists');
  }

  const agent = await DeliveryAgent.create({
    name,
    email,
    password,
    phone
  });

  if (agent) {
    res.status(201).json({
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      isAvailable: agent.isAvailable,
    });
  } else {
    res.status(400);
    throw new Error('Invalid agent data');
  }
});

// @desc    Get all active agents
// @route   GET /api/delivery
// @access  Private/Admin/Vendor
const getAgents = asyncHandler(async (req, res) => {
  const agents = await DeliveryAgent.find({ isAvailable: true }).select('-password');
  res.status(200).json(agents);
});

// @desc    Get orders assigned to logged in agent
// @route   GET /api/delivery/orders
// @access  Private (Agent)
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ deliveryAgent: req.agent._id }).populate('user', 'name email').sort({ createdAt: -1 });
  res.status(200).json(orders);
});

// @desc    Update order delivery status
// @route   PUT /api/delivery/orders/:id/status
// @access  Private (Agent)
const updateAgentOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Ensure this order belongs to the agent
  if (order.deliveryAgent.toString() !== req.agent._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  const { status } = req.body;

  if (status === 'Picked') {
    order.isPicked = true;
    order.pickedAt = Date.now();
    order.status = 'Picked';
  } else if (status === 'In Transit') {
    order.isInTransit = true;
    order.inTransitAt = Date.now();
    order.status = 'In Transit';
  } else if (status === 'Delivered') {
    order.orderItems.forEach((item) => {
      item.isDelivered = true;
    });
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'Delivered';
    if (order.paymentMethod === 'COD' && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
    }
  } else {
    res.status(400);
    throw new Error('Invalid status update request');
  }

  const updatedOrder = await order.save();
  req.io.to(`order_${order._id}`).emit('orderStatusUpdated', updatedOrder);
  res.status(200).json(updatedOrder);
});

// @desc    Get delivery earnings stats
// @route   GET /api/delivery/stats
// @access  Private (Agent)
const getAgentStats = asyncHandler(async (req, res) => {
  const earningsAgg = await Order.aggregate([
    { $match: { deliveryAgent: req.agent._id, isDelivered: true } },
    {
      $group: {
        _id: null,
        ordersDelivered: { $sum: 1 },
        deliveryEarnings: { $sum: { $ifNull: ['$deliveryAgentPayout', 0] } },
      },
    },
  ]);

  const monthlyAgg = await Order.aggregate([
    { $match: { deliveryAgent: req.agent._id, isDelivered: true } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$deliveredAt' } },
        deliveryEarnings: { $sum: { $ifNull: ['$deliveryAgentPayout', 0] } },
        ordersDelivered: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    ordersDelivered: earningsAgg[0]?.ordersDelivered || 0,
    deliveryEarnings: Number((earningsAgg[0]?.deliveryEarnings || 0).toFixed(2)),
    earningsByMonth: monthlyAgg.map((row) => ({
      month: row._id,
      ordersDelivered: row.ordersDelivered,
      deliveryEarnings: Number((row.deliveryEarnings || 0).toFixed(2)),
    })),
  });
});

export {
  authAgent,
  logoutAgent,
  createAgent,
  getAgents,
  getMyOrders,
  updateAgentOrderStatus,
  getAgentStats
};
