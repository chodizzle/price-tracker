// src/lib/utils.js
const { clsx } = require("clsx");
const { twMerge } = require("tailwind-merge");

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (dateStr === '2024 Avg') return dateStr;
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Checks if two dates are in the same month and year
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {boolean} True if dates are in the same month and year
 */
function isSameMonth(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

/**
 * Get the month name for a date
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Month name
 */
function getMonthName(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Get the year for a date
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number} Year
 */
function getYear(dateStr) {
  const date = new Date(dateStr);
  return date.getFullYear();
}

module.exports = {
  cn,
  formatDate,
  isSameMonth,
  getMonthName,
  getYear
};