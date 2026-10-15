import 'dotenv/config';
import app from './app.js';
import mongoose from 'mongoose';
import { connectDatabase } from './config/db.js';

await connectDatabase();
const server=app.listen(process.env.PORT||4000,()=>console.log(`API listening on ${process.env.PORT||4000}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await mongoose.disconnect();process.exit(0)}));
