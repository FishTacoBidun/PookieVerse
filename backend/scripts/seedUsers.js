// Script to seed initial users into the database
// Run with: node backend/scripts/seedUsers.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/User.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file - check project root first, then backend folder
const rootEnvPath = join(__dirname, '../../.env');
const backendEnvPath = join(__dirname, '../.env');
dotenv.config({ path: rootEnvPath });
// If root .env doesn't exist, try backend folder
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: backendEnvPath });
}

const seedUsers = async () => {
    try {
        // Get MongoDB URI and ensure it has a database name
        let mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('MONGODB_URI not found in .env file');
            process.exit(1);
        }
        
        // If URI doesn't end with a database name, add it
        if (!mongoUri.endsWith('/pookieverse') && !mongoUri.match(/\/[^\/]+$/)) {
            mongoUri = mongoUri.endsWith('/') ? mongoUri + 'pookieverse' : mongoUri + '/pookieverse';
        }
        
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing users (optional - remove if you want to keep existing users)
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create two default users
        const users = [
            {
                name: 'Wolfie',
                birthday: new Date('2004-06-30') // July 3rd, 2004
            },
            {
                name: 'Audrey',
                birthday: new Date('2004-07-03') // June 30th, 2004
            }
        ];

        const createdUsers = await User.insertMany(users);
        console.log('Created users:');
        createdUsers.forEach(user => {
            console.log(`- ${user.name} (Birthday: ${user.birthday.toISOString().split('T')[0]})`);
        });

        console.log('\nSeed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();

