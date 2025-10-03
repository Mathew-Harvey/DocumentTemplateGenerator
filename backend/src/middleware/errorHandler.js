/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error response
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  };

  // Set appropriate status code
  const statusCode = err.statusCode || 500;

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error.message = 'Internal server error';
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
}

