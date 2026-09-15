import { Router } from 'express';
import { getUsers, updateUserRole } from '../controllers/userController';
import { authenticateToken, checkPermission } from '../middleware/auth';
import { Permission } from '../models/Role';

const router = Router();

router.get('/', authenticateToken, checkPermission(Permission.MANAGE_ROLES), getUsers);
router.put('/:id/role', authenticateToken, checkPermission(Permission.MANAGE_ROLES), updateUserRole);

export default router;
