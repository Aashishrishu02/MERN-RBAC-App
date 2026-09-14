import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateToken, getMe);

export default router;
