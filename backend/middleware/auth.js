import jwt from 'jsonwebtoken';

// Authentication middleware - supports both session and JWT
export const requireAuth = (req, res, next) => {
    console.log(`[AUTH] Checking auth for ${req.path}`);
    console.log(`[AUTH] Origin: ${req.get('origin')}`);
    console.log(`[AUTH] Session ID: ${req.sessionID}`);
    console.log(`[AUTH] Session userId: ${req.session?.userId}`);
    console.log(`[AUTH] Cookies received: ${JSON.stringify(req.cookies)}`);
    
    // First, try session-based auth (for desktop/browsers with cookies)
    if (req.session?.userId) {
        console.log(`[AUTH] Authenticated via session from user ${req.session.userId}`);
        req.userId = req.session.userId;
        req.userName = req.session.userName;
        return next();
    }
    
    // If no session, try JWT token (for mobile/browsers blocking cookies)
    const authHeader = req.get('Authorization');
    console.log(`[AUTH] Authorization header: ${authHeader}`);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pookieverse-jwt-secret-change-in-production');
            console.log(`[AUTH] Authenticated via JWT from user ${decoded.userId}`);
            req.userId = decoded.userId;
            req.userName = decoded.userName;
            return next();
        } catch (err) {
            console.error('[AUTH] Invalid JWT token:', err.message);
        }
    }
    
    // Neither session nor valid JWT found
    console.error('[AUTH] Unauthorized request - no session or JWT:', req.path);
    console.error('[AUTH] Full session object:', JSON.stringify(req.session, null, 2));
    console.error('[AUTH] Request headers:', JSON.stringify(req.headers, null, 2));
    return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized. Please sign in.' 
    });
};

