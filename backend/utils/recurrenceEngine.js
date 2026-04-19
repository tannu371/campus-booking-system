/**
 * Recurrence Engine
 * Expands recurrence rules into individual booking occurrences
 * Supports FREQ=DAILY|WEEKLY|MONTHLY with BYDAY, UNTIL, COUNT
 */

const MAX_OCCURRENCES = 500; // Safety limit

/**
 * Parse recurrence rule string
 * @param {string} rule - e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20241215"
 * @returns {Object} Parsed rule object
 */
const parseRecurrenceRule = (rule) => {
  const parts = rule.split(';');
  const parsed = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) {
      parsed[key.trim()] = value.trim();
    }
  }

  return parsed;
};

/**
 * Get day of week number (0=Sunday, 1=Monday, ...)
 */
const DAY_MAP = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
};

/**
 * Expand recurrence rule into array of {start, end} timestamps
 * @param {string} rule - Recurrence rule string
 * @param {Date} firstStart - Start time of first occurrence
 * @param {Date} firstEnd - End time of first occurrence
 * @param {number} maxCount - Maximum occurrences to generate
 * @returns {Array<{start: Date, end: Date}>}
 */
const expandRecurrenceRule = (rule, firstStart, firstEnd, maxCount = MAX_OCCURRENCES) => {
  const parsed = parseRecurrenceRule(rule);
  const freq = parsed.FREQ;
  
  if (!freq) {
    throw new Error('FREQ is required in recurrence rule');
  }

  const occurrences = [];
  const duration = firstEnd.getTime() - firstStart.getTime();
  
  // Parse UNTIL date if present
  let untilDate = null;
  if (parsed.UNTIL) {
    const year = parseInt(parsed.UNTIL.substring(0, 4));
    const month = parseInt(parsed.UNTIL.substring(4, 6)) - 1;
    const day = parseInt(parsed.UNTIL.substring(6, 8));
    untilDate = new Date(year, month, day, 23, 59, 59);
  }

  // Parse COUNT if present
  const count = parsed.COUNT ? parseInt(parsed.COUNT) : maxCount;
  const limit = Math.min(count, maxCount);

  // Parse BYDAY for weekly recurrence
  const byDay = parsed.BYDAY ? parsed.BYDAY.split(',').map(d => DAY_MAP[d.trim()]) : null;

  let currentDate = new Date(firstStart);
  let occurrenceCount = 0;

  while (occurrenceCount < limit) {
    // Check if we've exceeded UNTIL date
    if (untilDate && currentDate > untilDate) {
      break;
    }

    // Check if this occurrence matches the rule
    let shouldInclude = true;

    if (freq === 'WEEKLY' && byDay) {
      const dayOfWeek = currentDate.getDay();
      shouldInclude = byDay.includes(dayOfWeek);
    }

    if (shouldInclude) {
      const start = new Date(currentDate);
      const end = new Date(currentDate.getTime() + duration);
      occurrences.push({ start, end });
      occurrenceCount++;
    }

    // Advance to next occurrence
    switch (freq) {
      case 'DAILY':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      
      case 'WEEKLY':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      
      case 'MONTHLY':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      
      default:
        throw new Error(`Unsupported frequency: ${freq}`);
    }

    // Safety check to prevent infinite loops
    if (currentDate.getFullYear() > 2100) {
      break;
    }
  }

  return occurrences;
};

/**
 * Validate recurrence rule
 * @param {string} rule - Recurrence rule string
 * @returns {{valid: boolean, error?: string}}
 */
const validateRecurrenceRule = (rule) => {
  try {
    const parsed = parseRecurrenceRule(rule);
    
    if (!parsed.FREQ) {
      return { valid: false, error: 'FREQ is required' };
    }

    const validFreqs = ['DAILY', 'WEEKLY', 'MONTHLY'];
    if (!validFreqs.includes(parsed.FREQ)) {
      return { valid: false, error: `Invalid FREQ. Must be one of: ${validFreqs.join(', ')}` };
    }

    if (parsed.BYDAY) {
      const days = parsed.BYDAY.split(',');
      const validDays = Object.keys(DAY_MAP);
      for (const day of days) {
        if (!validDays.includes(day.trim())) {
          return { valid: false, error: `Invalid BYDAY value: ${day}` };
        }
      }
    }

    if (parsed.UNTIL) {
      if (!/^\d{8}$/.test(parsed.UNTIL)) {
        return { valid: false, error: 'UNTIL must be in YYYYMMDD format' };
      }
    }

    if (parsed.COUNT) {
      const count = parseInt(parsed.COUNT);
      if (isNaN(count) || count < 1 || count > MAX_OCCURRENCES) {
        return { valid: false, error: `COUNT must be between 1 and ${MAX_OCCURRENCES}` };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Generate a recurrence group ID
 * @returns {string}
 */
const generateRecurrenceGroupId = () => {
  return `REC-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
};

/**
 * Format date to YYYYMMDD
 * @param {Date} date
 * @returns {string}
 */
const formatDateYYYYMMDD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

module.exports = {
  expandRecurrenceRule,
  validateRecurrenceRule,
  generateRecurrenceGroupId,
  parseRecurrenceRule,
  formatDateYYYYMMDD,
  MAX_OCCURRENCES
};
