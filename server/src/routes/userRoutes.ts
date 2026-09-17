import { Router } from 'express';
import {
  getUsers,
  updateUserRole,
  resetUserRole,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
  createOrAssignRoleByEmail,
  getPendingRoleAssignments,
  deletePendingRoleAssignment,
  verifyInvitationToken,
  provisionUser,
  generateCredentials,
} from '../controllers/userController';
import { authenticateToken, checkPermission } from '../middleware/auth';
import { Permission } from '../models/Role';

const router = Router();

router.get('/', authenticateToken, checkPermission(Permission.MANAGE_ROLES), getUsers);
router.post('/generate-credentials', authenticateToken, checkPermission(Permission.MANAGE_USER_ACCOUNTS), generateCredentials);
router.post('/provision', authenticateToken, checkPermission(Permission.MANAGE_ROLES), provisionUser);
router.put('/:id/role', authenticateToken, checkPermission(Permission.MANAGE_ROLES), updateUserRole);
router.post('/:id/reset-role', authenticateToken, checkPermission(Permission.MANAGE_ROLES), resetUserRole);
router.delete('/:id', authenticateToken, checkPermission(Permission.MANAGE_ROLES), deleteUser);
router.get('/:id/permissions', authenticateToken, checkPermission(Permission.MANAGE_ROLES), getUserPermissions);
router.put('/:id/permissions', authenticateToken, checkPermission(Permission.MANAGE_ROLES), updateUserPermissions);

// Pending role assignment & invitation routes
router.post('/role-assignment', authenticateToken, checkPermission(Permission.MANAGE_ROLES), createOrAssignRoleByEmail);
router.get('/role-assignment', authenticateToken, checkPermission(Permission.MANAGE_ROLES), getPendingRoleAssignments);
router.get('/role-assignments', authenticateToken, checkPermission(Permission.MANAGE_ROLES), getPendingRoleAssignments);
router.delete('/role-assignment/:id', authenticateToken, checkPermission(Permission.MANAGE_ROLES), deletePendingRoleAssignment);

// Public invitation verification route
router.get('/invite/verify', verifyInvitationToken);

export default router;
