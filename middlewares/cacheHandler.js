const customCache = require('../services/cache');


exports.clearCache = async (req,res,next) => {
    // the trick is to call next first
    // next should be the route handler
    await next();
    customCache.clearCache(req.user.id);
}
