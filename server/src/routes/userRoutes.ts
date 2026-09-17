import { Router } from 'express';
import {
  getUsers,
  updateUserRole,
  resetUserRole,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
  provisionUser,
  generateCredentials,
} from '../controllers/userController';
import { authenticateToken, checkPermission } from '../middleware/auth';
import { Permission } from '../models/Role';

const router = Router();

router.get('/', authenticateToken, checkPermission(Permission.MANAGE_ROLES), getUsers);
router.post('/generate-credentials', authenticateToken, checkPermission(Permission.MANAGE_USER_ACCOUNTS), generateCredentials);
router.post('/provision', authenticateToken, checkPermission(Permission.MANAGE_USER_ACCOUNTS), provisionUser);
router.put('/:id/role', authenticateToken, checkPermission(Permission.MANAGE_ROLES), updateUserRole);
router.post('/:id/reset-role', authenticateToken, checkPermission(Permission.MANAGE_ROLES), resetUserRole);
router.delete('/:id', authenticateToken, checkPermission(Permission.MANAGE_ROLES), deleteUser);
router.get('/:id/permissions', authenticateToken, checkPermission(Permission.MANAGE_ROLES), getUserPermissions);
router.put('/:id/permissions', authenticateToken, checkPermission(Permission.MANAGE_ROLES), updateUserPermissions);

export default router;
