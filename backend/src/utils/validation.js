/**
 * Validation utilities
 */

const ALLOWED_FILE_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateDocxFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    errors.push('File must be a .docx Word document');
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateTemplateData(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
    errors.push('Template name must be at least 3 characters');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Template name must be less than 255 characters');
  }

  if (!data.schemaJson || typeof data.schemaJson !== 'object') {
    errors.push('Invalid schema JSON');
  }

  if (!data.contentJson || typeof data.contentJson !== 'object') {
    errors.push('Invalid content JSON');
  }

  if (!data.structureJson || typeof data.structureJson !== 'object') {
    errors.push('Invalid structure JSON');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateUserData(data, schema) {
  const errors = [];

  if (!schema || !schema.sections) {
    return { valid: true, errors }; // Can't validate without schema
  }

  // Validate required fields
  schema.sections.forEach(section => {
    section.fields?.forEach(field => {
      if (field.required && !data[field.id]) {
        errors.push(`Field "${field.label}" is required`);
      }

      // Type-specific validation
      if (data[field.id] !== undefined) {
        switch (field.type) {
          case 'number':
            if (isNaN(data[field.id])) {
              errors.push(`Field "${field.label}" must be a number`);
            }
            if (field.validation?.min !== undefined && data[field.id] < field.validation.min) {
              errors.push(`Field "${field.label}" must be at least ${field.validation.min}`);
            }
            if (field.validation?.max !== undefined && data[field.id] > field.validation.max) {
              errors.push(`Field "${field.label}" must be at most ${field.validation.max}`);
            }
            break;

          case 'text':
          case 'textarea':
            if (typeof data[field.id] !== 'string') {
              errors.push(`Field "${field.label}" must be text`);
            }
            if (field.validation?.minLength && data[field.id].length < field.validation.minLength) {
              errors.push(`Field "${field.label}" must be at least ${field.validation.minLength} characters`);
            }
            if (field.validation?.maxLength && data[field.id].length > field.validation.maxLength) {
              errors.push(`Field "${field.label}" must be at most ${field.validation.maxLength} characters`);
            }
            break;

          case 'table':
            if (!Array.isArray(data[field.id])) {
              errors.push(`Field "${field.label}" must be a table (array)`);
            }
            break;
        }
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

