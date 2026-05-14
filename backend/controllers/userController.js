import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/userModel.js';
import generateTokens from '../utils/generateTokens.js';
import jwt from 'jsonwebtoken';

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && !user.isActive) {
    res.status(401);
    throw new Error('Account is inactive');
  }

  if (user && (await user.matchPassword(password))) {
    const { accessToken } = generateTokens(res, user._id);
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: accessToken
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, username, phone, gender, dob, email, password, role, vendorDetails } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    res.status(400);
    throw new Error('User with this email or username already exists');
  }

  const user = await User.create({
    name,
    username,
    phone,
    gender,
    dob,
    email,
    password,
    role: role || 'user',
    vendorDetails: role === 'vendor' ? vendorDetails : undefined,
  });

  if (user) {
    const { accessToken } = generateTokens(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      token: accessToken
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('jwt_access', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.cookie('jwt_refresh', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

const refreshToken = asyncHandler(async (req, res) => {
  const rfToken = req.cookies.jwt_refresh;
  if (rfToken) {
    try {
      const decoded = jwt.verify(rfToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401);
        throw new Error('User not found');
      }
      const { accessToken } = generateTokens(res, user._id);
      res.status(200).json({ accessToken });
    } catch (error) {
      res.status(401);
      throw new Error('Invalid refresh token');
    }
  } else {
    res.status(401);
    throw new Error('No refresh token');
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.status(200).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      phone: user.phone,
      gender: user.gender,
      dob: user.dob,
      email: user.email,
      role: user.role,
      addresses: user.addresses,
      vendorDetails: user.vendorDetails
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await User.updateOne(
      { _id: user._id },
      { $set: { isActive: !user.isActive } }
    );
    res.json({ message: 'User status updated successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

const verifyVendor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user && user.role === 'vendor') {
    const currentStatus = user.vendorDetails && user.vendorDetails.isApproved;
    
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          'vendorDetails.isApproved': !currentStatus,
          'vendorDetails.storeName': user.vendorDetails?.storeName || 'My Store',
          'vendorDetails.description': user.vendorDetails?.description || 'Vendor Store'
        } 
      }
    );
    res.json({ message: 'Vendor status updated successfully' });
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.username = req.body.username || user.username;
    user.phone = req.body.phone || user.phone;
    if (req.body.gender !== undefined) user.gender = req.body.gender;
    if (req.body.dob) user.dob = req.body.dob;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }
    
    if (req.body.addresses) {
      user.addresses = req.body.addresses;
    }

    if (user.role === 'vendor' && req.body.vendorDetails) {
      user.vendorDetails = req.body.vendorDetails;
    }

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      addresses: updatedUser.addresses,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export {
  authUser,
  registerUser,
  logoutUser,
  refreshToken,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deactivateUser,
  verifyVendor
};
