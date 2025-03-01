// src/lib/utils.js
const { clsx } = require("clsx");
const { twMerge } = require("tailwind-merge");

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Friday Friday:
/**
 * Gets the nearest Friday for a date, preferring the current Friday if it is one,
 * otherwise using the previous Friday. Never crosses year boundaries.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Nearest Friday in YYYY-MM-DD format
 */
function getNearestFriday(dateStr) {
  // Special case for 2024 Avg
  if (dateStr === '2024 Avg') return dateStr;
  
  // Parse the date, using noon UTC to avoid timezone issues
  const date = new Date(dateStr + 'T12:00:00Z');
  const originalYear = date.getUTCFullYear();
  
  // If already a Friday, return as is
  if (date.getUTCDay() === 5) {
    return dateStr;
  }
  
  // Calculate days to go back to previous Friday
  let daysToSubtract = date.getUTCDay();
  if (daysToSubtract < 5) {
    // For days 0-4 (Sun-Thu), go back by day + 2 (except Sunday)
    daysToSubtract = daysToSubtract === 0 ? 2 : daysToSubtract + 2;
  } else {
    // For day 6 (Saturday), go back 1 day
    daysToSubtract = 1;
  }
  
  // Create a new date by subtracting days
  const adjustedDate = new Date(date);
  adjustedDate.setUTCDate(date.getUTCDate() - daysToSubtract);
  
  // Check if we've crossed a year boundary
  if (adjustedDate.getUTCFullYear() !== originalYear) {
    // If crossing year boundary, use the original date
    return dateStr;
  }
  
  // Format as YYYY-MM-DD
  return adjustedDate.toISOString().split('T')[0];
}

/**
 * Determines if a date string is a Friday
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {boolean} True if the date is a Friday
 */
function isFriday(dateStr) {
  const date = new Date(dateStr + 'T12:00:00Z'); // Use noon UTC to avoid timezone issues
  return date.getUTCDay() === 5; // 5 = Friday in UTC
}

module.exports = {
  cn, // existing function
  getNearestFriday,
  isFriday
};