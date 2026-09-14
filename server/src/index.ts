import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import { seedDatabase } from './seed';
import authRoutes from './routes/authRoutes';
import roleRoutes from './routes/roleRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import visitRoutes from './routes/visitRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/visits', visitRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    service: 'FieldOps Access Test API',
  });
});

// Serve frontend static files in production
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ message: 'Resource not found' });
    }
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 FieldOps Server listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
