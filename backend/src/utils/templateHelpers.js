/**
 * Template helper functions
 */

/**
 * Get nested value from object using dot notation path
 * @param {Object} obj - The object to search
 * @param {string} path - Dot notation path (e.g., "user.profile.name")
 * @returns {*} The value at the path, or undefined
 */
export function getNestedValue(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Render template string with data substitution
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object
 * @param {Object} boilerplate - Boilerplate content object
 * @returns {string} Rendered string
 */
export function renderTemplate(template, data, boilerplate = {}) {
  if (!template || typeof template !== 'string') {
    return template;
  }

  return template.replace(/{{([^}]+)}}/g, (match, path) => {
    const trimmedPath = path.trim();

    // Handle boilerplate references
    if (trimmedPath.startsWith('boilerplate.')) {
      const boilerplatePath = trimmedPath.substring(12);
      const value = getNestedValue(boilerplate, boilerplatePath);
      return value !== undefined ? value : match;
    }

    // Handle regular data references
    const value = getNestedValue(data, trimmedPath);
    return value !== undefined ? value : match;
  });
}

/**
 * Evaluate conditional logic
 * @param {Object} condition - Condition object with field, operator, value
 * @param {Object} data - Data to evaluate against
 * @returns {boolean} True if condition is met
 */
export function evaluateCondition(condition, data) {
  if (!condition || !condition.field) return true;

  const { field, operator, value } = condition;
  const fieldValue = getNestedValue(data, field);

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'greater_than':
      return fieldValue > value;
    case 'less_than':
      return fieldValue < value;
    case 'contains':
      return Array.isArray(fieldValue) ? fieldValue.includes(value) : String(fieldValue).includes(value);
    case 'not_contains':
      return Array.isArray(fieldValue) ? !fieldValue.includes(value) : !String(fieldValue).includes(value);
    default:
      return true;
  }
}

/**
 * Check if a field should be visible based on conditional logic
 * @param {Object} field - Field definition with optional conditional property
 * @param {Object} formData - Current form data
 * @returns {boolean} True if field should be visible
 */
export function isFieldVisible(field, formData) {
  if (!field.conditional || !field.conditional.show_when) {
    return true;
  }

  return evaluateCondition(field.conditional.show_when, formData);
}

/**
 * Format date to locale string
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date
 */
export function formatDate(date, locale = 'en-US') {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString(locale);
  } catch (error) {
    return String(date);
  }
}

/**
 * Get today's date as ISO string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getToday() {
  return new Date().toISOString().split('T')[0];
}

