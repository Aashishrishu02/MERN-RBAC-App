import { Router } from 'express';
import {
  saveVisit,
  getSelfVisits,
  getAllVisits,
} from '../controllers/visitController';
import { authenticateToken, checkPermission } from '../middleware/auth';
import { Permission } from '../models/Role';

const router = Router();

router.use(authenticateToken);

router.post('/', checkPermission(Permission.SAVE_VISIT), saveVisit);
router.get('/my', checkPermission(Permission.READ_SELF_VISIT), getSelfVisits);
router.get('/all', checkPermission(Permission.READ_ALL_VISIT), getAllVisits);

export default router;
