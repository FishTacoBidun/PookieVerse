import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import connectDB from './config/db.js';
import User from './models/User.js';
import ScrapbookEntry from './models/ScrapbookEntry.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Trust proxy - IMPORTANT for Render/production HTTPS
app.set('trust proxy', 1);

// Middleware - order matters!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Add middleware to log response headers for debugging
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.path.includes('/api/auth/signin') || req.path.includes('/api/auth/signout')) {
      console.log(`[RESPONSE] ${req.method} ${req.path} - Headers:`, {
        'Set-Cookie': res.get('Set-Cookie'),
        'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials')
      });
    }
    return originalSend.call(this, data);
  };
  next();
});

// CORS configuration - must be AFTER cookie parser
app.use(cors({
    origin: 'https://fishtacobidun.github.io',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer with Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'pookieverse',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({ storage: storage });

// Session configuration - Helper function to ensure MongoDB URI has database name
const getMongoUri = () => {
    let mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        return 'mongodb://localhost:27017/pookieverse';
    }
    // If URI doesn't end with a database name, add it
    if (!mongoUri.endsWith('/pookieverse') && !mongoUri.match(/\/[^\/]+$/)) {
        mongoUri = mongoUri.endsWith('/') ? mongoUri + 'pookieverse' : mongoUri + '/pookieverse';
    }
    return mongoUri;
};

app.use(session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'pookieverse-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: getMongoUri(),
        dbName: 'pookieverse_sessions',
        ttl: 7 * 24 * 60 * 60 // 7 days in seconds
    }),
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site in production
        path: '/'
    }
}));

// Sign in route
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { name, birthday } = req.body;

        console.log(`[SIGNIN] Attempt from origin: ${req.get('origin')}`);
        console.log(`[SIGNIN] Cookies received: ${JSON.stringify(req.cookies)}`);

        if (!name || !birthday) {
            return res.status(400).json({
                success: false,
                message: 'Name and birthday are required'
            });
        }

        // Parse the birthday date
        const birthdayDate = new Date(birthday);
        
        // Find user by name
        const user = await User.findOne({ name: name.trim() });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Compare birthdays (compare only date, not time)
        const userBirthday = new Date(user.birthday);
        const isBirthdayMatch = 
            userBirthday.getFullYear() === birthdayDate.getFullYear() &&
            userBirthday.getMonth() === birthdayDate.getMonth() &&
            userBirthday.getDate() === birthdayDate.getDate();

        if (!isBirthdayMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create session
        req.session.userId = user._id.toString();
        req.session.userName = user.name;
        
        console.log(`[SIGNIN] Session created - ID: ${req.sessionID}, userId: ${req.session.userId}`);
        console.log(`[SIGNIN] Cookie will be set with:`, {
            secure: req.session.cookie.secure,
            sameSite: req.session.cookie.sameSite,
            httpOnly: req.session.cookie.httpOnly
        });
        
        res.json({
            success: true,
            message: 'Sign in successful',
            user: {
                id: user._id,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Sign in error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during sign in'
        });
    }
});

// Sign out route
app.post('/api/auth/signout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error signing out'
            });
        }
        res.clearCookie('connect.sid');
        res.json({
            success: true,
            message: 'Signed out successfully'
        });
    });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            success: true,
            authenticated: true,
            user: {
                id: req.session.userId,
                name: req.session.userName
            }
        });
    } else {
        res.json({
            success: true,
            authenticated: false
        });
    }
});


// Get all scrapbook entries (protected route)
app.get('/api/scrapbook/entries', requireAuth, async (req, res) => {
    try {
        const entries = await ScrapbookEntry.find({})
            .sort({ date: -1 }); // Sort by date, newest first
        
        res.json({
            success: true,
            entries: entries
        });
    } catch (error) {
        console.error('Get entries error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching scrapbook entries'
        });
    }
});

// Get single scrapbook entry by ID (protected route)
app.get('/api/scrapbook/entries/:id', requireAuth, async (req, res) => {
    try {
        const entry = await ScrapbookEntry.findById(req.params.id);
        
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Scrapbook entry not found'
            });
        }
        
        res.json({
            success: true,
            entry: entry
        });
    } catch (error) {
        console.error('Get entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching scrapbook entry'
        });
    }
});

// Create new scrapbook entry (protected route)
app.post('/api/scrapbook/entries', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, date, description } = req.body;

        if (!title || !date || !description) {
            return res.status(400).json({
                success: false,
                message: 'All fields (title, date, description) are required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Image file is required'
            });
        }

        // Get Cloudinary URL from uploaded file
        const imageUrl = req.file.path;

        const entry = new ScrapbookEntry({
            title: title.trim(),
            date: new Date(date),
            imageUrl: imageUrl,
            description: description.trim()
        });

        const savedEntry = await entry.save();
        
        res.status(201).json({
            success: true,
            message: 'Scrapbook entry created successfully',
            entry: savedEntry
        });
    } catch (error) {
        console.error('Create entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating scrapbook entry'
        });
    }
});

// Delete scrapbook entry (protected route)
app.delete('/api/scrapbook/entries/:id', requireAuth, async (req, res) => {
    try {
        const entry = await ScrapbookEntry.findByIdAndDelete(req.params.id);
        
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Scrapbook entry not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Scrapbook entry deleted successfully'
        });
    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting scrapbook entry'
        });
    }
});

// Update scrapbook entry (protected route)
app.put('/api/scrapbook/entries/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, date, description } = req.body;

        const updateData = {};
        if (title) updateData.title = title.trim();
        if (date) updateData.date = new Date(date);
        if (description) updateData.description = description.trim();
        
        // If a new image was uploaded, update the imageUrl
        if (req.file) {
            updateData.imageUrl = req.file.path;
        }

        const entry = await ScrapbookEntry.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Scrapbook entry not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Scrapbook entry updated successfully',
            entry: entry
        });
    } catch (error) {
        console.error('Update entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating scrapbook entry'
        });
    }
});


// Root Route (for testing)
app.get('/', (req, res) => {
    res.json({
        message: 'PookieVerse API Server',
        status: 'running',
        endpoints: {
            auth: {
                signin: 'POST /api/auth/signin',
                signout: 'POST /api/auth/signout',
                status: 'GET /api/auth/status'
            },
            scrapbook: {
                getAll: 'GET /api/scrapbook/entries',
                getOne: 'GET /api/scrapbook/entries/:id',
                create: 'POST /api/scrapbook/entries',
                update: 'PUT /api/scrapbook/entries/:id',
                delete: 'DELETE /api/scrapbook/entries/:id'
            }
        }
    });
});


// Server Start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
    console.log(`Frontend should be served from: ${process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}`);
});

export default app;

