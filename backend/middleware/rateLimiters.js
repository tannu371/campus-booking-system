const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts. Please try again later.',
    error: 'RATE_LIMITED_AUTH'
  }
});

const adminMutationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many admin mutation requests. Please try again later.',
    error: 'RATE_LIMITED_ADMIN_MUTATION'
  }
});

module.exports = {
  authLimiter,
  adminMutationLimiter
};
