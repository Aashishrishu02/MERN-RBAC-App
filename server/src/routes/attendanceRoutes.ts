import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getSelfAttendance,
  getAllAttendance,
} from '../controllers/attendanceController';
import { authenticateToken, checkPermission } from '../middleware/auth';
import { Permission } from '../models/Role';

const router = Router();

router.use(authenticateToken);

router.post('/clock-in', checkPermission(Permission.CLOCK_IN_OUT), clockIn);
router.post('/clock-out', checkPermission(Permission.CLOCK_IN_OUT), clockOut);
router.get('/my', checkPermission(Permission.READ_SELF_ATTENDANCE), getSelfAttendance);
router.get('/all', checkPermission(Permission.READ_ALL_ATTENDANCE), getAllAttendance);

export default router;
