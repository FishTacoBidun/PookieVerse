import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        // Get MongoDB URI and ensure it has a database name
        let mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            mongoUri = 'mongodb://localhost:27017/pookieverse';
        } else {
            // If URI doesn't end with a database name, add it
            if (!mongoUri.endsWith('/pookieverse') && !mongoUri.match(/\/[^\/]+$/)) {
                mongoUri = mongoUri.endsWith('/') ? mongoUri + 'pookieverse' : mongoUri + '/pookieverse';
            }
        }
        
        const conn = await mongoose.connect(mongoUri, {
        // MongoDB connection options
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;

