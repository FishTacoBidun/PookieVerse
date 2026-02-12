// Authentication middleware to check if user is logged in
export const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.status(401).json({ 
            success: false, 
            message: 'Unauthorized. Please sign in.' 
        });
    }
};

