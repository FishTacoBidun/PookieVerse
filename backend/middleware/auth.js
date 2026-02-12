// Authentication middleware to check if user is logged in
export const requireAuth = (req, res, next) => {
    console.log(`[AUTH] Checking auth for ${req.path}`);
    console.log(`[AUTH] Origin: ${req.get('origin')}`);
    console.log(`[AUTH] Session ID: ${req.sessionID}`);
    console.log(`[AUTH] Session userId: ${req.session?.userId}`);
    console.log(`[AUTH] Cookies received: ${JSON.stringify(req.cookies)}`);
    
    if (!req.session?.userId) {
        console.error('[AUTH] Unauthorized request - no session userId:', req.path);
        console.error('[AUTH] Full session object:', JSON.stringify(req.session, null, 2));
        console.error('[AUTH] Request headers:', JSON.stringify(req.headers, null, 2));
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized. Please sign in.' 
        });
    }
    
    console.log(`[AUTH] Authenticated request from user ${req.session.userId} to ${req.path}`);
    next();
};

