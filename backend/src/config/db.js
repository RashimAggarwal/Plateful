import mongoose from 'mongoose';

export async function connectDatabase(){
  if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required. Set it in backend/.env.');
  mongoose.set('strictQuery',true);
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:Number(process.env.DB_CONNECT_TIMEOUT_MS||10000),maxPoolSize:Number(process.env.DB_POOL_SIZE||10)});
  console.log('Connected to MongoDB');
}
