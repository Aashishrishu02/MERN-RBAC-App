import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/fieldops_access_test';
  const isProd = process.env.NODE_ENV === 'production';

  try {
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: isProd ? 10000 : 3000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (isProd) {
      console.error(`❌ FATAL: Failed to connect to MongoDB Atlas in production: ${(error as Error).message}`);
      process.exit(1);
    }

    console.log(`⚠️  Could not connect to local MongoDB at ${connStr}.`);
    console.log(`🔄 Starting fallback In-Memory MongoDB Server for local development...`);
    
    try {
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`🚀 MongoDB Connected (In-Memory Fallback): ${conn.connection.host}`);
    } catch (memError) {
      console.error(`❌ Error initializing In-Memory MongoDB: ${(memError as Error).message}`);
      process.exit(1);
    }
  }
};
