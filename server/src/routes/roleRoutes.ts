import { Router } from 'express';
import {
  getRoles,
  updateRolePermissions,
  createRole,
} from '../controllers/roleController';
import { authenticateToken, checkPermission } from '../middleware/auth';
import { Permission } from '../models/Role';

const router = Router();

router.use(authenticateToken);
router.use(checkPermission(Permission.MANAGE_ROLES));

router.get('/', getRoles);
router.put('/:id/permissions', updateRolePermissions);
router.post('/', createRole);

export default router;
