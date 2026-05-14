import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/userModel.js';
import DeliveryAgent from '../models/deliveryAgentModel.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 🔍 Step 2: Get token from header OR cookie
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt_access) {
    token = req.cookies.jwt_access;
  }

  // ❌ No token
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  // ❌ Missing secret
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    // 🔍 Step 3: Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔍 Step 4: Find user
    const user = await User.findById(decoded.userId).select("-password");

    // ❌ User not found
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is inactive" });
    }

    // ✅ Attach user to request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Not authorized, token failed" });
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
};

const vendor = (req, res, next) => {
  if (req.user && (req.user.role === 'vendor' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as a vendor');
  }
};

const approvedVendor = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }

  if (req.user?.role === 'vendor' && req.user?.vendorDetails?.isApproved) {
    return next();
  }

  res.status(403);
  throw new Error('Vendor account is not approved');
};

const protectAgent = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt_delivery) {
    token = req.cookies.jwt_delivery;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized as Delivery Agent" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const agent = await DeliveryAgent.findById(decoded.agentId).select("-password");

    if (!agent) {
      return res.status(401).json({ message: "Agent not found" });
    }

    req.agent = agent;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
});

export { protect, admin, vendor, approvedVendor, protectAgent };
