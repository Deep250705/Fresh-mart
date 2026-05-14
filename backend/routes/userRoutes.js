import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  refreshToken,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deactivateUser,
  verifyVendor
} from '../controllers/userController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, admin, getAllUsers);
router.route('/:id/deactivate').put(protect, admin, deactivateUser);
router.route('/:id/verify').put(protect, admin, verifyVendor);

router.post('/', registerUser);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshToken);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
