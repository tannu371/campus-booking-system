/**
 * Query Parameter Sanitization Utility
 * 
 * Prevents NoSQL injection attacks by sanitizing query parameters.
 * Express parses bracket notation (e.g., ?status[$ne]=value) into objects,
 * which can be exploited for NoSQL operator injection.
 * 
 * This utility ensures all query parameters are primitive values (strings/numbers).
 */

/**
 * Sanitize a single query parameter value
 * Converts objects to strings to prevent NoSQL operator injection
 * 
 * @param {*} value - The value to sanitize
 * @returns {string|number|null} - Sanitized primitive value
 */
const sanitizeValue = (value) => {
  // Null/undefined pass through
  if (value === null || value === undefined) {
    return null;
  }

  // If it's an object (including arrays), reject it
  if (typeof value === 'object') {
    // This prevents { $ne: 'value' }, { $gt: 5 }, etc.
    return null;
  }

  // Primitive values (string, number, boolean) are safe
  return value;
};

/**
 * Sanitize all query parameters in an object
 * 
 * @param {Object} query - The query object (typically req.query)
 * @param {Array<string>} allowedFields - Whitelist of allowed field names
 * @returns {Object} - Sanitized query object with only allowed fields
 */
const sanitizeQuery = (query, allowedFields = []) => {
  const sanitized = {};

  // If no whitelist provided, sanitize all fields
  const fieldsToProcess = allowedFields.length > 0 
    ? allowedFields 
    : Object.keys(query);

  for (const field of fieldsToProcess) {
    if (query[field] !== undefined) {
      const sanitizedValue = sanitizeValue(query[field]);
      
      // Only include non-null values
      if (sanitizedValue !== null) {
        sanitized[field] = sanitizedValue;
      }
    }
  }

  return sanitized;
};

/**
 * Sanitize and validate a string parameter
 * 
 * @param {*} value - The value to sanitize
 * @param {Array<string>} allowedValues - Optional whitelist of allowed values
 * @returns {string|null} - Sanitized string or null if invalid
 */
const sanitizeString = (value, allowedValues = []) => {
  const sanitized = sanitizeValue(value);
  
  if (sanitized === null) {
    return null;
  }

  const stringValue = String(sanitized);

  // If whitelist provided, validate against it
  if (allowedValues.length > 0 && !allowedValues.includes(stringValue)) {
    return null;
  }

  return stringValue;
};

/**
 * Sanitize and validate a MongoDB ObjectId parameter
 * 
 * @param {*} value - The value to sanitize
 * @returns {string|null} - Sanitized ObjectId string or null if invalid
 */
const sanitizeObjectId = (value) => {
  const sanitized = sanitizeValue(value);
  
  if (sanitized === null) {
    return null;
  }

  const stringValue = String(sanitized);

  // Basic ObjectId format validation (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(stringValue)) {
    return null;
  }

  return stringValue;
};

/**
 * Sanitize and validate a number parameter
 * 
 * @param {*} value - The value to sanitize
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {number} options.default - Default value if invalid
 * @returns {number|null} - Sanitized number or null/default if invalid
 */
const sanitizeNumber = (value, options = {}) => {
  const { min, max, default: defaultValue = null } = options;
  
  const sanitized = sanitizeValue(value);
  
  if (sanitized === null) {
    return defaultValue;
  }

  const numValue = Number(sanitized);

  // Check if valid number
  if (isNaN(numValue)) {
    return defaultValue;
  }

  // Validate range
  if (min !== undefined && numValue < min) {
    return defaultValue;
  }
  if (max !== undefined && numValue > max) {
    return defaultValue;
  }

  return numValue;
};

/**
 * Sanitize a date parameter
 * 
 * @param {*} value - The value to sanitize
 * @returns {Date|null} - Sanitized Date object or null if invalid
 */
const sanitizeDate = (value) => {
  const sanitized = sanitizeValue(value);
  
  if (sanitized === null) {
    return null;
  }

  const date = new Date(sanitized);

  // Check if valid date
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Express middleware to sanitize all query parameters
 * Prevents NoSQL injection by rejecting object-type query params
 */
const sanitizeQueryMiddleware = (req, res, next) => {
  if (req.query) {
    for (const key in req.query) {
      const value = req.query[key];
      
      // If value is an object (NoSQL operator injection attempt), reject it
      if (typeof value === 'object' && value !== null) {
        return res.status(400).json({
          message: 'Invalid query parameter format',
          error: 'INVALID_QUERY_PARAM',
          parameter: key,
          hint: 'Query parameters must be primitive values (strings or numbers)'
        });
      }
    }
  }
  next();
};

module.exports = {
  sanitizeValue,
  sanitizeQuery,
  sanitizeString,
  sanitizeObjectId,
  sanitizeNumber,
  sanitizeDate,
  sanitizeQueryMiddleware
};
