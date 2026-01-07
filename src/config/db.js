import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed', error.message);
    console.log('⚠️  Server will continue without database connection');
    // Don't exit the process, just log the error
  }
};