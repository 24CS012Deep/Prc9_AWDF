/**
 * Centralized Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error] ${err.name}: ${err.message}`);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      messages
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: `Invalid identifier format: ${err.value}`
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong on the server.'
  });
}

module.exports = errorHandler;
