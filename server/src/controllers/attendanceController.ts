import { Response } from 'express';
import { Attendance } from '../models/Attendance';
import { AuthRequest } from '../middleware/auth';

export const clockIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { note } = req.body;

    const activeAttendance = await Attendance.findOne({
      userId,
      status: 'CLOCKED_IN',
    });

    if (activeAttendance) {
      res.status(400).json({
        message: 'Already clocked in',
        attendance: activeAttendance,
      });
      return;
    }

    const attendance = await Attendance.create({
      userId,
      clockIn: new Date(),
      status: 'CLOCKED_IN',
      note: note || '',
    });

    res.status(201).json({
      message: 'Clocked in successfully',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const clockOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { note } = req.body;

    const activeAttendance = await Attendance.findOne({
      userId,
      status: 'CLOCKED_IN',
    });

    if (!activeAttendance) {
      res.status(400).json({ message: 'No active clock-in session found' });
      return;
    }

    activeAttendance.clockOut = new Date();
    activeAttendance.status = 'CLOCKED_OUT';
    if (note) {
      activeAttendance.note = activeAttendance.note ? `${activeAttendance.note} | ${note}` : note;
    }

    await activeAttendance.save();

    res.json({
      message: 'Clocked out successfully',
      attendance: activeAttendance,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getSelfAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const attendanceRecords = await Attendance.find({ userId }).sort({ clockIn: -1 });

    res.json({
      attendance: attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getAllAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const attendanceRecords = await Attendance.find()
      .populate('userId', 'name email')
      .sort({ clockIn: -1 });

    res.json({
      attendance: attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
