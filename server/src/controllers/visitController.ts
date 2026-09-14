import { Response } from 'express';
import { Visit } from '../models/Visit';
import { AuthRequest } from '../middleware/auth';

export const saveVisit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { customerName, purpose, outcome, locationAddress, visitDate } = req.body;

    if (!customerName || !purpose || !outcome || !locationAddress) {
      res.status(400).json({
        message: 'Customer name, purpose, outcome, and location/address are required',
      });
      return;
    }

    const visit = await Visit.create({
      userId,
      customerName,
      purpose,
      outcome,
      locationAddress,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
    });

    res.status(201).json({
      message: 'Visit record saved successfully',
      visit,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getSelfVisits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const visits = await Visit.find({ userId }).sort({ visitDate: -1 });

    res.json({
      visits,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getAllVisits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const visits = await Visit.find()
      .populate('userId', 'name email')
      .sort({ visitDate: -1 });

    res.json({
      visits,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
