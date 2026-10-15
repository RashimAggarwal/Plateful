import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { User, Restaurant, MenuItem, Order, Delivery, Review, AuditLog } from '../src/models.js';

try {
  await connectDatabase();
  for (const collection of [User,Restaurant,MenuItem,Order,Delivery,Review,AuditLog]) await collection.init();
  console.log('MongoDB collections and indexes are ready. No existing data was dropped.');
} finally {
  await mongoose.disconnect();
}
