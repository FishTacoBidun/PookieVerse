# PookieVerse Backend

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the `backend` folder with the following variables:

```
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/pookieverse
# For production: MONGODB_URI=https://onrender.com/api

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://127.0.0.1:5500

# Session Secret (change this to a random string in production)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_URL=https://api.cloudinary.com/api
```

### 2. Seed Initial Users

Run the seed script to create two default users in the database:

```bash
node backend/scripts/seedUsers.js
```

This will create:
- User1 with birthday: 2000-01-15
- User2 with birthday: 1995-06-20

You can modify these in `backend/scripts/seedUsers.js` before running.

### 3. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/signin` - Sign in with name and birthday
- `POST /api/auth/signout` - Sign out and destroy session
- `GET /api/auth/status` - Check authentication status

### Scrapbook Entries (Protected - require authentication)

- `GET /api/scrapbook/entries` - Get all scrapbook entries
- `GET /api/scrapbook/entries/:id` - Get single entry by ID
- `POST /api/scrapbook/entries` - Create new entry
- `PUT /api/scrapbook/entries/:id` - Update entry
- `DELETE /api/scrapbook/entries/:id` - Delete entry

## Session Configuration

- Sessions are stored in MongoDB using `connect-mongo`
- Sessions expire after 7 days
- Cookies are httpOnly and secure (in production)

python -m http.server 5500
