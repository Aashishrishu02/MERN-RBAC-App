import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/fieldops_access_test';

  try {
    // Attempt connecting to specified MONGODB_URI with 3s timeout
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`⚠️  Could not connect to MongoDB at ${connStr}.`);
    console.log(`🔄 Starting fallback In-Memory MongoDB Server for local execution...`);
    
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
