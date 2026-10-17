/**
 * HTTP Request Logger Middleware
 */
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const cacheStatus = res.getHeader('X-Cache') || 'NONE';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) [Cache: ${cacheStatus}]`);
  });
  next();
}

module.exports = logger;
